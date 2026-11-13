import Button from '@/components/ui/Button';
import { CampaignDetailsSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateMessage';
import { calculateBarPercentage, daysLeft, formatEth } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { parseEther, zeroAddress } from 'viem';
import {
  useConnection,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { crowdFundingAbi } from '../generated';

const contractAddress = import.meta.env.VITE_REACT_CONTRACT_ADDRESS;

export default function CampiagnDetails() {
  const { id } = useParams();
  const campaignId = /^\d+$/.test(id ?? '') ? BigInt(id!) : null;
  const [donationAmount, setDonationAmount] = useState('');
  const [donationValidationError, setDonationValidationError] = useState<string>();
  const { address } = useConnection();
  const {
    data: campaign,
    isLoading: campaignLoading,
    error: campaignError,
    refetch: refetchCampaign,
  } = useReadContract({
    abi: crowdFundingAbi,
    address: contractAddress,
    args: [campaignId ?? 0n],
    functionName: 'campaigns',
    query: { enabled: campaignId !== null },
  });
  const {
    data: donationData,
    isLoading: donationsLoading,
    error: donationsError,
    refetch: refetchDonations,
  } = useReadContract({
    abi: crowdFundingAbi,
    address: contractAddress,
    args: [campaignId ?? 0n],
    functionName: 'getDonators',
    query: { enabled: campaignId !== null },
  });

  const {
    data: transactionHash,
    error: donationError,
    isPending: donationPending,
    mutate: donate,
  } = useWriteContract();
  const {
    data: receipt,
    error: receiptError,
    isLoading: receiptPending,
    isSuccess: receiptSuccess,
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
    query: { enabled: Boolean(transactionHash) },
  });

  const donators = donationData?.[0] ?? [];
  const donations = donationData?.[1] ?? [];
  const campaignDetails = campaign
    ? {
        owner: campaign[0],
        title: campaign[1],
        description: campaign[2],
        target: campaign[3],
        deadline: campaign[4],
        amountCollected: campaign[5],
        image: campaign[6],
      }
    : null;
  const remainingDays = campaignDetails ? daysLeft(campaignDetails.deadline) : null;
  const uniqueBackers = new Set(donators.map((donator) => donator.toLowerCase())).size;
  const progress = campaignDetails
    ? calculateBarPercentage(campaignDetails.target, campaignDetails.amountCollected)
    : 0;

  useEffect(() => {
    if (receiptSuccess && receipt?.status === 'success') {
      void refetchCampaign();
      void refetchDonations();
    }
  }, [receipt?.status, receiptSuccess, refetchCampaign, refetchDonations]);

  const handleDonation = () => {
    setDonationValidationError(undefined);

    if (!campaignId || !address) {
      setDonationValidationError('Connect your wallet before donating.');
      return;
    }

    let value: bigint;

    try {
      value = parseEther(donationAmount);
    } catch {
      setDonationValidationError('Enter a valid ETH amount.');
      return;
    }

    if (value <= 0n) {
      setDonationValidationError('Donation must be greater than zero.');
      return;
    }

    donate({
      address: contractAddress,
      abi: crowdFundingAbi,
      functionName: 'donateToCampaign',
      args: [campaignId],
      value,
    });
  };

  if (campaignId === null) {
    return (
      <EmptyState
        title="Invalid campaign link"
        description="The campaign ID in this link isn't valid."
      >
        <Link
          to="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Browse campaigns
        </Link>
      </EmptyState>
    );
  }

  if (campaignError) {
    return (
      <ErrorState
        title="Campaign couldn't be loaded"
        description={campaignError.message}
        onRetry={() => void refetchCampaign()}
      >
        <Link
          to="/"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Back to campaigns
        </Link>
      </ErrorState>
    );
  }

  if (campaignLoading || campaign === undefined) {
    return <CampaignDetailsSkeleton />;
  }

  if (!campaignDetails || campaignDetails.owner.toLowerCase() === zeroAddress) {
    return (
      <EmptyState
        title="Campaign not found"
        description="This campaign may have been removed or the link may be incorrect."
      >
        <Link
          to="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Browse campaigns
        </Link>
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="col mt-10 w-full gap-7.5 md:flex-row!">
        <div className="col flex-1">
          <img
            src={campaignDetails.image}
            alt={campaignDetails.title}
            className="h-102.5 w-full rounded-xl object-cover"
          />
          <div
            className="relative mt-2 h-1.25 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Campaign funding progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="absolute h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="just-between w-full flex-wrap gap-7.5 md:w-37.5">
          <CountBox
            title={remainingDays === null ? 'Campaign status' : 'Days Left'}
            value={remainingDays === null ? 'Ended' : String(remainingDays)}
          />
          <CountBox
            title={`Raised of ${formatEth(campaignDetails.target)} ETH`}
            value={`${formatEth(campaignDetails.amountCollected)} ETH`}
          />
          <CountBox title="Total Backers" value={String(uniqueBackers)} />
        </div>
      </div>

      <div className="mt-3 text-sm text-muted-foreground" aria-live="polite">
        {progress}% of goal reached
        {campaignDetails.amountCollected >= campaignDetails.target && ' · Goal reached'}
      </div>

      <div className="col flex-2 gap-10 text-foreground">
        <div>
          <h4 className="font-epilogue text-xl font-semibold text-foreground uppercase">Creator</h4>
          <div className="align-center mt-5 flex-wrap gap-3.5">
            <div className="flex-center cursor size-13 rounded-full bg-secondary">
              <img
                src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${campaignDetails.owner}`}
                alt=""
                aria-hidden="true"
                className="size-3/5 object-contain"
              />
            </div>
            <div>
              <h4 className="font-epilogue text-sm font-semibold break-all text-foreground">
                {campaignDetails.owner}
              </h4>
              <p className="font-epilogue mt-1 text-xs font-normal text-muted-foreground">
                Campaigns
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-epilogue text-xl font-semibold text-foreground uppercase">Story</h4>
          <div className="mt-2">
            <p className="font-epilogue leading-6.5 text-justify text-lg font-normal text-soft-foreground">
              {campaignDetails.description}
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-epilogue text-xl font-semibold text-foreground uppercase">
            Donators
          </h4>
          <div className="col mt-2 mb-5 gap-4">
            {donationsError ? (
              <ErrorState
                title="Supporters couldn't be loaded"
                description={donationsError.message}
                onRetry={() => void refetchDonations()}
                className="p-4"
              />
            ) : donationsLoading || donationData === undefined ? (
              <div className="col gap-3" role="status" aria-label="Loading donations">
                <span className="sr-only">Loading donations...</span>
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-3/5" />
              </div>
            ) : donators.length > 0 ? (
              donators.map((donator, index) => (
                <div key={`${donator}-${index}`} className="flex items-center justify-between gap-4">
                  <span className="truncate text-soft-foreground">
                    {donator.slice(0, 6)}...{donator.slice(-4)}
                  </span>
                  <span>{formatEth(donations[index])} ETH</span>
                </div>
              ))
            ) : (
              <EmptyState
                title="No supporters yet"
                description="Be the first to support this campaign."
                className="p-4"
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h4 className="font-epilogue text-xl font-semibold text-foreground uppercase">Funding</h4>
        <div className="col mt-5 rounded-lg bg-card p-4">
          <p className="font-epilogue text-center text-xl leading-7.5 font-medium text-muted-foreground">
            Fund the campaign
          </p>
          <div className="mt-4">
            <label htmlFor="eth">
              <span className="font-epilogue mb-2.5 text-sm leading-5.5 font-medium text-muted-foreground">
                ETH
              </span>
              <input
                type="number"
                id="eth"
                aria-invalid={Boolean(donationValidationError)}
                className="font-epilogue w-full rounded-lg border border-input bg-transparent px-3.75 py-2.5 text-xl leading-7.5 text-foreground outline-none placeholder:text-placeholder focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 sm:px-5"
                placeholder="ETH 0.1"
                min="0"
                step="any"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
              />
            </label>
            {donationValidationError && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {donationValidationError}
              </p>
            )}
            {donationError && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                Donation failed: {donationError.message}
              </p>
            )}
            {receiptError && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                Unable to confirm the donation: {receiptError.message}
              </p>
            )}
            {receiptSuccess && receipt?.status === 'success' && (
              <p role="status" className="mt-2 text-sm text-success">
                Donation confirmed.
              </p>
            )}
            {receiptSuccess && receipt?.status === 'reverted' && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                The donation transaction reverted.
              </p>
            )}
            <div className="my-5 rounded-xl bg-background p-4">
              <h4 className="font-epilogue text-base leading-5.5 font-semibold text-foreground">
                Back it because you believe in it.
              </h4>
              <p className="font-epilogue leading 5.5 mt-5 font-normal text-muted-foreground">
                Support the project for no reward, just because it speaks to you.
              </p>
            </div>

            <Button
              className="w-full bg-accent text-accent-foreground"
              disabled={donationPending || receiptPending}
              aria-busy={donationPending || receiptPending}
              onClick={handleDonation}
            >
              {donationPending || receiptPending ? 'Processing donation...' : 'Fund Campaign'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CountBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="col-center w-37.5">
      <h4 className="font-epilogue text-7.5 w-full truncate rounded-t-lg bg-card p-3 text-center font-bold text-card-foreground">
        {value}
      </h4>
      <p className="font-epilogue w-full rounded-b-lg bg-muted px-3 py-2 text-center text-lg font-normal text-muted-foreground">
        {title}
      </p>
    </div>
  );
}
