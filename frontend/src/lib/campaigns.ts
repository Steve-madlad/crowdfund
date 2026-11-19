import { daysLeft } from './utils.ts';

export const campaignCategories = [
  'Education',
  'Health',
  'Environment',
  'Community',
  'Arts',
  'Other',
] as const;

export type CampaignCategory = (typeof campaignCategories)[number];
export type CampaignStatusFilter = 'all' | 'active' | 'ended' | 'goal-reached' | 'cancelled';
export type CampaignSortOption = 'newest' | 'oldest' | 'most-funded' | 'title';

interface CampaignData {
  title: string;
  description: string;
  owner: string;
  target: bigint;
  amountCollected: bigint;
  deadline: bigint;
  cancelled?: boolean;
}

export interface CampaignListing<T extends CampaignData> {
  campaign: T;
  id: number;
  category: CampaignCategory;
}

export function filterCampaignListings<T extends CampaignData>(
  listings: readonly CampaignListing<T>[],
  filters: {
    search: string;
    category: string;
    status: CampaignStatusFilter;
    sort: CampaignSortOption;
    now?: number;
  },
): CampaignListing<T>[] {
  const search = filters.search.trim().toLocaleLowerCase();
  const filtered = listings.filter(({ campaign, category }) => {
    const matchesSearch =
      !search ||
      `${campaign.title} ${campaign.description} ${campaign.owner}`
        .toLocaleLowerCase()
        .includes(search);
    const matchesCategory = filters.category === 'all' || category === filters.category;
    const remainingDays = daysLeft(campaign.deadline, filters.now);
    const reachedGoal = campaign.target > 0n && campaign.amountCollected >= campaign.target;
    const matchesStatus =
      filters.status === 'all' ||
      (filters.status === 'cancelled' && campaign.cancelled === true) ||
      (campaign.cancelled !== true &&
        ((filters.status === 'active' && remainingDays !== null) ||
          (filters.status === 'ended' && remainingDays === null) ||
          (filters.status === 'goal-reached' && reachedGoal)));

    return matchesSearch && matchesCategory && matchesStatus;
  });

  switch (filters.sort) {
    case 'oldest':
      return filtered.sort((a, b) => a.id - b.id);
    case 'most-funded':
      return filtered.sort((a, b) => {
        const aProgress =
          a.campaign.target > 0n
            ? (a.campaign.amountCollected * 10_000n) / a.campaign.target
            : 0n;
        const bProgress =
          b.campaign.target > 0n
            ? (b.campaign.amountCollected * 10_000n) / b.campaign.target
            : 0n;
        if (aProgress !== bProgress) return aProgress > bProgress ? -1 : 1;
        return b.id - a.id;
      });
    case 'title':
      return filtered.sort((a, b) => a.campaign.title.localeCompare(b.campaign.title));
    case 'newest':
    default:
      return filtered.sort((a, b) => b.id - a.id);
  }
}

export function paginateItems<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number,
): { page: number; totalPages: number; items: T[] } {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError('pageSize must be a positive integer');
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, totalPages)
      : 1;

  return {
    page,
    totalPages,
    items: items.slice((page - 1) * pageSize, page * pageSize),
  };
}

const categoryKeywords: Record<Exclude<CampaignCategory, 'Other'>, RegExp> = {
  Education: /\b(educat(?:e|ion|ional)|school|student|scholarship|learn(?:ing)?)\b/gi,
  Health: /\b(health|medical|hospital|clinic|treatment|patient|wellness)\b/gi,
  Environment: /\b(environment|climate|clean water|water well|wildlife|conservation|solar|recycl(?:e|ing))\b/gi,
  Community: /\b(community|housing|shelter|food|family|families|village|local)\b/gi,
  Arts: /\b(art(?:ist|work)?|music|film|theater|culture|creative|museum)\b/gi,
};

export function inferCampaignCategory(title: string, description: string): CampaignCategory {
  const text = `${title} ${description}`;
  let bestCategory: CampaignCategory = 'Other';
  let bestScore = 0;

  for (const category of campaignCategories) {
    if (category === 'Other') continue;

    const matches = text.match(categoryKeywords[category]);
    const score = matches?.length ?? 0;

    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }

  return bestCategory;
}
