import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarizeProfile, type ProfileCampaignData } from './profile.ts';

const user = '0x0000000000000000000000000000000000000001';
const other = '0x0000000000000000000000000000000000000002';

describe('summarizeProfile', () => {
  it('calculates owned campaign, contribution, and unique supporter statistics', () => {
    const campaigns: ProfileCampaignData[] = [
      {
        owner: user,
        title: 'My campaign',
        image: 'https://example.com/my.png',
        target: 10n,
        amountCollected: 7n,
        donators: [other, other],
        donations: [3n, 4n],
      },
      {
        owner: other,
        title: 'Another campaign',
        image: 'https://example.com/other.png',
        target: 5n,
        amountCollected: 5n,
        donators: [user, user],
        donations: [1n, 2n],
      },
    ];

    const summary = summarizeProfile(campaigns, user.toUpperCase());

    assert.equal(summary.createdCampaigns.length, 1);
    assert.equal(summary.createdCampaigns[0]?.id, 0);
    assert.equal(summary.totalRaised, 7n);
    assert.equal(summary.totalDonated, 3n);
    assert.equal(summary.contributions.length, 2);
    assert.equal(summary.supportedCampaigns.length, 1);
    assert.equal(summary.supportedCampaigns[0]?.totalDonated, 3n);
    assert.equal(summary.supporterCount, 1);
  });

  it('returns empty profile metrics when the wallet has no activity', () => {
    const summary = summarizeProfile<ProfileCampaignData>([], user);

    assert.equal(summary.createdCampaigns.length, 0);
    assert.equal(summary.contributions.length, 0);
    assert.equal(summary.supportedCampaigns.length, 0);
    assert.equal(summary.totalRaised, 0n);
    assert.equal(summary.totalDonated, 0n);
    assert.equal(summary.supporterCount, 0);
  });
});
