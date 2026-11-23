const DICEBEAR_AVATAR_URL = 'https://api.dicebear.com/10.x/bottts-neutral/svg';

export function getWalletAvatarUrl(address?: string): string {
  const seed = address?.trim().toLowerCase() || 'venti-user';
  return `${DICEBEAR_AVATAR_URL}?seed=${encodeURIComponent(seed)}`;
}
