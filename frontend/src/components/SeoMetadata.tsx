import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://venti-fund.vercel.app';
const OG_IMAGE_URL = `${SITE_URL}/venti-OG.png`;
const DEFAULT_DESCRIPTION =
  'Venti is a Web3 crowdfunding platform to discover, create, and support community campaigns.';

const routeMetadata: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Venti | Discover community campaigns',
    description: DEFAULT_DESCRIPTION,
  },
  '/help': {
    title: 'Campaign rules and help | Venti',
    description:
      'Learn how Venti campaign contributions, withdrawals, cancellations, and refunds work.',
  },
  '/profile': {
    title: 'Your profile | Venti',
    description: 'Review your Venti campaign activity, contributions, and fundraising statistics.',
  },
  '/create-campaign': {
    title: 'Create a campaign | Venti',
    description: 'Start a Venti campaign with a clear goal, deadline, story, and images.',
  },
};

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
}

export default function SeoMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata =
      routeMetadata[pathname] ??
      (pathname.startsWith('/campaign-details/')
        ? {
            title: 'Campaign details | Venti',
            description: 'View campaign progress, contributions, and refund information on Venti.',
          }
        : {
            title: 'Page not found | Venti',
            description: DEFAULT_DESCRIPTION,
          });
    const canonicalUrl = `${SITE_URL}${pathname === '/' ? '/' : pathname}`;

    document.title = metadata.title;
    setMeta('name', 'description', metadata.description);
    setMeta('name', 'application-name', 'Venti');
    setMeta('name', 'robots', 'index,follow');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', metadata.title);
    setMeta('name', 'twitter:description', metadata.description);
    setMeta('name', 'twitter:image', OG_IMAGE_URL);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'Venti');
    setMeta('property', 'og:title', metadata.title);
    setMeta('property', 'og:description', metadata.description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', OG_IMAGE_URL);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.append(canonical);
    }
    canonical.href = canonicalUrl;
  }, [pathname]);

  return null;
}
