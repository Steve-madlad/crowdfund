import Button from '@/components/ui/Button';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { parseEther } from 'viem';
import { useConnection, useReadContract, useWriteContract } from 'wagmi';
import { crowdFundingAbi } from '../generated';

const contractAddress = import.meta.env.VITE_REACT_CONTRACT_ADDRESS;

export default function CampiagnDetails() {
  const { state } = useLocation();
  console.log({ state });
  const [donationAmount, setDonationAmount] = useState<string>();
  const [donators, setDonators] = useState<Array<string>>([]);

  const remainingDays = '2';
  // const remainingDays = state?.deadline ? daysLeft(state?.deadline) : '2' ;

  const { address } = useConnection();
  const { data, isLoading, isSuccess } = useReadContract({
    abi: crowdFundingAbi,
    address: contractAddress,
    functionName: 'getDonators',
  });

  const { mutateAsync: donate, data: hash, isPending, error } = useWriteContract();
  console.log({ data });

  useEffect(() => {
    if (isSuccess) {
      let donations = [];

      for (let i = 0; i < data.length; i++) {
        if (data[i] === state?.address) {
          donations.push({ donator: data[i] });
        }
      }
    }
  }, [isSuccess]);

  const handleDonation = async () => {
    if (donationAmount && +donationAmount > 0) {
      await donate({
        address: contractAddress,
        abi: crowdFundingAbi,
        functionName: 'donateToCampaign',
        args: [BigInt(state?.id)],
        value: parseEther(donationAmount),
      });
    }
  };

  return (
    <div>
      <div className="col mt-10 w-full gap-7.5 md:flex-row!">
        <div className="col flex-1">
          <img
            src={state?.image}
            alt="campaign"
            className="h-102.5 w-full rounded-xl object-cover"
          />
          <div className="relative mt-2 h-1.25 w-full bg-[#3a3a43]">
            <div
              className="absolute h-full max-w-full bg-[#4acd8d]"
              // style={{ width: `${calculateBarPercentage(state?.target, state?.amountCollected)}%` }}
            ></div>
          </div>
        </div>
        <div className="just-between w-full flex-wrap gap-7.5 md:w-37.5">
          <CountBox title="Days Left" value={remainingDays}></CountBox>
          <CountBox title={`Raised of ${state?.target}`} value={state?.amountCollected}></CountBox>
          <CountBox title="Total Backers" value={String(donators.length)}></CountBox>
        </div>
      </div>

      <div className="col flex-2 gap-10 text-white">
        <div>
          <h4 className="font-epilogue text-xl font-semibold text-white uppercase">Creator</h4>
          <div className="align-center mt-5 flex-wrap gap-3.5">
            <div className="flex-center cursor size-13 rounded-full bg-[#2c2f32]">
              <img
                src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${address}`}
                alt="user"
                className="size-3/5 object-contain"
              />
            </div>
            <div>
              <h4 className="font-epilogue text-sm font-semibold break-all text-white">
                {state?.owner}
              </h4>
              <p className="font-epilogue mt-1 text-xs font-normal text-[#808191]">Campaigns</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-epilogue text-xl font-semibold text-white uppercase">Story</h4>
          <div className="mt-2">
            <p className="font-epilogue text-808191 leading-6-5 text-justify text-lg font-normal">
              {state?.description}
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-epilogue text-xl font-semibold text-white uppercase">Donators</h4>
          <div className="col mt-2 mb-5 gap-4">
            {donators.length > 0 ? (
              donators.map((donator, index) => <div key={index}>{donator}</div>)
            ) : (
              <p className="font-epilogue text-808191 leading-6-5 text-justify text-lg font-normal">
                No donators yet be the first one
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h4 className="font-epilogue text-xl font-semibold text-white uppercase">Funding</h4>
        <div className="col mt-5 rounded-lg bg-[#1c1c24] p-4">
          <p className="font-epilogue text-cecnter text-xl leading-7.5 font-medium text-[#808191]">
            Fund the campaign
          </p>
          <div className="mt-4">
            <label htmlFor="eth">
              <span className="font-epilogue mb-2.5 text-sm leading-5.5 font-medium text-[#808191]">
                ETH
              </span>
              <input
                type="number"
                id="eth"
                className="font-epilogue placehodler:text-[#4b5264] w-full rounded-lg border border-[#3a3a43] bg-transparent px-3.75 py-2.5 text-xl leading-7.5 text-white outline-none sm:px-5"
                placeholder="ETH 0.1"
                step="0.01"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
              />
            </label>
            <div className="my-5 rounded-xl bg-[#13131a] p-4">
              <h4 className="font-epilogue text-base leading-5.5 font-semibold text-white">
                Back it because you believe in it.
              </h4>
              <p className="font-epilogue leading 5.5 mt-5 font-normal text-[#808191]">
                Support the project for no reward, just because it speaks to you.
              </p>
            </div>

            <Button className="w-full bg-[#8c6dfd]" onClick={handleDonation}>
              Fund Campaign
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
      <h4 className="font-epilogue text-7.5 w-full truncate rounded-t-lg bg-[#1c1c24] p-3 text-center font-bold text-white">
        {value}
      </h4>
      <p className="font-epilogue w-full rounded-b-lg bg-[#28282e] px-3 py-2 text-center text-lg font-normal text-[#808191]">
        {title}
      </p>
    </div>
  );
}
