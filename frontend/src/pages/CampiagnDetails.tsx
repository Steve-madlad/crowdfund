import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import CampaignImage from '@/components/CampaignImage';
import { CampaignDetailsSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateMessage';
import {
  calculateBarPercentage,
  daysLeft,
  formatEth,
  formatProgressPercent,
} from '@/lib/utils';
import { formatWeb3Error } from '@/lib/web3Errors';
import WalletConnectDialog from '@/components/WalletConnectDialog';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { parseEther, zeroAddress } from 'viem';
import {
  useChainId,
  useBlock,
  useConfig,
  useConnection,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { crowdFundingAbi } from '../generated';

const contractAddress = import.meta.env.VITE_REACT_CONTRACT_ADDRESS;

type CampaignAction = 'donate' | 'withdraw' | 'refund' | 'cancel' | 'processRefunds';
type ActionFeedback = {
  action: CampaignAction;
  stage: 'wallet' | 'confirming' | 'success' | 'reverted' | 'error';
  hash?: `0x${string}`;
  message?: string;
};

const actionLabels: Record<CampaignAction, string> = {
  donate: 'contribution',
  withdraw: 'withdrawal',
  refund: 'refund',
  cancel: 'cancellation',
  processRefunds: 'refund activation',
};

export default function CampiagnDetails() {
  const { id } = useParams();
  const campaignId = /^\d+$/.test(id ?? '') ? BigInt(id!) : null;
  const [donationAmount, setDonationAmount] = useState('');
  const [donationValidationError, setDonationValidationError] = useState<string>();
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  const transactionAction = useRef<CampaignAction | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>();
  const [activeImage, setActiveImage] = useState<{ campaignId: string; index: number }>({
    campaignId: '',
    index: 0,
  });
  const [shareStatus, setShareStatus] = useState<string>();
  const previousGoalState = useRef<{ campaignId: string; reached: boolean } | null>(null);
  const completedTransactionToastHash = useRef<string | undefined>(undefined);
  const { address } = useConnection();
  const chainId = useChainId();
  const config = useConfig();
  const { data: latestBlock, error: latestBlockError } = useBlock({ watch: true });
  const {
    data: refundDelay,
    error: refundDelayError,
  } = useReadContract({
    address: contractAddress,
    abi: crowdFundingAbi,
    functionName: 'REFUND_DELAY',
  });
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
    error: transactionError,
    isPending: transactionPending,
    mutate: writeContract,
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
  const {
    data: userContribution,
    error: contributionError,
    isLoading: contributionLoading,
    refetch: refetchContribution,
  } = useReadContract({
    abi: crowdFundingAbi,
    address: contractAddress,
    args: [campaignId ?? 0n, address ?? zeroAddress],
    functionName: 'contributions',
    query: { enabled: campaignId !== null && Boolean(address) },
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
        cancelled: campaign[7],
        withdrawn: campaign[8],
        refundsEnabled: campaign[9],
      }
    : null;
  const remainingDays = campaignDetails ? daysLeft(campaignDetails.deadline) : null;
  const uniqueBackers = new Set(donators.map((donator) => donator.toLowerCase())).size;
  const progress = campaignDetails
    ? calculateBarPercentage(campaignDetails.target, campaignDetails.amountCollected)
    : 0;
  const progressLabel = campaignDetails
    ? formatProgressPercent(campaignDetails.target, campaignDetails.amountCollected)
    : '0%';
  const goalReached = Boolean(
    campaignDetails &&
    campaignDetails.target > 0n &&
    campaignDetails.amountCollected >= campaignDetails.target,
  );
  const amountCollected = campaignDetails?.amountCollected;
  const target = campaignDetails?.target;
  const campaignEnded = remainingDays === null;
  const refundWindowKnown = Boolean(
    latestBlock && refundDelay !== undefined && !latestBlockError && !refundDelayError,
  );
  const refundWindowElapsed = Boolean(
    campaignDetails &&
    refundWindowKnown &&
    latestBlock &&
    refundDelay !== undefined &&
      latestBlock.timestamp >= campaignDetails.deadline &&
    latestBlock.timestamp - campaignDetails.deadline >= refundDelay,
  );
  const isOwner = Boolean(
    address && campaignDetails && address.toLowerCase() === campaignDetails.owner.toLowerCase(),
  );
  const refundsAvailable = Boolean(
    campaignDetails &&
      (campaignDetails.cancelled ||
        campaignDetails.refundsEnabled ||
        (campaignEnded && !goalReached)),
  );
  const canProcessRefunds = Boolean(
    campaignDetails &&
      goalReached &&
      refundWindowElapsed &&
      !campaignDetails.cancelled &&
      !campaignDetails.withdrawn &&
      !campaignDetails.refundsEnabled,
  );
  const canWithdraw = Boolean(
    isOwner &&
      goalReached &&
      campaignDetails &&
      !campaignDetails.cancelled &&
      !campaignDetails.withdrawn &&
      !campaignDetails.refundsEnabled,
  );
  const canCancel = Boolean(
    isOwner && campaignDetails && !campaignDetails.cancelled && !campaignDetails.withdrawn && !campaignEnded,
  );
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
    if (!transactionHash || !receipt || completedTransactionToastHash.current === transactionHash) {
      return;
    }

    completedTransactionToastHash.current = transactionHash;
    const action = transactionAction.current ?? 'donate';
    setActionFeedback({
      action,
      stage: receipt.status === 'success' ? 'success' : 'reverted',
      hash: transactionHash,
      ...(receipt.status === 'reverted'
        ? { message: 'The transaction was mined but reverted.' }
        : {}),
    });
    console.info('[crowdfund:transaction] receipt', {
      action,
      campaignId: campaignId?.toString(),
      hash: transactionHash,
      status: receipt.status,
    });
    if (receipt.status === 'success') {
      const successMessage = {
        donate: 'Contribution confirmed. Thank you for supporting this cause.',
        withdraw: 'Campaign funds withdrawn successfully.',
        refund: 'Your contribution was refunded successfully.',
        cancel: 'Campaign cancelled. Supporters can now claim refunds.',
        processRefunds: 'Supporter refunds are now available.',
      }[action];
      toast.success(successMessage);
      void refetchCampaign();
      void refetchDonations();
      void refetchContribution();
    } else {
      toast.error('The campaign transaction reverted.');
    }
    transactionAction.current = null;
  }, [campaignId, receipt, refetchCampaign, refetchDonations, refetchContribution, transactionHash]);

  useEffect(() => {
    if (!transactionHash || !receiptError) return;
    const action = transactionAction.current ?? 'donate';
    setActionFeedback({
      action,
      stage: 'error',
      hash: transactionHash,
      message: formatWeb3Error(receiptError),
    });
    console.error('[crowdfund:transaction] receipt lookup failed', {
      action,
      campaignId: campaignId?.toString(),
      hash: transactionHash,
      error: receiptError.message,
    });
  }, [campaignId, receiptError, transactionHash]);

  useEffect(() => {
    if (amountCollected === undefined || target === undefined) return;

    const reached = target > 0n && amountCollected >= target;
    const campaignKey = id ?? '';
    const previous = previousGoalState.current;

    if (
      ((!previous || previous.campaignId !== campaignKey) ||
        (previous.campaignId === campaignKey && !previous.reached)) &&
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

    if (campaignId === null || !address) {
      setConnectDialogOpen(true);
      return;
    }

    if (campaignDetails?.cancelled) {
      setDonationValidationError('This campaign has been cancelled.');
      return;
    }

    if (campaignDetails?.withdrawn) {
      setDonationValidationError('Campaign funds have already been withdrawn.');
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

    transactionAction.current = 'donate';
    setActionFeedback({ action: 'donate', stage: 'wallet' });
    console.info('[crowdfund:transaction] requesting wallet submission', {
      action: 'donate',
      campaignId: campaignId.toString(),
      contractAddress,
      chainId,
    });
    writeContract(
      {
        address: contractAddress,
        abi: crowdFundingAbi,
        functionName: 'donateToCampaign',
        args: [campaignId],
        value,
      },
      {
        onSuccess: (hash) => {
          setActionFeedback({ action: 'donate', stage: 'confirming', hash });
          console.info('[crowdfund:transaction] wallet returned hash', {
            action: 'donate',
            campaignId: campaignId.toString(),
            hash,
          });
        },
        onError: (error) => {
          transactionAction.current = null;
          const message = formatWeb3Error(error);
          setActionFeedback({ action: 'donate', stage: 'error', message });
          console.error('[crowdfund:transaction] wallet submission failed', {
            action: 'donate',
            campaignId: campaignId.toString(),
            error: error.message,
          });
          toast.error(`Contribution failed: ${message}`);
        },
      },
    );
  };

  const handleCampaignAction = (action: Exclude<CampaignAction, 'donate'>) => {
    if (campaignId === null) return;
    if (!address) {
      setConnectDialogOpen(true);
      return;
    }

    transactionAction.current = action;
    setActionFeedback({ action, stage: 'wallet' });
    console.info('[crowdfund:transaction] requesting wallet submission', {
      action,
      campaignId: campaignId.toString(),
      contractAddress,
      chainId,
    });
    const functionName =
      action === 'withdraw'
        ? 'withdrawFunds'
        : action === 'refund'
          ? 'claimRefund'
          : action === 'cancel'
            ? 'cancelCampaign'
            : 'processRefunds';
    writeContract(
      {
        address: contractAddress,
        abi: crowdFundingAbi,
        functionName,
        args: [campaignId],
      },
      {
        onSuccess: (hash) => {
          setActionFeedback({ action, stage: 'confirming', hash });
          console.info('[crowdfund:transaction] wallet returned hash', {
            action,
            campaignId: campaignId.toString(),
            hash,
          });
        },
        onError: (error) => {
          transactionAction.current = null;
          const message = formatWeb3Error(error);
          setActionFeedback({ action, stage: 'error', message });
          console.error('[crowdfund:transaction] wallet submission failed', {
            action,
            campaignId: campaignId.toString(),
            error: error.message,
          });
          toast.error(`Campaign action failed: ${message}`);
        },
      },
    );
    setCancelConfirmationOpen(false);
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
          className="flex-center bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
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
        description={formatWeb3Error(campaignError)}
        onRetry={() => void refetchCampaign()}
      >
        <Link
          to="/"
          className="flex-center border-border text-foreground focus-visible:ring-ring rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
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
          className="flex-center bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
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
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex-center min-h-10 gap-2 rounded-lg px-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All campaigns
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => void handleShare()}
            className="flex-center border-border bg-card text-foreground hover:bg-muted min-h-10 gap-2 border text-sm"
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
      {transactionError && (
        <p role="alert" className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border p-3 text-sm">
          Campaign transaction failed: {formatWeb3Error(transactionError)}
        </p>
      )}
      {receiptError && (
        <p role="alert" className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border p-3 text-sm">
          Unable to confirm the transaction: {formatWeb3Error(receiptError)}
        </p>
      )}
      {receiptSuccess && receipt?.status === 'success' && (
        <p role="status" className="border-success/30 bg-success/5 text-success mb-4 rounded-lg border p-3 text-sm" aria-live="polite">
          Transaction confirmed successfully.
        </p>
      )}
      {receiptSuccess && receipt?.status === 'reverted' && (
        <p role="alert" className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border p-3 text-sm">
          The transaction reverted.
        </p>
      )}
      {actionFeedback && (
        <div
          role={
            actionFeedback.stage === 'error' || actionFeedback.stage === 'reverted'
              ? 'alert'
              : 'status'
          }
          aria-live="polite"
          className={`mb-4 rounded-lg border p-3 text-sm ${
            actionFeedback.stage === 'error' || actionFeedback.stage === 'reverted'
              ? 'border-destructive/30 bg-destructive/5 text-destructive'
              : actionFeedback.stage === 'success'
                ? 'border-success/30 bg-success/5 text-success'
                : 'border-border bg-muted text-foreground'
          }`}
        >
          <p>
            {actionFeedback.stage === 'wallet'
              ? `Waiting for wallet approval to submit the ${actionLabels[actionFeedback.action]}.`
              : actionFeedback.stage === 'confirming'
                ? `Wallet submitted the ${actionLabels[actionFeedback.action]}; waiting for network confirmation.`
                : actionFeedback.stage === 'success'
                  ? `The ${actionLabels[actionFeedback.action]} was confirmed.`
                  : actionFeedback.stage === 'reverted'
                    ? `The ${actionLabels[actionFeedback.action]} transaction reverted.`
                    : `The ${actionLabels[actionFeedback.action]} could not be completed or confirmed.`}
          </p>
          {actionFeedback.hash && (
            <p className="mt-1 break-all font-mono text-xs">Transaction: {actionFeedback.hash}</p>
          )}
          {actionFeedback.message && (
            <p className="mt-1 wrap-break-word text-xs">{actionFeedback.message}</p>
          )}
        </div>
      )}
      {(latestBlockError || refundDelayError) && (
        <p role="alert" className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border p-3 text-sm">
          Unable to determine whether the three-week refund window has elapsed.
          {` ${latestBlockError?.message ?? refundDelayError?.message ?? ''}`}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]">
        <div className="min-w-0 space-y-6">
          <section className="border-border bg-card overflow-hidden rounded-2xl border">
            <div className="bg-muted relative aspect-16/10 sm:aspect-[16/9]">
              <CampaignImage
                src={activeImageUrl}
                alt={campaignDetails.title}
                className="size-full object-cover"
                loading="eager"
              />
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
                    <CampaignImage src={image} alt="" className="size-full object-cover" />
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
                    campaignDetails.cancelled
                        ? 'bg-destructive/10 text-destructive'
                        : goalReached
                      ? 'bg-success/10 text-success'
                      : campaignEnded
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary/10 text-primary'
                  }`}
                >
                  {goalReached && !campaignDetails.cancelled && (
                    <Trophy className="size-3.5" aria-hidden="true" />
                  )}
                  {campaignDetails.cancelled
                    ? 'Cancelled · refunds available'
                    : campaignDetails.withdrawn
                        ? 'Funds withdrawn'
                        : goalReached
                          ? campaignDetails.refundsEnabled
                            ? 'Goal reached · refunds open'
                            : 'Goal reached'
                          : campaignEnded
                            ? refundsAvailable
                              ? 'Unsuccessful · refunds available'
                              : 'Campaign ended'
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
                <p className="text-muted-foreground mt-1 text-xs">
                  History shows original on-chain contributions; refunds are shown separately.
                </p>
              </div>
            </div>
            <div className="mt-5">
              {donationsError ? (
                <ErrorState
                  title="Supporters couldn't be loaded"
                  description={formatWeb3Error(donationsError)}
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
              {refundsAvailable ? 'pledged · refunds available' : 'raised'} of{' '}
              {formatEth(campaignDetails.target)} ETH goal
            </p>
            <div
              className="bg-muted mt-4 h-3 overflow-hidden rounded-full"
              role="progressbar"
              aria-label="Campaign funding progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-valuetext={`${progressLabel} of goal reached`}
            >
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-muted-foreground mt-2 flex justify-between text-xs">
              <span>{progressLabel} funded</span>
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

          {isOwner && (
            <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
              <h2 className="font-epilogue text-card-foreground text-lg font-semibold">
                Manage campaign funds
              </h2>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                {canWithdraw && refundWindowKnown && !refundWindowElapsed
                  ? `The goal is reached. You can withdraw the full ${formatEth(campaignDetails.amountCollected)} ETH held in escrow. Withdrawal is final and disables cancellation.`
                  : canWithdraw && !refundWindowKnown
                    ? 'Checking the latest block time to determine whether withdrawal is still available.'
                  : campaignDetails.withdrawn
                    ? 'The escrowed funds have already been withdrawn.'
                    : campaignDetails.cancelled
                      ? 'The campaign is cancelled. Supporters can claim their full contributions.'
                        : campaignDetails.refundsEnabled
                          ? 'Supporter refunds have been enabled. Each supporter can claim their full contribution.'
                          : refundWindowElapsed && goalReached
                            ? 'The three-week payout window has elapsed. Anyone can enable full refunds for supporters.'
                            : 'Funds remain in escrow until the goal is reached or supporters claim refunds after an unsuccessful deadline.'}
              </p>
              {canWithdraw && refundWindowKnown && !refundWindowElapsed && (
                <Button
                  type="button"
                  className="flex-center bg-primary text-primary-foreground mt-4 w-full hover:opacity-90"
                  disabled={transactionPending || receiptPending}
                  aria-busy={transactionPending || receiptPending}
                  onClick={() => handleCampaignAction('withdraw')}
                >
                  {transactionPending || receiptPending ? 'Processing…' : 'Withdraw funds'}
                </Button>
              )}
              {canCancel && (
                <div className="mt-4">
                  {cancelConfirmationOpen ? (
                    <div className="border-destructive/30 bg-destructive/5 grid gap-3 rounded-xl border p-4">
                      <p className="text-sm leading-6 text-foreground">
                        Cancelling stops contributions permanently. Supporters will be able to
                        claim their full contributions. This cannot be undone.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="flex-center bg-destructive text-destructive-foreground min-h-10"
                          disabled={transactionPending || receiptPending}
                          onClick={() => handleCampaignAction('cancel')}
                        >
                          Confirm cancellation
                        </Button>
                        <Button
                          type="button"
                          className="flex-center border-border bg-background min-h-10 border text-foreground hover:bg-muted"
                          onClick={() => setCancelConfirmationOpen(false)}
                        >
                          Keep campaign
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      className="flex-center border-destructive/40 text-destructive hover:bg-destructive/5 min-h-10 w-full border"
                      onClick={() => setCancelConfirmationOpen(true)}
                    >
                      Cancel campaign
                    </Button>
                  )}
                </div>
              )}
            </section>
          )}

          {(refundsAvailable || canProcessRefunds) && (
            <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
              <h2 className="font-epilogue text-card-foreground text-lg font-semibold">
                Supporter refunds
              </h2>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                {campaignDetails.cancelled
                  ? 'This campaign was cancelled. Supporters can claim their full contributions back from escrow.'
                  : campaignDetails.refundsEnabled
                    ? 'Refunds were enabled because the owner did not withdraw within three weeks after the deadline. Supporters can claim their full contributions back from escrow.'
                    : campaignEnded && !goalReached
                      ? 'This campaign ended below its goal. Supporters can claim their full contributions back from escrow.'
                      : 'The owner has not withdrawn the funds within three weeks after the deadline. Anyone can enable full refunds; supporters can then claim their contributions.'}
              </p>
              {canProcessRefunds && (
                <Button
                  type="button"
                  className="flex-center bg-primary text-primary-foreground mt-4 w-full hover:opacity-90"
                  disabled={transactionPending || receiptPending}
                  aria-busy={transactionPending || receiptPending}
                  onClick={() => handleCampaignAction('processRefunds')}
                >
                  {transactionPending || receiptPending
                    ? 'Enabling refunds…'
                    : address
                      ? 'Enable supporter refunds'
                      : 'Connect wallet to enable refunds'}
                </Button>
              )}
              {address && contributionLoading ? (
                <Skeleton className="mt-4 h-10 w-full" />
              ) : address && contributionError ? (
                <p role="alert" className="text-destructive mt-3 text-sm">
                  Unable to check your refundable contribution: {formatWeb3Error(contributionError)}
                </p>
              ) : address && (userContribution ?? 0n) > 0n ? (
                <>
                  <p className="text-foreground mt-3 text-sm font-semibold">
                    Your refundable amount: {formatEth(userContribution ?? 0n)} ETH
                  </p>
                  <Button
                    type="button"
                    className="flex-center bg-primary text-primary-foreground mt-4 w-full gap-2 hover:opacity-90"
                    disabled={transactionPending || receiptPending}
                    aria-busy={transactionPending || receiptPending}
                    onClick={() => handleCampaignAction('refund')}
                  >
                    <RotateCcw className="size-4" aria-hidden="true" />
                    {transactionPending || receiptPending ? 'Processing refund…' : 'Claim refund'}
                  </Button>
                </>
              ) : address ? (
                <p className="text-muted-foreground mt-3 text-sm">
                  This connected wallet has no remaining contribution to refund.
                </p>
              ) : (
                <Button
                  type="button"
                  className="flex-center bg-primary text-primary-foreground mt-4 w-full hover:opacity-90"
                  onClick={() => setConnectDialogOpen(true)}
                >
                  Connect wallet to check refund
                </Button>
              )}
            </section>
          )}

          <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
            <h2 className="font-epilogue text-card-foreground text-lg font-semibold">
              {campaignDetails.cancelled
                ? 'Campaign cancelled'
                : goalReached
                  ? 'Goal reached'
                  : campaignEnded
                    ? 'Campaign ended'
                    : 'Back this cause'}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {campaignDetails.cancelled
                ? 'This campaign was cancelled. Supporters can claim their contributions back.'
                : goalReached
                  ? 'Thank you to everyone who helped make this possible.'
                  : campaignEnded
                    ? refundsAvailable
                      ? 'This campaign ended below its goal. Supporters can claim full refunds.'
                      : 'This campaign is no longer accepting contributions.'
                    : 'Choose an amount to contribute. Funds stay in escrow until the goal is reached.'}
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
                  disabled={
                    campaignEnded ||
                    goalReached ||
                    campaignDetails.cancelled ||
                    campaignDetails.withdrawn ||
                    transactionPending ||
                    receiptPending
                  }
                />
              </label>
              {donationValidationError && (
                <p role="alert" className="text-destructive text-sm">
                  {donationValidationError}
                </p>
              )}
              <Button
                className="flex-center bg-primary text-primary-foreground w-full hover:opacity-90"
                disabled={
                  transactionPending ||
                  receiptPending ||
                  campaignEnded ||
                  goalReached ||
                  campaignDetails.cancelled ||
                  campaignDetails.withdrawn
                }
                aria-busy={transactionPending || receiptPending}
                onClick={handleDonation}
              >
                {transactionPending || receiptPending
                  ? 'Processing contribution…'
                  : campaignDetails.cancelled
                    ? 'Campaign cancelled'
                    : goalReached
                      ? 'Goal reached'
                      : campaignEnded
                        ? 'Campaign ended'
                        : 'Contribute'}
              </Button>
            </div>
            <p className="text-muted-foreground mt-4 text-xs leading-5">
              A contribution may take the campaign over its goal; the full amount is accepted.
              {' '}
              Contributions are held in escrow. If the goal is not reached by the deadline, or the
              owner cancels before the deadline and before withdrawing, supporters can claim full
              refunds. The owner can withdraw once the goal is reached. If funds remain unpaid three
              weeks after the deadline, anyone can enable supporter refunds.
            </p>
          </section>
        </aside>
      </div>
      <WalletConnectDialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen} />
    </div>
  );
}
