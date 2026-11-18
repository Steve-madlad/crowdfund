import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CampaignDetailsSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateMessage';
import { calculateBarPercentage, daysLeft, formatEth } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { ArrowLeft, Check, Copy, ExternalLink, ImageOff, Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { parseEther, zeroAddress } from 'viem';
import {
  useChainId,
  useConfig,
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
  const [activeImage, setActiveImage] = useState<{ campaignId: string; index: number }>({
    campaignId: '',
    index: 0,
  });
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [shareStatus, setShareStatus] = useState<string>();
  const previousGoalState = useRef<{ campaignId: string; reached: boolean } | null>(null);
  const completedDonationToastHash = useRef<string | undefined>(undefined);
  const { address } = useConnection();
  const chainId = useChainId();
  const config = useConfig();
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
  const { data: campaignImages, error: campaignImagesError } = useReadContract({
    abi: crowdFundingAbi,
    address: contractAddress,
    args: [campaignId ?? 0n],
    functionName: 'getCampaignImages',
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
  const goalReached = Boolean(
    campaignDetails &&
    campaignDetails.target > 0n &&
    campaignDetails.amountCollected >= campaignDetails.target,
  );
  const amountCollected = campaignDetails?.amountCollected;
  const target = campaignDetails?.target;
  const campaignEnded = remainingDays === null;
  const imageUrls =
    campaignImages && campaignImages.length > 0
      ? campaignImages
      : campaignDetails?.image
        ? [campaignDetails.image]
        : [];
  const selectedImageIndex = Math.min(
    activeImage.campaignId === id ? activeImage.index : 0,
    Math.max(imageUrls.length - 1, 0),
  );
  const activeImageUrl = imageUrls[selectedImageIndex];
  const explorerBase = config.chains.find((chain) => chain.id === chainId)?.blockExplorers?.default
    .url;

  useEffect(() => {
    if (!transactionHash || !receipt || completedDonationToastHash.current === transactionHash) {
      return;
    }

    completedDonationToastHash.current = transactionHash;
    if (receipt.status === 'success') {
      toast.success('Contribution confirmed. Thank you for supporting this cause.');
      void refetchCampaign();
      void refetchDonations();
    } else {
      toast.error('The contribution transaction reverted.');
    }
  }, [receipt, refetchCampaign, refetchDonations, transactionHash]);

  useEffect(() => {
    if (amountCollected === undefined || target === undefined) return;

    const reached = target > 0n && amountCollected >= target;
    const campaignKey = id ?? '';
    const previous = previousGoalState.current;

    if (
      previous?.campaignId === campaignKey &&
      !previous.reached &&
      reached &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      void confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.65 },
        disableForReducedMotion: true,
      });
    }

    previousGoalState.current = { campaignId: campaignKey, reached };
  }, [amountCollected, target, id]);

  const handleDonation = () => {
    setDonationValidationError(undefined);

    console.log({ campaignId, address });

    if (!campaignId || !address) {
      setDonationValidationError('Connect your wallet before donating.');
      return;
    }

    if (goalReached) {
      setDonationValidationError('This campaign has already reached its goal.');
      return;
    }

    if (campaignEnded) {
      setDonationValidationError('This campaign has ended and can no longer receive donations.');
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

    donate(
      {
        address: contractAddress,
        abi: crowdFundingAbi,
        functionName: 'donateToCampaign',
        args: [campaignId],
        value,
      },
      { onError: (error) => toast.error(`Donation failed: ${error.message}`) },
    );
  };

  const handleShare = async () => {
    setShareStatus(undefined);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus('Campaign link copied.');
      toast.success('Campaign link copied.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'clipboard access is unavailable';
      setShareStatus(`Could not copy the campaign link: ${message}`);
      toast.error(`Could not copy the campaign link: ${message}`);
    }
  };

  if (campaignId === null) {
    return (
      <EmptyState
        title="Invalid campaign link"
        description="The campaign ID in this link isn't valid."
      >
        <Link
          to="/"
          className="bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
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
          className="border-border text-foreground focus-visible:ring-ring rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
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
          className="bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          Browse campaigns
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All campaigns
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => void handleShare()}
            className="border-border bg-card text-foreground hover:bg-muted min-h-10 gap-2 border text-sm"
          >
            {shareStatus === 'Campaign link copied.' ? (
              <Check className="text-success size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            Share
          </Button>
          {explorerBase && (
            <a
              href={`${explorerBase}/address/${contractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Contract
            </a>
          )}
        </div>
      </div>
      {shareStatus && (
        <p
          role={shareStatus.startsWith('Could not') ? 'alert' : 'status'}
          className={`mb-4 text-sm ${
            shareStatus.startsWith('Could not') ? 'text-destructive' : 'text-success'
          }`}
          aria-live="polite"
        >
          {shareStatus}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]">
        <div className="min-w-0 space-y-6">
          <section className="border-border bg-card overflow-hidden rounded-2xl border">
            <div className="bg-muted relative aspect-16/10 sm:aspect-[16/9]">
              {activeImageUrl && !failedImages.has(activeImageUrl) ? (
                <img
                  src={activeImageUrl}
                  alt={campaignDetails.title}
                  className="size-full object-cover"
                  onError={() =>
                    setFailedImages((previous) => new Set(previous).add(activeImageUrl))
                  }
                />
              ) : (
                <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-3">
                  <ImageOff className="size-10" aria-hidden="true" />
                  <span className="text-sm">Campaign image unavailable</span>
                </div>
              )}
            </div>
            {imageUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3" aria-label="Campaign image gallery">
                {imageUrls.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    aria-label={`Show campaign image ${index + 1}`}
                    aria-pressed={selectedImageIndex === index}
                    onClick={() => setActiveImage({ campaignId: id ?? '', index })}
                    className={`focus-visible:ring-ring size-16 shrink-0 overflow-hidden rounded-lg border-2 focus-visible:ring-2 focus-visible:outline-none sm:size-20 ${
                      selectedImageIndex === index ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    {failedImages.has(image) ? (
                      <span className="bg-muted flex size-full items-center justify-center">
                        <ImageOff className="text-muted-foreground size-5" aria-hidden="true" />
                      </span>
                    ) : (
                      <img src={image} alt="" className="size-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
            {campaignImagesError && (
              <p className="text-muted-foreground px-4 pb-3 text-xs">
                Additional images are unavailable; showing the campaign cover instead.
              </p>
            )}
          </section>

          <section className="border-border bg-card rounded-2xl border p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    goalReached
                      ? 'bg-success/10 text-success'
                      : campaignEnded
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary/10 text-primary'
                  }`}
                >
                  {goalReached && <Trophy className="size-3.5" aria-hidden="true" />}
                  {goalReached
                    ? 'Goal reached'
                    : campaignEnded
                      ? 'Campaign ended'
                      : 'Active campaign'}
                </span>
                <h1 className="font-epilogue text-card-foreground mt-3 text-2xl leading-tight font-bold sm:text-3xl">
                  {campaignDetails.title}
                </h1>
              </div>
            </div>

            <div className="border-border mt-5 flex flex-wrap items-center gap-3 border-t pt-5">
              <div className="bg-secondary size-11 shrink-0 overflow-hidden rounded-full">
                <img
                  src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${encodeURIComponent(campaignDetails.owner.toLowerCase())}`}
                  alt=""
                  aria-hidden="true"
                  className="size-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-xs">Created by</p>
                <p className="text-foreground font-mono text-sm font-medium break-all">
                  {campaignDetails.owner}
                </p>
              </div>
              <span className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs font-medium">
                {uniqueBackers} {uniqueBackers === 1 ? 'supporter' : 'supporters'}
              </span>
            </div>
          </section>

          <section className="border-border bg-card rounded-2xl border p-5 sm:p-7">
            <h2 className="font-epilogue text-card-foreground text-xl font-semibold">The story</h2>
            <p className="text-soft-foreground mt-4 text-sm leading-7 whitespace-pre-wrap sm:text-base">
              {campaignDetails.description}
            </p>
          </section>

          <section className="border-border bg-card rounded-2xl border p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-epilogue text-card-foreground text-xl font-semibold">
                  Supporters
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {uniqueBackers} unique {uniqueBackers === 1 ? 'wallet' : 'wallets'} ·{' '}
                  {donators.length} {donators.length === 1 ? 'contribution' : 'contributions'}
                </p>
              </div>
            </div>
            <div className="mt-5">
              {donationsError ? (
                <ErrorState
                  title="Supporters couldn't be loaded"
                  description={donationsError.message}
                  onRetry={() => void refetchDonations()}
                  className="p-4"
                />
              ) : donationsLoading || donationData === undefined ? (
                <div className="grid gap-3" role="status" aria-label="Loading supporters">
                  <span className="sr-only">Loading supporters…</span>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : donators.length > 0 ? (
                <ul className="grid gap-2">
                  {donators.map((donator, index) => (
                    <li
                      key={`${donator}-${index}`}
                      className="bg-background flex min-w-0 items-center justify-between gap-3 rounded-xl p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${encodeURIComponent(donator.toLowerCase())}`}
                          alt=""
                          aria-hidden="true"
                          className="bg-secondary size-9 shrink-0 rounded-full"
                        />
                        <span className="text-soft-foreground truncate font-mono text-sm">
                          {donator.slice(0, 6)}…{donator.slice(-4)}
                        </span>
                      </div>
                      <span className="text-foreground shrink-0 text-sm font-semibold">
                        {formatEth(donations[index])} ETH
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No supporters yet"
                  description="Be the first to support this campaign."
                  className="p-4"
                />
              )}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-6">
          <section className="border-border bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
            {goalReached && (
              <div className="bg-success/10 text-success mb-5 flex items-center gap-3 rounded-xl p-3">
                <Trophy className="size-5 shrink-0" aria-hidden="true" />
                <p className="text-sm font-semibold">This campaign reached its goal!</p>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-epilogue text-card-foreground text-3xl font-bold">
                {formatEth(campaignDetails.amountCollected)} ETH
              </p>
              <p className="text-muted-foreground shrink-0 text-xs">raised</p>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              of {formatEth(campaignDetails.target)} ETH goal
            </p>
            <div
              className="bg-muted mt-4 h-3 overflow-hidden rounded-full"
              role="progressbar"
              aria-label="Campaign funding progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-valuetext={`${progress}% of goal reached`}
            >
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-muted-foreground mt-2 flex justify-between text-xs">
              <span>{progress}% funded</span>
              <span>{remainingDays === null ? 'Ended' : `${remainingDays} days left`}</span>
            </div>

            <div className="border-border mt-5 grid grid-cols-2 gap-3 border-t pt-5">
              <div className="bg-background rounded-xl p-3">
                <p className="text-foreground text-xl font-bold">{uniqueBackers}</p>
                <p className="text-muted-foreground mt-1 text-xs">Unique supporters</p>
              </div>
              <div className="bg-background rounded-xl p-3">
                <p className="text-foreground text-xl font-bold">
                  {remainingDays === null ? '—' : remainingDays}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {remainingDays === null ? 'Days remaining' : 'Days remaining'}
                </p>
              </div>
            </div>
          </section>

          <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
            <h2 className="font-epilogue text-card-foreground text-lg font-semibold">
              {goalReached ? 'Goal reached' : campaignEnded ? 'Campaign ended' : 'Back this cause'}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {goalReached
                ? 'Thank you to everyone who helped make this possible.'
                : campaignEnded
                  ? 'This campaign is no longer accepting contributions.'
                  : 'Choose an amount to contribute directly to the campaign owner.'}
            </p>
            <div className="mt-5 grid gap-3">
              <label
                htmlFor="donation-amount"
                className="text-muted-foreground grid gap-1.5 text-sm font-medium"
              >
                Contribution amount (ETH)
                <Input
                  type="number"
                  id="donation-amount"
                  aria-invalid={Boolean(donationValidationError)}
                  placeholder="0.1"
                  min="0"
                  step="any"
                  value={donationAmount}
                  onChange={(event) => {
                    setDonationAmount(event.target.value);
                    setDonationValidationError(undefined);
                  }}
                  disabled={campaignEnded || goalReached || donationPending || receiptPending}
                />
              </label>
              {donationValidationError && (
                <p role="alert" className="text-destructive text-sm">
                  {donationValidationError}
                </p>
              )}
              {donationError && (
                <p role="alert" className="text-destructive text-sm">
                  Donation failed: {donationError.message}
                </p>
              )}
              {receiptError && (
                <p role="alert" className="text-destructive text-sm">
                  Unable to confirm the donation: {receiptError.message}
                </p>
              )}
              {receiptSuccess && receipt?.status === 'success' && (
                <p role="status" className="text-success text-sm" aria-live="polite">
                  Donation confirmed. Thank you for supporting this campaign.
                </p>
              )}
              {receiptSuccess && receipt?.status === 'reverted' && (
                <p role="alert" className="text-destructive text-sm">
                  The donation transaction reverted.
                </p>
              )}
              <Button
                className="bg-primary text-primary-foreground w-full hover:opacity-90"
                disabled={donationPending || receiptPending || campaignEnded || goalReached}
                aria-busy={donationPending || receiptPending}
                onClick={handleDonation}
              >
                {donationPending || receiptPending
                  ? 'Processing contribution…'
                  : goalReached
                    ? 'Goal reached'
                    : campaignEnded
                      ? 'Campaign ended'
                      : 'Contribute'}
              </Button>
            </div>
            <p className="text-muted-foreground mt-4 text-xs leading-5">
              Escrowed contributions with defined withdrawal and refund rules are planned for a
              future contract phase. This prototype still transfers contributions immediately to the
              owner and is not escrow-protected.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
