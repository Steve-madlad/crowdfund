import { useState } from 'react';

const fallbackImage = '/donation.webp';

interface CampaignImageProps {
  src?: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}

export default function CampaignImage({
  src,
  alt,
  className,
  loading = 'lazy',
}: CampaignImageProps) {
  const [failedSource, setFailedSource] = useState<string>();
  const source = src?.trim() || undefined;
  if (!source) {
    return <span aria-hidden="true" className="block size-full bg-muted" />;
  }
  const isFallback = failedSource === source;

  return (
    <img
      src={isFallback ? fallbackImage : source}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => {
        if (!isFallback && source) setFailedSource(source);
      }}
    />
  );
}
