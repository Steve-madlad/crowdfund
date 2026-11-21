import { money } from '@/assets';
import CampaignImage from '@/components/CampaignImage';
import FormInput from '@/components/FormInput';
import WalletConnectDialog from '@/components/WalletConnectDialog';
import Button from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import {
  CAMPAIGN_DRAFT_STORAGE_KEY,
  parseCampaignDraft,
  type CampaignDraft,
  type CampaignSubmissionState,
} from '@/lib/campaignDraft';
import {
  MAX_CAMPAIGN_IMAGES,
  MAX_IMAGE_URL_BYTES,
  normalizeHttpsImageUrl,
  verifyImageUrl,
} from '@/lib/imageUrls';
import { dateInputToDeadline, formatEth } from '@/lib/utils';
import { formatWeb3Error } from '@/lib/web3Errors';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, ImageOff, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseEther, parseEventLogs, type Address } from 'viem';
import { Link } from 'react-router-dom';
import {
  useConnection,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from 'wagmi';
import { toast } from 'sonner';
import loader from '../assets/loader.svg';
import { crowdFundingAbi } from '../generated';

const contractAddress = import.meta.env.VITE_REACT_CONTRACT_ADDRESS;

interface FormFields {
  title: string;
  description: string;
  target: string;
  deadline: string;
}

interface ImageField {
  id: number;
  url: string;
}

type CreateCampaignArgs = readonly [Address, string, string, bigint, bigint, string[]];
interface CampaignDraftContext {
  accountAddress?: string;
  chainId?: number;
}

type ImageStatus = 'idle' | 'checking' | 'valid' | 'invalid';
interface ImageStatusRecord {
  url: string;
  status: ImageStatus;
}

function getImageStatus(
  field: ImageField,
  statuses: Record<number, ImageStatusRecord>,
): ImageStatus {
  const status = statuses[field.id];
  if (status?.url === field.url) return status.status;
  return field.url.trim() ? 'checking' : 'idle';
}

function readSavedCampaignDraft(): { draft?: CampaignDraft; error?: string } {
  try {
    const serialized = window.localStorage.getItem(CAMPAIGN_DRAFT_STORAGE_KEY);
    if (serialized === null) return {};
    const draft = parseCampaignDraft(serialized);
    return draft
      ? { draft }
      : { error: 'A saved campaign draft could not be read and will not be restored.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Browser storage is unavailable.';
    return { error: `A saved draft could not be checked: ${message}` };
  }
}

export default function CreateCampaign() {
  const [initialDraftState] = useState(readSavedCampaignDraft);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormFields>({
    title: '',
    description: '',
    target: '',
    deadline: '',
  });
  const [imageFields, setImageFields] = useState<ImageField[]>([{ id: 0, url: '' }]);
  const [imageStatuses, setImageStatuses] = useState<Record<number, ImageStatusRecord>>({});
  const [formError, setFormError] = useState<string>();
  const [estimatedFee, setEstimatedFee] = useState<string>();
  const [feeEstimateError, setFeeEstimateError] = useState<string>();
  const [submissionHash, setSubmissionHash] = useState<`0x${string}`>();
  const [submissionState, setSubmissionState] = useState<CampaignSubmissionState>('draft');
  const [submissionContext, setSubmissionContext] = useState<CampaignDraftContext>(() => ({
    ...(initialDraftState.draft?.accountAddress
      ? { accountAddress: initialDraftState.draft.accountAddress }
      : {}),
    ...(initialDraftState.draft?.chainId ? { chainId: initialDraftState.draft.chainId } : {}),
  }));
  const [draftReady, setDraftReady] = useState(!initialDraftState.draft);
  const [recoveryDraft, setRecoveryDraft] = useState<CampaignDraft | undefined>(
    initialDraftState.draft,
  );
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(Boolean(initialDraftState.draft));
  const [draftStorageError, setDraftStorageError] = useState(initialDraftState.error);
  const [needsSubmissionReview, setNeedsSubmissionReview] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingCreateArgs, setPendingCreateArgs] = useState<CreateCampaignArgs>();
  const [createdCampaignId, setCreatedCampaignId] = useState<string>();
  const [isConfirming, setIsConfirming] = useState(false);
  const [receiptStatus, setReceiptStatus] = useState<'success' | 'reverted'>();
  const [receiptError, setReceiptError] = useState<string>();
  const nextImageId = useRef(1);
  const feeEstimateRequestId = useRef(0);
  const draftPersistenceInitialized = useRef(false);
  const draftStorageNotificationShown = useRef(false);
  const { address, chainId, isConnected } = useConnection();
  const publicClient = usePublicClient();
  const {
    mutate: createCampaign,
    isPending: createCampaignLoading,
    error: createCampaignError,
  } = useWriteContract();
  const { data: campaigns, refetch: refetchCampaigns } = useReadContract({
    address: contractAddress,
    abi: crowdFundingAbi,
    functionName: 'getCampaigns',
  });
  const persistDraft = useCallback(
    (
      state: CampaignSubmissionState,
      transactionHash?: `0x${string}`,
      context?: CampaignDraftContext,
    ) => {
      try {
        const hasContent =
          Object.values(form).some((value) => value.trim().length > 0) ||
          imageFields.some((field) => field.url.trim().length > 0);
        const draftContext =
          context ?? (state === 'draft' ? { accountAddress: address, chainId } : submissionContext);
        if (!hasContent && state === 'draft') {
          window.localStorage.removeItem(CAMPAIGN_DRAFT_STORAGE_KEY);
          return undefined;
        }

        const draft: CampaignDraft = {
          version: 1,
          form,
          imageUrls: imageFields.map(({ url }) => url),
          submissionState: state,
          updatedAt: Date.now(),
          ...(transactionHash ? { transactionHash } : {}),
          ...(draftContext.accountAddress ? { accountAddress: draftContext.accountAddress } : {}),
          ...(draftContext.chainId ? { chainId: draftContext.chainId } : {}),
        };
        window.localStorage.setItem(CAMPAIGN_DRAFT_STORAGE_KEY, JSON.stringify(draft));
        return undefined;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Browser storage is unavailable.';
        return `Draft could not be saved in this browser: ${message}`;
      }
    },
    [address, chainId, form, imageFields, submissionContext],
  );

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(CAMPAIGN_DRAFT_STORAGE_KEY);
      return undefined;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Browser storage is unavailable.';
      return `Saved draft could not be cleared: ${message}`;
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    if (!draftPersistenceInitialized.current) {
      draftPersistenceInitialized.current = true;
      return;
    }

    const error = persistDraft(submissionState, submissionHash);
    if (error && !draftStorageNotificationShown.current) {
      toast.error(error);
      draftStorageNotificationShown.current = true;
    } else if (!error) {
      draftStorageNotificationShown.current = false;
    }
  }, [draftReady, form, imageFields, persistDraft, submissionHash, submissionState]);

  useEffect(() => {
    let active = true;
    const populatedFields = imageFields.filter((field) => field.url.trim());

    const timeout = setTimeout(() => {
      void Promise.all(
        populatedFields.map(
          async ({ id, url }) => [id, url, await verifyImageUrl(url)] as const,
        ),
      ).then((results) => {
        if (!active) return;
        setImageStatuses((previous) => {
          const next = { ...previous };
          for (const [id, url, isValid] of results) {
            next[id] = { url, status: isValid ? 'valid' : 'invalid' };
          }
          return next;
        });
      });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [imageFields]);

  const isBusy = createCampaignLoading || isConfirming;
  const imageSortSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const resetFeeEstimate = () => {
    feeEstimateRequestId.current += 1;
    setEstimatedFee(undefined);
    setFeeEstimateError(undefined);
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setFormError(undefined);
    setDraftStorageError(undefined);
    resetFeeEstimate();
  };

  const updateImageUrl = (id: number, url: string) => {
    setImageFields((current) =>
      current.map((field) => (field.id === id ? { ...field, url } : field)),
    );
    setFormError(undefined);
    setDraftStorageError(undefined);
    resetFeeEstimate();
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setImageFields((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      return reordered;
    });
    setDraftStorageError(undefined);
    resetFeeEstimate();
  };

  const handleImageDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    setImageFields((current) => {
      const sourceIndex = current.findIndex(({ id }) => id === active.id);
      const targetIndex = current.findIndex(({ id }) => id === over.id);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      return arrayMove(current, sourceIndex, targetIndex);
    });
    setDraftStorageError(undefined);
    resetFeeEstimate();
  };

  const submitCampaign = (args: CreateCampaignArgs) => {
    const attemptContext: CampaignDraftContext = {
      accountAddress: args[0],
      ...(chainId ? { chainId } : {}),
    };
    setNeedsSubmissionReview(false);
    setDuplicateDialogOpen(false);
    setPendingCreateArgs(undefined);
    setReceiptStatus(undefined);
    setReceiptError(undefined);
    setSubmissionHash(undefined);
    setSubmissionContext(attemptContext);
    setSubmissionState('wallet-requested');
    const saveError = persistDraft('wallet-requested', undefined, attemptContext);
    setDraftStorageError(saveError);
    setEstimatedFee(undefined);
    setFeeEstimateError(undefined);
    const estimateRequestId = ++feeEstimateRequestId.current;

    createCampaign(
      {
        address: contractAddress,
        abi: crowdFundingAbi,
        functionName: 'createCampaign',
        args,
      },
      {
        onSuccess: (submittedHash) => {
          setSubmissionHash(submittedHash);
          setSubmissionState('hash-received');
          const saveError = persistDraft('hash-received', submittedHash, attemptContext);
          setDraftStorageError(saveError);
          if (!publicClient) {
            setNeedsSubmissionReview(true);
            setReceiptError('A public client is unavailable; this browser cannot check the receipt.');
            return;
          }

          setIsConfirming(true);
          void publicClient
            .waitForTransactionReceipt({ hash: submittedHash })
            .then((transactionReceipt) => {
            setIsConfirming(false);
            setReceiptStatus(transactionReceipt.status);
            if (transactionReceipt.status === 'success') {
              toast.success('Campaign created successfully.');
              const createdEvent = parseEventLogs({
                abi: crowdFundingAbi,
                logs: transactionReceipt.logs,
                eventName: 'CampaignCreated',
              })[0];
              setCreatedCampaignId(createdEvent?.args.campaignId.toString());
              void refetchCampaigns();
              const clearError = clearDraft();
              setDraftStorageError(clearError);
              setForm({ title: '', description: '', target: '', deadline: '' });
              setImageFields([{ id: 0, url: '' }]);
              setSubmissionState('draft');
              setSubmissionHash(undefined);
              setSubmissionContext({});
              setNeedsSubmissionReview(false);
            } else {
              toast.error('The campaign transaction reverted.');
              setSubmissionState('reverted');
              setNeedsSubmissionReview(false);
              const saveError = persistDraft('reverted', submittedHash, attemptContext);
              setDraftStorageError(saveError);
            }
            })
            .catch((error: unknown) => {
            setIsConfirming(false);
            setNeedsSubmissionReview(true);
            const message = formatWeb3Error(error);
            setReceiptError(message);
            toast.error(`Unable to confirm the campaign transaction: ${message}`);
            });
        },
        onError: (error) => {
          setSubmissionState('request-error');
          setNeedsSubmissionReview(true);
          const saveError = persistDraft('request-error', undefined, attemptContext);
          setDraftStorageError(saveError);
          toast.error(`Campaign creation failed: ${formatWeb3Error(error)}`);
        },
      },
    );

    if (!publicClient) {
      setFeeEstimateError('A public client is unavailable. Review the fee shown by your wallet.');
      return;
    }

    void Promise.all([
      publicClient.estimateContractGas({
        address: contractAddress,
        abi: crowdFundingAbi,
        functionName: 'createCampaign',
        args,
        account: address,
      }),
      publicClient.getGasPrice(),
    ])
      .then(([estimatedGas, gasPrice]) => {
        if (feeEstimateRequestId.current !== estimateRequestId) return;
        setEstimatedFee(`${formatEth(estimatedGas * gasPrice)} ETH`);
      })
      .catch((error: unknown) => {
        if (feeEstimateRequestId.current !== estimateRequestId) return;
        setFeeEstimateError(formatWeb3Error(error));
      });
  };

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);

    if (!isConnected || !address) {
      setIsModalOpen(true);
      return;
    }

    const title = form.title.trim();
    const description = form.description.trim();
    if (!title || !description) {
      setFormError('Add a title and a story before continuing.');
      return;
    }

    if (imageFields.length < 1 || imageFields.length > MAX_CAMPAIGN_IMAGES) {
      setFormError(`Add between one and ${MAX_CAMPAIGN_IMAGES} campaign images.`);
      return;
    }

    let target: bigint;
    let deadline: bigint;
    let images: string[];
    try {
      target = parseEther(form.target);
      deadline = dateInputToDeadline(form.deadline);
      images = imageFields.map(({ url }) => normalizeHttpsImageUrl(url));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Check the goal, end date, and image URLs.');
      return;
    }

    if (target <= 0n) {
      setFormError('The campaign goal must be greater than zero.');
      return;
    }

    if (new Set(images).size !== images.length) {
      setFormError('Each campaign image URL must be unique.');
      return;
    }

    const pendingImageIndex = imageFields.findIndex((field) => {
      const status = getImageStatus(field, imageStatuses);
      return status === 'idle' || status === 'checking';
    });
    if (pendingImageIndex !== -1) {
      setFormError(`Wait for image ${pendingImageIndex + 1} to finish verifying, then try again.`);
      return;
    }

    const failedImageIndex = imageFields.findIndex(
      (field) => getImageStatus(field, imageStatuses) === 'invalid',
    );
    if (failedImageIndex !== -1) {
      setFormError(`Image ${failedImageIndex + 1} could not be loaded. Check the URL and try again.`);
      return;
    }

    const args = [address, title, description, target, deadline, images] as const;
    if (needsSubmissionReview) {
      setPendingCreateArgs(args);
      setDuplicateDialogOpen(true);
      return;
    }
    submitCampaign(args);
  };

  const restoreDraft = (draft: CampaignDraft) => {
    const restoredImages = draft.imageUrls.map((url, id) => ({ id, url }));
    nextImageId.current = restoredImages.length;
    setForm(draft.form);
    setImageFields(restoredImages);
    setSubmissionState(draft.submissionState);
    setSubmissionHash(draft.transactionHash);
    setSubmissionContext({
      ...(draft.accountAddress ? { accountAddress: draft.accountAddress } : {}),
      ...(draft.chainId ? { chainId: draft.chainId } : {}),
    });
    setNeedsSubmissionReview(
      draft.submissionState === 'wallet-requested' ||
        draft.submissionState === 'request-error' ||
        draft.submissionState === 'hash-received',
    );
    setRecoveryDraft(undefined);
    setRecoveryDialogOpen(false);
    setDraftReady(true);
  };

  const discardRecoveredDraft = () => {
    const error = clearDraft();
    setDraftStorageError(error);
    setRecoveryDraft(undefined);
    setRecoveryDialogOpen(false);
    setDraftReady(true);
  };

  const clearCurrentDraft = () => {
    const error = clearDraft();
    setDraftStorageError(error);
    setForm({ title: '', description: '', target: '', deadline: '' });
    setImageFields([{ id: 0, url: '' }]);
    nextImageId.current = 1;
    setSubmissionState('draft');
    setSubmissionHash(undefined);
    setSubmissionContext({});
    setNeedsSubmissionReview(false);
    setFormError(undefined);
    resetFeeEstimate();
  };

  const hasDraftContent =
    Object.values(form).some((value) => value.trim().length > 0) ||
    imageFields.some((field) => field.url.trim().length > 0);
  const campaignCount = address
    ? (campaigns ?? []).filter(
        (campaign) => campaign.owner.toLowerCase() === address.toLowerCase(),
      ).length
    : undefined;

  const submissionStatusMessage = {
    draft: '',
    'wallet-requested':
      'A wallet request was started, but this browser did not record a transaction hash. The result is unknown; the request may still be open or may have been submitted.',
    'request-error':
      'The wallet or network reported an error, but this browser cannot confirm whether a transaction was submitted.',
    'hash-received':
      'A transaction hash was recorded, but this browser did not record a confirmation. It will not check the chain automatically.',
    reverted: 'The last recorded campaign transaction reverted.',
  }[submissionState];
  const recoveryStatusMessage = recoveryDraft
    ? {
        draft: 'No campaign submission was started according to the saved browser data.',
        'wallet-requested':
          'A wallet request was started, but no transaction hash was saved. It may still be open or may already have been submitted.',
        'request-error':
          'The wallet or network reported an error, but the saved browser data cannot confirm whether the transaction was submitted.',
        'hash-received':
          'A transaction hash was saved, but no confirmation was recorded. The app will not check the chain when restoring.',
        reverted: 'A reverted transaction receipt was recorded for the last attempt.',
      }[recoveryDraft.submissionState]
    : '';

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Make it happen
        </p>
        <h1 className="mt-2 font-epilogue text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Create a campaign
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Share the story, set a clear goal, and give people a reason to get involved.
        </p>
      </header>

      {draftStorageError && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {draftStorageError}
        </p>
      )}
      {campaignCount !== undefined && campaignCount <= 2 && (
        <aside className="mb-5 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-foreground">
            New to Venti? Review the campaign and refund rules before you publish.
          </p>
          <Link
            to="/help"
            className="flex-center min-h-9 shrink-0 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Read the rules
          </Link>
        </aside>
      )}
      {submissionStatusMessage && (
        <section
          aria-live="polite"
          className={`mb-4 rounded-xl border p-4 ${
            needsSubmissionReview
              ? 'border-warning/30 bg-warning/5 text-foreground'
              : submissionState === 'reverted'
                ? 'border-destructive/30 bg-destructive/5 text-destructive'
                : 'border-border bg-muted text-foreground'
          }`}
        >
          <p className="text-sm leading-6">{submissionStatusMessage}</p>
          {submissionState === 'hash-received' && submissionHash && (
            <p className="mt-2 break-all font-mono text-xs">{submissionHash}</p>
          )}
          {needsSubmissionReview && (
            <p className="mt-2 text-sm leading-6">
              Check your wallet activity before retrying to avoid creating a duplicate. A campaign
              may only be cancellable before its deadline and before funds are withdrawn; cancellation
              does not erase it from the chain.
            </p>
          )}
          {hasDraftContent && (
            <Button
              type="button"
              disabled={isBusy}
              onClick={clearCurrentDraft}
              className="mt-3 min-h-9 border border-border bg-background text-sm text-foreground hover:bg-muted"
            >
              Clear draft and start over
            </Button>
          )}
        </section>
      )}

      <form onSubmit={handleSubmit} className="grid gap-5">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              01
            </span>
            <div>
              <h2 className="font-epilogue text-xl font-semibold text-card-foreground">
                The campaign
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Give your cause a memorable title and a story people can connect with.
              </p>
            </div>
          </div>
          <div className="grid gap-5">
            <FormInput
              name="title"
              value={form.title}
              onChange={handleFormChange}
              label="Campaign title"
              placeholder="A short, clear title"
              maxLength={120}
              required
              disabled={isBusy}
            />
            <FormInput
              name="description"
              value={form.description}
              onChange={handleFormChange}
              label="Your story"
              type="textarea"
              placeholder="What are you raising funds for? How will contributions help?"
              maxLength={5000}
              required
              disabled={isBusy}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              02
            </span>
            <div>
              <h2 className="font-epilogue text-xl font-semibold text-card-foreground">
                Goal and timeline
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Set a realistic ETH goal and the last day people can contribute.
              </p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              name="target"
              value={form.target}
              onChange={handleFormChange}
              label="Funding goal (ETH)"
              placeholder="0.5"
              type="number"
              min="0"
              step="0.1"
              required
              disabled={isBusy}
            />
            <FormInput
              name="deadline"
              value={form.deadline}
              onChange={handleFormChange}
              label="Campaign end date"
              type="date"
              required
              disabled={isBusy}
            />
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-xl bg-accent/10 p-4">
            <img src={money} alt="" aria-hidden="true" className="size-8 shrink-0 object-contain" />
            <p className="text-sm leading-6 text-soft-foreground">
              Contributions are held in escrow. The owner can withdraw after the goal is reached.
              If the goal is not reached by the deadline, or the owner cancels before the deadline
              and before withdrawing, supporters can claim full refunds. If an unpaid campaign has
              reached its goal but the owner has not withdrawn within three weeks after the deadline,
              anyone can pay gas to enable full refunds.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                03
              </span>
              <div>
                <h2 className="font-epilogue text-xl font-semibold text-card-foreground">
                  Campaign images
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add up to {MAX_CAMPAIGN_IMAGES} images. Drag the handle to reorder, or use the
                  arrow controls. The first image is the cover.
                </p>
              </div>
            </div>
            <Button
              type="button"
              disabled={isBusy || imageFields.length >= MAX_CAMPAIGN_IMAGES}
              onClick={() => {
                setImageFields((current) => [
                  ...current,
                  { id: nextImageId.current++, url: '' },
                ]);
                setFormError(undefined);
                resetFeeEstimate();
              }}
              className="flex-center min-h-10 gap-2 border border-border bg-background text-sm text-foreground hover:bg-muted"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add image
            </Button>
          </div>

          <DndContext
            sensors={imageSortSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleImageDragEnd}
          >
            <SortableContext
              items={imageFields.map(({ id }) => id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {imageFields.map((field, index) => (
                  <SortableImageCard
                    key={field.id}
                    field={field}
                    index={index}
                    status={getImageStatus(field, imageStatuses)}
                    imageCount={imageFields.length}
                    isBusy={isBusy}
                    onUpdateImage={updateImageUrl}
                    onMoveImage={moveImage}
                    onRemoveImage={(id) => {
                      setImageFields((current) => current.filter((item) => item.id !== id));
                      setFormError(undefined);
                      resetFeeEstimate();
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <p className="mt-4 rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
            Use public HTTPS image URLs. Up to {MAX_IMAGE_URL_BYTES} bytes per URL are stored on-chain;
            the image files remain with their host, and adding URLs increases the creation gas cost.
            Availability can change after verification.
          </p>
        </section>

        {formError && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {formError}
          </p>
        )}
        {createCampaignError && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Campaign creation failed: {formatWeb3Error(createCampaignError)}
          </p>
        )}
        {receiptError && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Unable to confirm the transaction: {receiptError}
          </p>
        )}
        {estimatedFee && (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            Estimated network fee: {estimatedFee}. The wallet will show the final fee before you
            approve.
          </p>
        )}
        {feeEstimateError && (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            Fee estimate unavailable: {feeEstimateError} Your wallet may still show the final fee
            before approval.
          </p>
        )}
        {receiptStatus === 'success' && (
          <p role="status" className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success" aria-live="polite">
            Campaign created successfully.
          </p>
        )}
        {receiptStatus === 'reverted' && (
          <p role="alert" className="text-sm text-destructive">
            The campaign transaction reverted.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            disabled={isBusy}
            className="flex w-full items-center justify-center gap-3 bg-primary text-primary-foreground hover:opacity-90 sm:w-auto sm:min-w-64"
            aria-busy={isBusy}
            type="submit"
          >
            {createCampaignLoading
              ? 'Waiting for wallet…'
              : isConfirming
                ? 'Confirming transaction…'
                : 'Create campaign'}
            {isBusy && (
              <img alt="" aria-hidden="true" className="size-7 grayscale" src={loader} />
            )}
          </Button>
          {hasDraftContent && (
            <Button
              type="button"
              disabled={isBusy}
              onClick={clearCurrentDraft}
              className="min-h-11 border border-border bg-background text-foreground hover:bg-muted"
            >
              Clear form
            </Button>
          )}
        </div>
      </form>

      <Dialog
        open={recoveryDialogOpen}
        onOpenChange={(open) => {
          if (open || !recoveryDraft) setRecoveryDialogOpen(open);
        }}
      >
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(event) => {
            if (recoveryDraft) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (recoveryDraft) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Saved campaign draft found</DialogTitle>
            <DialogDescription>
              Restore the saved fields, or discard them and start with a blank form.
            </DialogDescription>
          </DialogHeader>
          {recoveryDraft && (
            <div className="grid gap-3">
              <p className="rounded-lg bg-muted p-3 text-sm leading-6 text-foreground">
                {recoveryStatusMessage}
              </p>
              {recoveryDraft.submissionState !== 'draft' &&
                recoveryDraft.submissionState !== 'reverted' && (
                  <p className="text-sm leading-6 text-muted-foreground">
                    The app cannot determine whether this request is still pending or created a
                    campaign. Check your wallet activity before submitting again. Restoring this
                    draft does not submit anything or check the chain.
                  </p>
                )}
              {recoveryDraft.transactionHash && (
                <p className="break-all rounded-lg border border-border p-3 font-mono text-xs text-muted-foreground">
                  Saved transaction hash: {recoveryDraft.transactionHash}
                </p>
              )}
              {recoveryDraft.accountAddress && (
                <p className="break-all text-xs text-muted-foreground">
                  Wallet used when saved: {recoveryDraft.accountAddress}
                  {recoveryDraft.chainId ? ` · chain ${recoveryDraft.chainId}` : ''}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  onClick={discardRecoveredDraft}
                  className="min-h-10 border border-border bg-background text-foreground hover:bg-muted"
                >
                  Discard draft
                </Button>
                <Button
                  type="button"
                  onClick={() => restoreDraft(recoveryDraft)}
                  className="min-h-10 bg-primary text-primary-foreground hover:opacity-90"
                >
                  Restore draft
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={duplicateDialogOpen}
        onOpenChange={(open) => {
          setDuplicateDialogOpen(open);
          if (!open) setPendingCreateArgs(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check for a previous submission</DialogTitle>
            <DialogDescription>
              The saved status does not establish whether the campaign was created.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Check your wallet activity before proceeding. The app will not search the chain for a
              matching transaction. If you choose to continue, this form will submit a new campaign
              using the current fields. A duplicate may only be cancellable before its deadline and
              before funds are withdrawn; cancellation does not remove it from the chain.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                onClick={() => {
                  setDuplicateDialogOpen(false);
                  setPendingCreateArgs(undefined);
                }}
                className="min-h-10 border border-border bg-background text-foreground hover:bg-muted"
              >
                Go back
              </Button>
              <Button
                type="button"
                disabled={!pendingCreateArgs || isBusy}
                onClick={() => {
                  if (pendingCreateArgs) submitCampaign(pendingCreateArgs);
                }}
                className="min-h-10 bg-primary text-primary-foreground hover:opacity-90"
              >
                Submit another campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(createdCampaignId)}
        onOpenChange={(open) => {
          if (!open) setCreatedCampaignId(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Campaign created</DialogTitle>
            <DialogDescription>
              Your campaign is live. You can open its page now or start another campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={() => {
                setCreatedCampaignId(undefined);
                setReceiptStatus(undefined);
              }}
              className="flex-center min-h-10 border border-border bg-background text-foreground hover:bg-muted"
            >
              Create another
            </Button>
            {createdCampaignId && (
              <Link
                to={`/campaign-details/${createdCampaignId}`}
                onClick={() => setCreatedCampaignId(undefined)}
                className="flex-center min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                View campaign
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <WalletConnectDialog open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}

interface SortableImageCardProps {
  field: ImageField;
  index: number;
  status: ImageStatus;
  imageCount: number;
  isBusy: boolean;
  onUpdateImage: (id: number, url: string) => void;
  onMoveImage: (index: number, direction: -1 | 1) => void;
  onRemoveImage: (id: number) => void;
}

function SortableImageCard({
  field,
  index,
  status,
  imageCount,
  isBusy,
  onUpdateImage,
  onMoveImage,
  onRemoveImage,
}: SortableImageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    disabled: isBusy,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
      }}
      className={`relative min-w-0 overflow-hidden rounded-xl border bg-background transition-colors ${
        index === 0 ? 'border-primary ring-2 ring-primary/40 shadow-md shadow-primary/10' : 'border-border'
      } ${isDragging ? 'opacity-60' : ''}`}
    >
      <div className="relative aspect-16/10 bg-muted">
        {status === 'valid' ? (
          <CampaignImage
            src={field.url}
            alt={`Preview of campaign image ${index + 1}`}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-7" aria-hidden="true" />
            <span className="text-xs">
              {status === 'checking' ? 'Checking image…' : 'Preview will appear here'}
            </span>
          </div>
        )}
        {index === 0 && (
          <span className="absolute top-2 left-2 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            Cover
          </span>
        )}
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={isBusy}
          aria-label={`Drag image ${index + 1} to reorder`}
          className="flex-center absolute top-2 right-2 size-9 touch-none cursor-grab rounded-lg border border-border/70 bg-background/90 text-foreground shadow-sm backdrop-blur focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="grid gap-3 p-3">
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          Image URL {index + 1}
          <Input
            type="url"
            value={field.url}
            onChange={(event) => onUpdateImage(field.id, event.target.value)}
            placeholder="https://example.com/image.jpg"
            aria-label={`Image URL ${index + 1}`}
            aria-invalid={status === 'invalid'}
            maxLength={MAX_IMAGE_URL_BYTES}
            disabled={isBusy}
          />
        </label>
        <div className="flex min-h-8 items-center justify-between gap-2">
          <span
            className={`text-xs ${
              status === 'valid'
                ? 'text-success'
                : status === 'invalid'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            }`}
            aria-live="polite"
          >
            {status === 'valid'
              ? 'Image verified'
              : status === 'invalid'
                ? 'Could not load this image'
                : status === 'checking'
                  ? 'Checking image…'
                  : 'HTTPS image URL required'}
          </span>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              disabled={isBusy || index === 0}
              aria-label={`Move image ${index + 1} earlier`}
              onClick={() => onMoveImage(index, -1)}
              className="flex-center min-h-8 size-8 p-0 text-muted-foreground hover:bg-muted"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              disabled={isBusy || index === imageCount - 1}
              aria-label={`Move image ${index + 1} later`}
              onClick={() => onMoveImage(index, 1)}
              className="flex-center min-h-8 size-8 p-0 text-muted-foreground hover:bg-muted"
            >
              <ArrowDown className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              disabled={isBusy || imageCount === 1}
              aria-label={`Remove image ${index + 1}`}
              onClick={() => onRemoveImage(field.id)}
              className="flex-center min-h-8 size-8 p-0 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
