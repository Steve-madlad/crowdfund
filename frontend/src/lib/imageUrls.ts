export const MAX_CAMPAIGN_IMAGES = 5;
export const MAX_IMAGE_URL_BYTES = 512;

export function normalizeHttpsImageUrl(value: string): string {
  const trimmed = value.trim();
  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new RangeError('Enter a valid image URL.');
  }

  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    throw new RangeError('Image URLs must use HTTPS and cannot contain credentials.');
  }

  const normalized = url.toString();
  if (new TextEncoder().encode(normalized).length > MAX_IMAGE_URL_BYTES) {
    throw new RangeError(`Image URLs must be ${MAX_IMAGE_URL_BYTES} bytes or fewer.`);
  }

  return normalized;
}

export function verifyImageUrl(value: string): Promise<boolean> {
  let normalized: string;

  try {
    normalized = normalizeHttpsImageUrl(value);
  } catch {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const timeout = setTimeout(() => finish(false), 12_000);

    const finish = (isValid: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      resolve(isValid);
    };

    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    image.onerror = () => finish(false);
    image.src = normalized;

    if (image.complete) {
      finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    }
  });
}
