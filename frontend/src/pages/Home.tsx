import { tagType } from '@/assets';
import { CampaignGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateMessage';
import { daysLeft, formatEth } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useReadContract } from 'wagmi';
import { crowdFundingAbi } from '../generated';

const contractAddress = import.meta.env.VITE_REACT_CONTRACT_ADDRESS;

export default function Home() {
  const {
    data: campaignData,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: contractAddress,
    abi: crowdFundingAbi,
    functionName: 'getCampaigns',
  });
  const heading = (
    <h1 className="font-epilogue text-4.5 font-semibold text-foreground">
      All Campaigns{campaignData !== undefined && ` (${campaignData.length})`}
    </h1>
  );

  if (error) {
    return (
      <div>
        {heading}
        <ErrorState
          title="Campaigns couldn't be loaded"
          description={error.message}
          onRetry={() => void refetch()}
          className="mt-5"
        />
      </div>
    );
  }

  if (isLoading || campaignData === undefined) {
    return (
      <div>
        {heading}
        <CampaignGridSkeleton />
      </div>
    );
  }

  if (campaignData.length === 0) {
    return (
      <div>
        {heading}
        <EmptyState
          title="No campaigns yet"
          description="Be the first to share a cause and invite the community to support it."
          className="mt-5"
        >
          <Link
            to="/create-campaign"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Start a campaign
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      {heading}
      <div
        id="campaign-grid"
        className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
      >
        {campaignData.map((campaign, index) => {
          const remainingDays = daysLeft(campaign.deadline);

          return (
            <Link
              to={`/campaign-details/${index}`}
              key={index}
              className="block min-w-0 w-full overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <img
                alt={campaign.title}
                src={campaign.image}
                className="h-39.5 w-full rounded-xl object-cover"
              />
              <div className="col p-4">
                <div className="align-center mb-4.5">
                  <img src={tagType} alt="tag" className="size-4.25 object-contain" />
                  <p className="font-epilogue mt-0.5 ml-3 text-xs font-medium text-muted-foreground">
                    Education
                  </p>
                </div>

                <div>
                  <h3 className="font-epilogue truncate text-base leading-6.5 font-semibold text-card-foreground">
                    {campaign.title}
                  </h3>
                  <p className="font-epilogue mt-1.25 truncate leading-4.5 font-normal text-muted-foreground">
                    {campaign.description}
                  </p>
                </div>

                <div className="just-between mt-3.5 flex-wrap gap-2">
                  <div className="col">
                    <h4 className="font-epilogue text-sm leading-5.5 font-semibold text-soft-foreground">
                      {formatEth(campaign.amountCollected)} ETH
                    </h4>
                    <p className="font-epilogue mt-0.75 truncate text-xs leading-4.5 font-normal text-muted-foreground sm:max-w-30">
                      Raised of {formatEth(campaign.target)} ETH
                    </p>
                  </div>

                  <div className="col">
                    <h4 className="font-epilogue text-sm leading-5.5 font-semibold text-soft-foreground">
                      {remainingDays ?? 'Ended'}
                    </h4>
                    <p className="font-epilogue mt-0.75 truncate text-xs leading-4.5 font-normal text-muted-foreground sm:max-w-30">
                      {remainingDays === null ? 'Campaign' : 'Days Left'}
                    </p>
                  </div>
                </div>

                <div className="align-center mt-5 gap-3">
                  <div className="flex-center size-7.5 overflow-hidden rounded-full">
                    <img
                      src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${campaign.owner}`}
                      alt="User"
                      className="object-contain"
                    />
                  </div>
                  <p className="font-epilogue flex-1 truncate text-xs font-normal text-muted-foreground">
                    <span className="text-soft-foreground">{campaign.owner}</span>
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
