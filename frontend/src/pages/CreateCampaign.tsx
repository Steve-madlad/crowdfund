import { money } from '@/assets';
import FormInput from '@/components/FormInput';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useEffect, useState } from 'react';
import { parseEther } from 'viem';
import {
  useChainId,
  useConnect,
  useConnection,
  useConnectors,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { crowdFundingAbi } from '../generated';
import loader from '../assets/loader.svg';

const contractAddress = '0x2279b7a0a67db372996a5fab50d91eaa73d2ebe6'

interface FormFieldsProps {
  name: string;
  title: string;
  description: string;
  target: string;
  deadline: string;
  imageURL: string;
}
export default function CreateCampaign() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [form, setform] = useState<FormFieldsProps>({
    name: '',
    title: '',
    description: '',
    target: '',
    deadline: '',
    imageURL: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setform({ ...form, [e.target.name]: e.target.value });
  };

  const [selectedConnector, setSelectedConnector] = useState<string>();
  const { address, isConnected, isDisconnected } = useConnection();
  const {
    mutate: connectWallet,
    isPending: connectionLoading,
    error: connectionError,
    isSuccess: connectionSuccess,
  } = useConnect();
  const connectors = useConnectors();
  const {
    mutateAsync: createCampaign,
    isPending: createCampaignLoading,
    error: createCampaignError,
    isSuccess: createCampaignSuccess,
  } = useWriteContract();

  const {
    data: campaignData,
    isLoading: campaignsLoading,
    status,
    error: campaignsError,
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
  } = useWaitForTransactionReceipt({ hash });

  const chainId = useChainId();

  console.log({ chainId });
  console.log({
    receipt,
    transactionStatus: receipt?.status,
  });

  const publicClient = usePublicClient();

  useEffect(() => {
    if (isConfirmed) {
      refetchCampaigns();
    }
  }, [isConfirmed, refetchCampaigns]);

  console.log({
    campaignData,
    campaignsError,
    status,
    campaignsLoading,
  });

  const handleSubmit = async (e?: React.SubmitEvent<HTMLFormElement>) => {
    e?.preventDefault();
    console.log('submitting');
    if ((!connectionSuccess && !isConnected) || !address) {
      console.log('submitting');
      return setIsModalOpen(true);
    }
    console.log('submitting');
    setIsLoading(true);
    console.log('success', form);

    const [year, month, day] = form.deadline.split('-').map(Number);
    const deadline = BigInt(Math.floor(new Date(year, month - 1, day).getTime() / 1000));
    const hash = await createCampaign({
      address: contractAddress,
      abi: crowdFundingAbi,
      functionName: 'createCampaign',
      args: [
        address,
        form.name,
        form.description,
        parseEther(form.target),
        deadline,
        'https://picsum.photos/200/300',
      ],
    });
    setHash(hash);
    console.log('Transaction hash:', hash);

    // try {
    //   await publicClient?.simulateContract({
    //     account: address,
    //     address: contractAddress,
    //     abi: crowdFundingAbi,
    //     functionName: 'createCampaign',
    //     args: [
    //       address,
    //       form.name,
    //       form.description,
    //       parseEther(form.target),
    //       deadline,
    //       'https://picsum.photos/200/300',
    //     ],
    //   });

    //   console.log('Simulation successful');
    // } catch (error) {
    //   console.error('Simulation failed:', error);
    // }
  };

  // console.log({ isConnected, isDisconnected, connectionLoading });
  // console.log({ connectionError });
  useEffect(() => {
    if (connectionSuccess) {
      setIsModalOpen(false);
      handleSubmit();
    }
  }, [connectionSuccess]);

  return (
    <div className="col-full-center rounded-lg bg-[#1c1c24] p-4 sm:p-10">
      {isLoading && 'Loader...'}
      <div className="flex-center rounded-lg bg-[#3a3a43] p-4 sm:min-w-95">
        <h1 className="font-epilogue text-lg leading-9.5 font-bold text-white sm:text-2xl">
          Start a Campaign
        </h1>
      </div>
      <form onSubmit={handleSubmit} className="col mt-16 w-full gap-7">
        <div className="flex flex-col gap-5 md:flex-row">
          <FormInput
            name="name"
            value={form.name}
            onChange={(e) => handleChange(e)}
            label="Your Name*"
            placeholder="John Doe"
            required
          />
          <FormInput
            name="title"
            value={form.title}
            onChange={(e) => handleChange(e)}
            label="Campaign Title*"
            placeholder="Write a title"
            required
          />
        </div>
        <FormInput
          name="description"
          value={form.description}
          onChange={(e) => handleChange(e)}
          label="Story*"
          type="textarea"
          placeholder="I am fundraising because..."
          required
        />

        <div className="just-start h-30 w-full items-center rounded-lg bg-[#8c6dfd] p-4">
          <img src={money} alt="money" className="size-10 object-contain" />
          <h4 className="font-epilogue text-6.25 ml-5 font-bold text-white">
            You will get 100% of the raised amount!
          </h4>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row">
          <FormInput
            name="target"
            value={form.target}
            onChange={(e) => handleChange(e)}
            label="Goal*"
            placeholder="John Doe"
            type="number"
            required
          />

          <FormInput
            name="deadline"
            value={String(form.deadline)}
            onChange={(e) => handleChange(e)}
            label="End Date*"
            type="date"
            required
          />

          <FormInput
            name="imageURL"
            value={form.imageURL}
            onChange={(e) => handleChange(e)}
            label="Image URL*"
            placeholder="https://example.com"
            type="url"
            required
          />
        </div>

        <div className="just-start mt-10 items-center">
          <Button
            disabled={createCampaignLoading}
            className="flex-center w-full gap-3 bg-[#1dc071] disabled:cursor-default disabled:grayscale-60"
            type="submit"
          >
            Submit new campaign
            {createCampaignLoading && (
              <img alt="loader" className="grayscale" width={35} src={loader} />
            )}
          </Button>
        </div>
      </form>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ariaLabel="Start a Campaign"
        contentStyle={{ maxWidth: '64rem' }}
      >
        <div>
          <h1>Connect your wallet</h1>
          <div className="flex gap-5">
            {connectors.map((connector) => (
              <Button
                key={connector.uid}
                disabled={connectionLoading}
                className="flex-center gap-2 rounded-md bg-white px-5 text-black"
                onClick={() => {
                  setSelectedConnector(connector.name);
                  connectWallet({ connector });
                }}
              >
                Connect {connector.name}
                {connectionLoading && connector.name === selectedConnector && (
                  <img alt="loader" width={35} src={loader} />
                )}
              </Button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
