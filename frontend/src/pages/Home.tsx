import { tagType } from '@/assets';
import { daysLeft } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { useReadContract } from 'wagmi';
import { crowdFundingAbi } from '../generated';

const contractAddress = import.meta.env.VITE_REACT_CONTRACT_ADDRESS;

export default function Home() {
  const { data: campaignData } = useReadContract({
    address: contractAddress,
    abi: crowdFundingAbi,
    functionName: 'getCampaigns',
  });

  console.log({ campaignData });

  const { data: campaignCountData } = useReadContract({
    address: contractAddress,
    abi: crowdFundingAbi,
    functionName: 'numberOfCampaigns',
  });

  const navigate = useNavigate();
  type Campaign = NonNullable<typeof campaignData>[number];
  const handleNavigate = (campaign: Campaign, id: number) => {
    navigate(`/campaign-details/${campaign.title}`, { state: { ...campaign, id } });
  };

  return (
    <div>
      {campaignCountData && campaignCountData > 0 && (
        <h1 className="font-epilogue text-4.5 font-semibold text-white">
          All Campaigns{campaignCountData}
        </h1>
      )}
      <div className="mt-5 flex flex-wrap gap-6.5">
        {campaignData?.map((campaign, index) => {
          return (
            <div
              onClick={() => handleNavigate(campaign, index)}
              key={index}
              className="pointer w-full rounded-xl bg-[#1c1c24] sm:w-[288px]"
            >
              <img
                alt={campaign.title}
                src={campaign.image}
                className="h-39.5 w-full rounded-xl object-cover"
              />
              <div className="col p-4">
                <div className="align-center mb-4.5">
                  <img src={tagType} alt="tag" className="size-4.25 object-contain" />
                  <p className="font-epilogue mt-0.5 ml-3 text-xs font-medium text-[#808191]">
                    Education
                  </p>
                </div>

                <div>
                  <h3 className="font-epilogue truncate text-base leading-6.5 font-semibold text-white">
                    {campaign.title}
                  </h3>
                  <p className="font-epilogue mt-1.25 truncate leading-4.5 font-normal text-[#808191]">
                    {campaign.description}
                  </p>
                </div>

                <div className="just-between mt-3.5 flex-wrap gap-2">
                  <div className="col">
                    <h4 className="font-epilogue text-sm leading-5.5 font-semibold text-[#b2b3bd]">
                      {campaign.amountCollected}
                    </h4>
                    <p className="font-epilogue mt-0.75 truncate text-xs leading-4.5 font-normal text-[#808191] sm:max-w-30">
                      Raised of {formatEther(BigInt(campaign.target))}
                    </p>
                  </div>

                  <div className="col">
                    <h4 className="font-epilogue text-sm leading-5.5 font-semibold text-[#b2b3bd]">
                      {daysLeft(String(campaign.deadline))}
                    </h4>
                    <p className="font-epilogue mt-0.75 truncate text-xs leading-4.5 font-normal text-[#808191] sm:max-w-30">
                      Days Left
                    </p>
                  </div>
                  {/* <p>{new Date(Number(campaign.deadline) * 1000).toDateString()}</p> */}
                </div>

                <div className="align-center mt-5 gap-3">
                  <div className="flex-center size-7.5 overflow-hidden rounded-full">
                    <img
                      src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${campaign.owner}`}
                      alt="User"
                      className="object-contain"
                    />
                  </div>
                  <p className="font-epilogue flex-1 truncate text-xs font-normal text-[#808191]">
                    <span className="text-[#b2b2bd]">{campaign.owner}</span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
