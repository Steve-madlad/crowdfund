import { money } from '@/assets';
import FormInput from '@/components/FormInput';
import WalletConnectDialog from '@/components/WalletConnectDialog';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  MAX_CAMPAIGN_IMAGES,
  MAX_IMAGE_URL_BYTES,
  normalizeHttpsImageUrl,
  verifyImageUrl,
} from '@/lib/imageUrls';
import { dateInputToDeadline, formatEth } from '@/lib/utils';
import { ArrowDown, ArrowUp, ImageOff, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { parseEther } from 'viem';
import {
  useConnection,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
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

export default function CreateCampaign() {
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
  const [hash, setHash] = useState<`0x${string}`>();
  const completedToastHash = useRef<string | undefined>(undefined);
  const nextImageId = useRef(1);
  const feeEstimateRequestId = useRef(0);
  const { address, isConnected } = useConnection();
  const publicClient = usePublicClient();
  const {
    mutate: createCampaign,
    isPending: createCampaignLoading,
    error: createCampaignError,
  } = useWriteContract();
  const { refetch: refetchCampaigns } = useReadContract({
    address: contractAddress,
    abi: crowdFundingAbi,
    functionName: 'getCampaigns',
  });
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  useEffect(() => {
    if (isConfirmed && receipt?.status === 'success') {
      void refetchCampaigns();
    }
  }, [isConfirmed, receipt?.status, refetchCampaigns]);

  useEffect(() => {
    if (!hash || !receipt) return;
    if (completedToastHash.current === hash) return;

    completedToastHash.current = hash;
    if (receipt.status === 'success') toast.success('Campaign created successfully.');
    else toast.error('The campaign transaction reverted.');
  }, [hash, receipt]);

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
  const resetFeeEstimate = () => {
    feeEstimateRequestId.current += 1;
    setEstimatedFee(undefined);
    setFeeEstimateError(undefined);
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setFormError(undefined);
    resetFeeEstimate();
  };

  const updateImageUrl = (id: number, url: string) => {
    setImageFields((current) =>
      current.map((field) => (field.id === id ? { ...field, url } : field)),
    );
    setFormError(undefined);
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
    resetFeeEstimate();
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
    setHash(undefined);
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
        onSuccess: setHash,
        onError: (error) => toast.error(`Campaign creation failed: ${error.message}`),
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
        setFeeEstimateError(
          error instanceof Error ? error.message : 'An unknown network error occurred.',
        );
      });
  };

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
              step="any"
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
              Escrowed contributions with defined withdrawal and refund rules are the approved
              direction for a future contract phase. This prototype still transfers contributions
              immediately to the owner, so do not use it for a live fundraiser.
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
                  Add up to {MAX_CAMPAIGN_IMAGES} images. The first image is the cover.
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
              className="min-h-10 gap-2 border border-border bg-background text-sm text-foreground hover:bg-muted"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add image
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {imageFields.map((field, index) => {
              const status = getImageStatus(field, imageStatuses);
              return (
                <div
                  key={field.id}
                  className="min-w-0 overflow-hidden rounded-xl border border-border bg-background"
                >
                <div className="relative aspect-16/10 bg-muted">
                  {status === 'valid' ? (
                    <img
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
                    <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground">
                      Cover
                    </span>
                  )}
                </div>
                <div className="grid gap-3 p-3">
                  <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                    Image URL {index + 1}
                    <Input
                      type="url"
                      value={field.url}
                      onChange={(event) => updateImageUrl(field.id, event.target.value)}
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
                        onClick={() => moveImage(index, -1)}
                        className="min-h-8 size-8 p-0 text-muted-foreground hover:bg-muted"
                      >
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        disabled={isBusy || index === imageFields.length - 1}
                        aria-label={`Move image ${index + 1} later`}
                        onClick={() => moveImage(index, 1)}
                        className="min-h-8 size-8 p-0 text-muted-foreground hover:bg-muted"
                      >
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        disabled={isBusy || imageFields.length === 1}
                        aria-label={`Remove image ${index + 1}`}
                        onClick={() => {
                          setImageFields((current) => current.filter((item) => item.id !== field.id))
                          setFormError(undefined);
                          resetFeeEstimate();
                        }}
                        className="min-h-8 size-8 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
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
            Campaign creation failed: {createCampaignError.message}
          </p>
        )}
        {receiptError && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Unable to confirm the transaction: {receiptError.message}
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
        {isConfirmed && receipt?.status === 'success' && (
          <p role="status" className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success" aria-live="polite">
            Campaign created successfully.
          </p>
        )}
        {isConfirmed && receipt?.status === 'reverted' && (
          <p role="alert" className="text-sm text-destructive">
            The campaign transaction reverted.
          </p>
        )}

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
      </form>

      <WalletConnectDialog open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
