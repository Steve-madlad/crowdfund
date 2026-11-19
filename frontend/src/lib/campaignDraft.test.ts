import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCampaignDraft, type CampaignDraft } from './campaignDraft.ts';

describe('parseCampaignDraft', () => {
  const validDraft: CampaignDraft = {
    version: 1,
    form: {
      title: 'Community garden',
      description: 'A garden for the neighborhood.',
      target: '0.5',
      deadline: '2027-01-01',
    },
    imageUrls: ['https://example.com/garden.jpg', ''],
    submissionState: 'hash-received',
    transactionHash: `0x${'a'.repeat(64)}`,
    accountAddress: `0x${'b'.repeat(40)}`,
    chainId: 31337,
    updatedAt: 1_800_000_000_000,
  };

  it('restores a valid form draft and its last known submission metadata', () => {
    assert.deepEqual(parseCampaignDraft(JSON.stringify(validDraft)), validDraft);
  });

  it('rejects malformed, unsupported, or unsafe draft data', () => {
    assert.equal(parseCampaignDraft('{'), null);
    assert.equal(parseCampaignDraft(JSON.stringify({ ...validDraft, version: 2 })), null);
    assert.equal(
      parseCampaignDraft(JSON.stringify({ ...validDraft, transactionHash: 'pending' })),
      null,
    );
    assert.equal(
      parseCampaignDraft(JSON.stringify({ ...validDraft, imageUrls: Array(6).fill('') })),
      null,
    );
  });
});
