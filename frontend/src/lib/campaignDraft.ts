export const CAMPAIGN_DRAFT_STORAGE_KEY = 'crowdfund:create-campaign:draft';

export type CampaignSubmissionState =
  | 'draft'
  | 'wallet-requested'
  | 'request-error'
  | 'hash-received'
  | 'reverted';

export interface CampaignDraft {
  version: 1;
  form: {
    title: string;
    description: string;
    target: string;
    deadline: string;
  };
  imageUrls: string[];
  submissionState: CampaignSubmissionState;
  transactionHash?: `0x${string}`;
  accountAddress?: string;
  chainId?: number;
  updatedAt: number;
}

const submissionStates = new Set<CampaignSubmissionState>([
  'draft',
  'wallet-requested',
  'request-error',
  'hash-received',
  'reverted',
]);

export function parseCampaignDraft(serialized: string): CampaignDraft | null {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return null;
  }

  if (typeof value !== 'object' || value === null) return null;
  const draft = value as Partial<CampaignDraft>;
  if (
    draft.version !== 1 ||
    typeof draft.form !== 'object' ||
    draft.form === null ||
    typeof draft.form.title !== 'string' ||
    typeof draft.form.description !== 'string' ||
    typeof draft.form.target !== 'string' ||
    typeof draft.form.deadline !== 'string' ||
    !Array.isArray(draft.imageUrls) ||
    draft.imageUrls.length < 1 ||
    draft.imageUrls.length > 5 ||
    !draft.imageUrls.every((url) => typeof url === 'string') ||
    !submissionStates.has(draft.submissionState as CampaignSubmissionState) ||
    typeof draft.updatedAt !== 'number' ||
    !Number.isFinite(draft.updatedAt)
  ) {
    return null;
  }

  if (
    draft.transactionHash !== undefined &&
    (typeof draft.transactionHash !== 'string' ||
      !/^0x[0-9a-fA-F]{64}$/.test(draft.transactionHash))
  ) {
    return null;
  }

  if (
    draft.accountAddress !== undefined &&
    (typeof draft.accountAddress !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(draft.accountAddress))
  ) {
    return null;
  }

  if (
    draft.chainId !== undefined &&
    (typeof draft.chainId !== 'number' ||
      !Number.isSafeInteger(draft.chainId) ||
      draft.chainId <= 0)
  ) {
    return null;
  }

  if (draft.submissionState === 'hash-received' && !draft.transactionHash) return null;

  return draft as CampaignDraft;
}
