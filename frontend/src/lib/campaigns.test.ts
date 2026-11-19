import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterCampaignListings,
  inferCampaignCategory,
  paginateItems,
  type CampaignListing,
} from './campaigns.ts';

describe('inferCampaignCategory', () => {
  it('deterministically infers a category from campaign copy', () => {
    assert.equal(
      inferCampaignCategory(
        'Clean water for our village',
        'Help build a water well for the community.',
      ),
      'Environment',
    );
    assert.equal(
      inferCampaignCategory(
        'Community clinic',
        'Expand access to medical treatment and health services.',
      ),
      'Health',
    );
  });

  it('uses Other when the campaign copy has no category keywords', () => {
    assert.equal(inferCampaignCategory('A brighter tomorrow', 'Help us make it happen.'), 'Other');
  });
});

describe('paginateItems', () => {
  it('returns the requested slice and clamps pages outside the result range', () => {
    const items = Array.from({ length: 11 }, (_, index) => index);

    assert.deepEqual(paginateItems(items, 2, 9), {
      page: 2,
      totalPages: 2,
      items: [9, 10],
    });
    assert.deepEqual(paginateItems(items, 99, 9), {
      page: 2,
      totalPages: 2,
      items: [9, 10],
    });
  });

  describe('filterCampaignListings', () => {
    const now = 1_000_000_000_000;
    const campaign = (
      title: string,
      description: string,
      target: bigint,
      amountCollected: bigint,
      deadline: bigint,
      cancelled = false,
    ) => ({
      title,
      description,
      owner: '0xabc',
      target,
      amountCollected,
      deadline,
      cancelled,
    });
    const listings: CampaignListing<ReturnType<typeof campaign>>[] = [
      {
        id: 0,
        category: 'Education',
        campaign: campaign('School garden', 'Help students grow food.', 100n, 25n, 2_000_000_000n),
      },
      {
        id: 1,
        category: 'Health',
        campaign: campaign('Community clinic', 'Expand medical care.', 100n, 100n, 2_000_000_000n),
      },
      {
        id: 2,
        category: 'Arts',
        campaign: campaign('Music festival', 'Support local musicians.', 100n, 50n, 900_000_000n),
      },
      {
        id: 3,
        category: 'Community',
        campaign: campaign('Cancelled shelter', 'Support local families.', 100n, 20n, 2_000_000_000n, true),
      },
    ];

    it('combines case-insensitive search, category, and status filters', () => {
      const results = filterCampaignListings(listings, {
        search: 'SCHOOL',
        category: 'Education',
        status: 'active',
        sort: 'newest',
        now,
      });

      assert.deepEqual(results.map(({ id }) => id), [0]);
    });

    it('sorts by goal progress and filters ended and goal-reached campaigns', () => {
      const all = { search: '', category: 'all', status: 'all' as const, now };
      assert.deepEqual(
        filterCampaignListings(listings, { ...all, sort: 'most-funded' }).map(({ id }) => id),
        [1, 2, 0, 3],
      );
      assert.deepEqual(
        filterCampaignListings(listings, { ...all, status: 'ended', sort: 'newest' }).map(
          ({ id }) => id,
        ),
        [2],
      );
      assert.deepEqual(
        filterCampaignListings(listings, { ...all, status: 'goal-reached', sort: 'newest' }).map(
          ({ id }) => id,
        ),
        [1],
      );
      assert.deepEqual(
        filterCampaignListings(listings, { ...all, status: 'cancelled', sort: 'newest' }).map(
          ({ id }) => id,
        ),
        [3],
      );
      assert.deepEqual(
        filterCampaignListings(listings, { ...all, status: 'active', sort: 'newest' }).map(
          ({ id }) => id,
        ),
        [1, 0],
      );
    });
  });

  it('keeps empty results on a valid first page and rejects invalid page sizes', () => {
    assert.deepEqual(paginateItems([], 1, 9), {
      page: 1,
      totalPages: 1,
      items: [],
    });
    assert.throws(() => paginateItems([1], 1, 0), RangeError);
  });
});
