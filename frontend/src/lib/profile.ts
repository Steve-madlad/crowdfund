export interface ProfileCampaignData {
  owner: string;
  title: string;
  image: string;
  target: bigint;
  amountCollected: bigint;
  donators: readonly string[];
  donations: readonly bigint[];
}

export interface ProfileCampaign<T extends ProfileCampaignData> {
  id: number;
  campaign: T;
}

export interface ProfileContribution {
  campaignId: number;
  campaignTitle: string;
  campaignImage: string;
  amount: bigint;
}

export interface SupportedCampaign {
  id: number;
  title: string;
  image: string;
  totalDonated: bigint;
  contributionCount: number;
}

export interface ProfileSummary<T extends ProfileCampaignData> {
  createdCampaigns: ProfileCampaign<T>[];
  contributions: ProfileContribution[];
  supportedCampaigns: SupportedCampaign[];
  totalRaised: bigint;
  totalDonated: bigint;
  supporterCount: number;
}

export function summarizeProfile<T extends ProfileCampaignData>(
  campaigns: readonly T[],
  address: string,
): ProfileSummary<T> {
  const normalizedAddress = address.toLowerCase();
  const createdCampaigns = campaigns.flatMap((campaign, id) =>
    campaign.owner.toLowerCase() === normalizedAddress ? [{ id, campaign }] : [],
  );
  const contributions: ProfileContribution[] = [];
  const supportedCampaigns = new Map<number, SupportedCampaign>();

  campaigns.forEach((campaign, campaignId) => {
    const contributionLength = Math.min(campaign.donators.length, campaign.donations.length);
    for (let index = 0; index < contributionLength; index++) {
      if (campaign.donators[index]?.toLowerCase() !== normalizedAddress) continue;

      const amount = campaign.donations[index];
      if (amount === undefined) continue;
      contributions.push({
        campaignId,
        campaignTitle: campaign.title,
        campaignImage: campaign.image,
        amount,
      });

      const existing = supportedCampaigns.get(campaignId);
      supportedCampaigns.set(campaignId, {
        id: campaignId,
        title: campaign.title,
        image: campaign.image,
        totalDonated: (existing?.totalDonated ?? 0n) + amount,
        contributionCount: (existing?.contributionCount ?? 0) + 1,
      });
    }
  });

  const ownedSupporters = new Set(
    createdCampaigns.flatMap(({ campaign }) =>
      campaign.donators.map((donator) => donator.toLowerCase()),
    ),
  );

  return {
    createdCampaigns,
    contributions,
    supportedCampaigns: [...supportedCampaigns.values()],
    totalRaised: createdCampaigns.reduce(
      (total, { campaign }) => total + campaign.amountCollected,
      0n,
    ),
    totalDonated: contributions.reduce((total, contribution) => total + contribution.amount, 0n),
    supporterCount: ownedSupporters.size,
  };
}
