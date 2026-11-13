import { money } from '@/assets';
import FormInput from '@/components/FormInput';
import Button from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { dateInputToDeadline } from '@/lib/utils';
import { parseEther } from 'viem';
import {
  useConnect,
  useConnection,
  useConnectors,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import loader from '../assets/loader.svg';
import { crowdFundingAbi } from '../generated';

const contractAddress = import.meta.env.VITE_REACT_CONTRACT_ADDRESS;

interface FormFieldsProps {
  title: string;
  description: string;
  target: string;
  deadline: string;
  imageURL: string;
}
export default function CreateCampaign() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [form, setForm] = useState<FormFieldsProps>({
    title: '',
    description: '',
    target: '',
    deadline: '',
    imageURL: '',
  });
  const [formError, setFormError] = useState<string>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((currentForm) => ({ ...currentForm, [e.target.name]: e.target.value }));
  };

  const [selectedConnector, setSelectedConnector] = useState<string>();
  const { address, isConnected } = useConnection();
  const {
    mutate: connectWallet,
    isPending: connectionLoading,
    error: connectionError,
  } = useConnect();
  const connectors = useConnectors();
  const {
    mutate: createCampaign,
    isPending: createCampaignLoading,
    error: createCampaignError,
  } = useWriteContract();

  const {
    refetch: refetchCampaigns,
  } = useReadContract({
    address: contractAddress,
    abi: crowdFundingAbi,
    functionName: 'getCampaigns',
  });

  const [hash, setHash] = useState<`0x${string}`>();
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(undefined);

    if (!isConnected || !address) {
      setIsModalOpen(true);
      return;
    }

    let target: bigint;
    let deadline: bigint;

    try {
      target = parseEther(form.target);
      deadline = dateInputToDeadline(form.deadline);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Enter a valid goal and end date.');
      return;
    }

    if (target <= 0n) {
      setFormError('The campaign goal must be greater than zero.');
      return;
    }

    if (!form.title.trim() || !form.description.trim() || !form.imageURL.trim()) {
      setFormError('Complete all required campaign fields.');
      return;
    }

    setHash(undefined);
    createCampaign(
      {
        address: contractAddress,
        abi: crowdFundingAbi,
        functionName: 'createCampaign',
        args: [
          address,
          form.title.trim(),
          form.description.trim(),
          target,
          deadline,
          form.imageURL.trim(),
        ],
      },
      { onSuccess: setHash },
    );
  };

  return (
    <div className="col-full-center rounded-lg bg-card p-4 sm:p-10">
      <div className="flex-center rounded-lg bg-muted p-4 sm:min-w-95">
        <h1 className="font-epilogue text-lg leading-9.5 font-bold text-card-foreground sm:text-2xl">
          Start a Campaign
        </h1>
      </div>
      <form onSubmit={handleSubmit} className="col mt-16 w-full gap-7">
        <FormInput
          name="title"
          value={form.title}
          onChange={handleChange}
          label="Campaign Title*"
          placeholder="Write a title"
          required
        />
        <FormInput
          name="description"
          value={form.description}
          onChange={handleChange}
          label="Story*"
          type="textarea"
          placeholder="I am fundraising because..."
          required
        />

        <div className="just-start min-h-30 w-full items-center rounded-lg bg-accent p-4">
          <img src={money} alt="money" className="size-10 object-contain" />
          <h4 className="font-epilogue text-6.25 ml-5 font-bold text-accent-foreground">
            You will get 100% of the raised amount!
          </h4>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row">
          <FormInput
            name="target"
            value={form.target}
            onChange={handleChange}
            label="Goal (ETH)*"
            placeholder="0.5"
            type="number"
            min="0"
            step="any"
            required
          />

          <FormInput
            name="deadline"
            value={form.deadline}
            onChange={handleChange}
            label="End Date*"
            type="date"
            required
          />

          <FormInput
            name="imageURL"
            value={form.imageURL}
            onChange={handleChange}
            label="Image URL*"
            placeholder="https://example.com/image.jpg"
            type="url"
            required
          />
        </div>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        {createCampaignError && (
          <p role="alert" className="text-sm text-destructive">
            Campaign creation failed: {createCampaignError.message}
          </p>
        )}
        {receiptError && (
          <p role="alert" className="text-sm text-destructive">
            Unable to confirm the transaction: {receiptError.message}
          </p>
        )}
        {isConfirmed && receipt?.status === 'success' && (
          <p role="status" className="text-sm text-success" aria-live="polite">
            Campaign created successfully.
          </p>
        )}
        {isConfirmed && receipt?.status === 'reverted' && (
          <p role="alert" className="text-sm text-destructive">
            The campaign transaction reverted.
          </p>
        )}

        <div className="just-start mt-10 items-center">
          <Button
            disabled={createCampaignLoading || isConfirming}
            className="flex-center w-full gap-3 bg-success text-success-foreground disabled:grayscale-60"
            aria-busy={createCampaignLoading || isConfirming}
            type="submit"
          >
            {createCampaignLoading
              ? 'Waiting for wallet...'
              : isConfirming
                ? 'Confirming transaction...'
                : 'Submit new campaign'}
            {(createCampaignLoading || isConfirming) && (
              <img alt="" aria-hidden="true" className="grayscale" width={35} src={loader} />
            )}
          </Button>
        </div>
      </form>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Connect your wallet</DialogTitle>
            <DialogDescription>
              Choose a wallet to connect before creating your campaign.
            </DialogDescription>
          </DialogHeader>
          {connectors.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {connectors.map((connector) => (
                <Button
                  key={connector.uid}
                  disabled={connectionLoading}
                  aria-busy={connectionLoading && connector.name === selectedConnector}
                  className="min-h-12 justify-start border border-border bg-secondary text-secondary-foreground hover:bg-muted"
                  onClick={() => {
                    setSelectedConnector(connector.name);
                    connectWallet(
                      { connector },
                      { onSuccess: () => setIsModalOpen(false) },
                    );
                  }}
                >
                  {connectionLoading && connector.name === selectedConnector
                    ? `Connecting to ${connector.name}...`
                    : `Connect with ${connector.name}`}
                  {connectionLoading && connector.name === selectedConnector && (
                    <img alt="" aria-hidden="true" className="ml-auto" width={28} src={loader} />
                  )}
                </Button>
              ))}
            </div>
          ) : (
            <p role="status" className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              No wallet connectors are available in this browser.
            </p>
          )}
          {connectionError && (
            <p role="alert" className="text-sm text-destructive">
              Wallet connection failed: {connectionError.message}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
