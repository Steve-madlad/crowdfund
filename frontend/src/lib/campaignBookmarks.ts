export const CAMPAIGN_BOOKMARK_STORAGE_KEY = 'crowdfund:bookmarks:v1';

export function parseCampaignBookmarkIds(serialized: string | null): Set<number> {
  if (!serialized) return new Set();

  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return new Set();
  }

  if (!Array.isArray(value)) return new Set();
  return new Set(
    value.filter(
      (id): id is number => Number.isSafeInteger(id) && typeof id === 'number' && id >= 0,
    ),
  );
}
