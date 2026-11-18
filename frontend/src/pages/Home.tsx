import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { CampaignGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateMessage';
import {
  campaignCategories,
  filterCampaignListings,
  inferCampaignCategory,
  paginateItems,
  type CampaignCategory,
  type CampaignSortOption,
  type CampaignStatusFilter,
} from '@/lib/campaigns';
import { calculateBarPercentage, daysLeft, formatEth } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useReadContract } from 'wagmi';
import { crowdFundingAbi } from '../generated';

const contractAddress = import.meta.env.VITE_REACT_CONTRACT_ADDRESS;
const PAGE_SIZE = 9;
const statuses = ['all', 'active', 'ended', 'goal-reached'] as const;
const sortOptions = ['newest', 'oldest', 'most-funded', 'title'] as const;

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const search = (searchParams.get('q') ?? '').trim().toLocaleLowerCase();
  const requestedCategory = searchParams.get('category');
  const selectedCategory =
    requestedCategory === 'all' ||
    (requestedCategory !== null &&
      campaignCategories.includes(requestedCategory as CampaignCategory))
      ? requestedCategory
      : 'all';
  const requestedStatus = searchParams.get('status');
  const selectedStatus = statuses.includes(requestedStatus as CampaignStatusFilter)
    ? (requestedStatus as CampaignStatusFilter)
    : 'all';
  const requestedSort = searchParams.get('sort');
  const selectedSort = sortOptions.includes(requestedSort as CampaignSortOption)
    ? (requestedSort as CampaignSortOption)
    : 'newest';
  const requestedPage = Number(searchParams.get('page'));

  const campaigns = useMemo(
    () =>
      (campaignData ?? []).map((campaign, id) => ({
        campaign,
        id,
        category: inferCampaignCategory(campaign.title, campaign.description),
      })),
    [campaignData],
  );
  const filteredCampaigns = useMemo(
    () =>
      filterCampaignListings(campaigns, {
        search,
        category: selectedCategory,
        status: selectedStatus,
        sort: selectedSort,
      }),
    [campaigns, search, selectedCategory, selectedSort, selectedStatus],
  );

  const updateFilters = (updates: Record<string, string>) => {
    const nextParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== 'all' && value !== 'newest') nextParams.set(key, value);
      else nextParams.delete(key);
    }
    nextParams.delete('page');
    setSearchParams(nextParams, { replace: true });
  };

  const updatePage = (page: number) => {
    const nextParams = new URLSearchParams(searchParams);
    if (page > 1) nextParams.set('page', String(page));
    else nextParams.delete('page');
    setSearchParams(nextParams, { replace: true });
  };

  const heading = (
    <h1 className="font-epilogue text-4.5 text-foreground font-semibold">
      Discover Campaigns{campaignData !== undefined && ` (${campaignData.length})`}
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
            className="bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
          >
            Start a campaign
          </Link>
        </EmptyState>
      </div>
    );
  }

  const categoriesInUse = campaignCategories.filter((category) =>
    campaigns.some((item) => item.category === category),
  );
  const pagination = paginateItems(filteredCampaigns, requestedPage, PAGE_SIZE);
  console.log({pagination})
  const { page, totalPages: pageCount, items: pageCampaigns } = pagination;
  const hasFilters =
    search.length > 0 ||
    selectedCategory !== 'all' ||
    selectedStatus !== 'all' ||
    selectedSort !== 'newest';

  return (
    <div>
      {heading}
      <section
        aria-label="Campaign filters"
        className="border-border bg-card mt-5 grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(9rem,0.65fr))] lg:items-end"
      >
        <p className="text-muted-foreground text-sm sm:col-span-2 lg:col-span-1">
          Search instantly from the navigation bar, or narrow campaigns here.
        </p>
        <label className="text-muted-foreground grid gap-1.5 text-xs font-medium">
          Category
          <Select
            value={selectedCategory}
            onValueChange={(value) => updateFilters({ category: value })}
          >
            <SelectTrigger aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoriesInUse.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="text-muted-foreground grid gap-1.5 text-xs font-medium">
          Campaign status
          <Select
            value={selectedStatus}
            onValueChange={(value) => updateFilters({ status: value })}
          >
            <SelectTrigger aria-label="Filter by campaign status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="goal-reached">Goal reached</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="text-muted-foreground grid gap-1.5 text-xs font-medium">
          Sort by
          <Select value={selectedSort} onValueChange={(value) => updateFilters({ sort: value })}>
            <SelectTrigger aria-label="Sort campaigns">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="most-funded">Highest goal progress</SelectItem>
              <SelectItem value="title">Title A–Z</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'}
          {hasFilters ? ' found' : ' available'}
        </p>
        {hasFilters && (
          <button
            type="button"
            className="text-primary focus-visible:ring-ring rounded-md px-2 py-1 text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            onClick={() => {
              const nextParams = new URLSearchParams();
              setSearchParams(nextParams, { replace: true });
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {filteredCampaigns.length === 0 ? (
        <EmptyState
          title="No matching campaigns"
          description="Try another search, category, or status filter."
          className="mt-4"
        >
          <button
            type="button"
            className="bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
            onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
          >
            Clear search and filters
          </button>
        </EmptyState>
      ) : (
        <>
          <div
            id="campaign-grid"
            className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          >
            {pageCampaigns.map(({ campaign, id, category }) => (
              <CampaignCard
                key={id}
                id={id}
                category={category}
                title={campaign.title}
                description={campaign.description}
                image={campaign.image}
                owner={campaign.owner}
                target={campaign.target}
                amountCollected={campaign.amountCollected}
                deadline={campaign.deadline}
              />
            ))}
          </div>
          {pageCount > 1 && (
            <nav
              aria-label="Campaign pages"
              className="mt-8 flex flex-wrap items-center justify-center gap-4"
            >
              <button
                type="button"
                disabled={page <= 1}
                className="border-border text-foreground hover:bg-muted focus-visible:ring-ring flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => updatePage(page - 1)}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Previous
              </button>
              <span className="text-muted-foreground text-sm" aria-current="page">
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                disabled={page >= pageCount}
                className="border-border text-foreground hover:bg-muted focus-visible:ring-ring flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => updatePage(page + 1)}
              >
                Next
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

interface CampaignCardProps {
  id: number;
  category: CampaignCategory;
  title: string;
  description: string;
  image: string;
  owner: string;
  target: bigint;
  amountCollected: bigint;
  deadline: bigint;
}

function CampaignCard({
  id,
  category,
  title,
  description,
  image,
  owner,
  target,
  amountCollected,
  deadline,
}: CampaignCardProps) {
  const remainingDays = daysLeft(deadline);
  const progress = calculateBarPercentage(target, amountCollected);
  const goalReached = target > 0n && amountCollected >= target;
  const [imageFailed, setImageFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  return (
    <Link
      to={`/campaign-details/${id}`}
      aria-label={`View campaign: ${title}`}
      className="group border-border bg-card hover:border-primary/60 focus-visible:ring-ring flex w-full min-w-0 flex-col overflow-hidden rounded-xl border transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:outline-none motion-reduce:transform-none"
    >
      <div className="bg-muted relative aspect-16/10 w-full overflow-hidden">
        {image && !imageFailed ? (
          <img
            alt=""
            aria-hidden="true"
            src={image}
            onError={() => setImageFailed(true)}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
          />
        ) : (
          <div className="from-secondary to-muted text-muted-foreground flex size-full items-center justify-center bg-linear-to-br">
            <ImageOff className="size-9" aria-hidden="true" />
            <span className="sr-only">Campaign image unavailable</span>
          </div>
        )}
        <span className="border-border/70 bg-background/90 text-foreground absolute top-3 left-3 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur">
          {category}
        </span>
        {goalReached && (
          <span className="bg-success text-success-foreground absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-semibold">
            Goal reached
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="font-epilogue text-card-foreground line-clamp-1 text-base leading-6 font-semibold">
          {title}
        </h2>
        <p className="text-muted-foreground mt-1.5 line-clamp-2 min-h-10 text-sm leading-5">
          {description}
        </p>

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-soft-foreground text-sm font-semibold">
              {formatEth(amountCollected)} ETH{' '}
              <span className="text-muted-foreground font-normal">raised</span>
            </p>
            <p className="text-muted-foreground shrink-0 text-xs">of {formatEth(target)} ETH</p>
          </div>
          <div
            className="bg-muted mt-2 h-2 overflow-hidden rounded-full"
            role="progressbar"
            aria-label={`${title} funding progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-muted-foreground mt-1.5 flex justify-between text-xs">
            <span>{progress}% funded</span>
            <span>{remainingDays === null ? 'Ended' : `${remainingDays} days left`}</span>
          </div>
        </div>

        <div className="border-border mt-auto flex min-w-0 items-center gap-2.5 border-t pt-3.5">
          <div className="bg-secondary flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {!avatarFailed ? (
              <img
                src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${encodeURIComponent(owner)}`}
                alt=""
                aria-hidden="true"
                onError={() => setAvatarFailed(true)}
                className="size-full object-cover"
              />
            ) : (
              <span className="text-muted-foreground text-xs font-semibold" aria-hidden="true">
                {owner.slice(2, 4).toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-muted-foreground min-w-0 truncate text-xs">
            Created by <span className="text-soft-foreground font-medium">{owner}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
