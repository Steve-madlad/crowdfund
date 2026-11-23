import { logo, menu, search } from '@/assets';
import AccountMenu from '@/components/AccountMenu';
import WalletConnectDialog from '@/components/WalletConnectDialog';
import { navlinks } from '@/lib/constants';
import cn from '@/lib/utils';
import { formatWeb3Error } from '@/lib/web3Errors';
import { crowdFundingAbi } from '@/generated';
import { useTheme } from '@/providers/useTheme';
import CampaignImage from '@/components/CampaignImage';
import { Moon, Sun } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useConnection, useDisconnect, useReadContract } from 'wagmi';
import { Icon } from './Sidebar';
import Button from './ui/Button';
import { Input } from './ui/Input';

const contractAddress = import.meta.env.VITE_REACT_CONTRACT_ADDRESS;

export default function Navbar() {
  const [toggleDrawer, setToggleDrawer] = useState<boolean>(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState<{ pathname: string; value: string }>({
    pathname: '',
    value: '',
  });
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isHome = location.pathname === '/';
  const {
    data: searchableCampaigns,
    isLoading: searchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = useReadContract({
    address: contractAddress,
    abi: crowdFundingAbi,
    functionName: 'getCampaigns',
    query: { enabled: !isHome },
  });
  const { connector, isConnected, isConnecting } = useConnection();
  const { mutate: disconnect, isPending: disconnectPending } = useDisconnect();
  const { resolvedTheme, setTheme } = useTheme();
  const isActive = (link: string) => {
    if (location.pathname.startsWith('/campaign-details/')) return link === '/';
    const [pathname, query] = link.split('?');
    if (link === '/' && new URLSearchParams(location.search).has('bookmarked')) return false;
    return (
      location.pathname === pathname &&
      (!query || new URLSearchParams(location.search).get('bookmarked') === '1')
    );
  };
  const handleDisconnect = () => {
    if (!connector) {
      toast.error('There is no connected wallet to disconnect.');
      return;
    }

    disconnect(
      { connector },
      {
        onSuccess: () => toast.success('Wallet disconnected from this app.'),
        onError: (error) => toast.error(`Could not disconnect wallet: ${formatWeb3Error(error)}`),
      },
    );
  };
  const handleThemeToggle = () => {
    try {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your theme preference.');
    }
  };
  const handleCreateClick = () => {
    if (isConnected) {
      navigate('/create-campaign');
    } else {
      setToggleDrawer(false);
      setWalletDialogOpen(true);
    }
  };
  const searchValue = isHome
    ? searchParams.get('q') ?? ''
    : localSearch.pathname === location.pathname
      ? localSearch.value
      : '';
  const searchResults = useMemo(() => {
    const query = searchValue.trim().toLocaleLowerCase();
    if (!query) return [];
    return (searchableCampaigns ?? [])
      .map((campaign, id) => ({ campaign, id }))
      .filter(({ campaign }) =>
        `${campaign.title} ${campaign.description}`.toLocaleLowerCase().includes(query),
      )
      .slice(0, 5);
  }, [searchValue, searchableCampaigns]);
  const handleSearchChange = (value: string) => {
    if (!isHome) {
      setLocalSearch({ pathname: location.pathname, value });
      setSearchFocused(true);
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set('q', value);
    else nextParams.delete('q');
    nextParams.delete('page');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <>
      <div className="mb-8.75 flex flex-col-reverse justify-between gap-6 sm:mt-6 md:flex-row lg:mt-2">
        <div className="relative z-0 mx-4 flex h-13 flex-row rounded-full border border-border bg-card py-1.5 pr-2 pl-4 focus-within:border-success focus-within:ring-2 focus-within:ring-success focus-within:ring-offset-2 focus-within:ring-offset-background md:max-w-md lg:mx-0 lg:flex-1">
          <Input
            type="search"
            aria-label="Search campaigns"
            aria-autocomplete={isHome ? 'none' : 'list'}
            aria-expanded={!isHome && searchFocused && Boolean(searchValue.trim())}
            aria-controls={!isHome ? 'campaign-search-results' : undefined}
            className="h-full flex-1 rounded-full border-0 bg-transparent px-0 py-0 font-epilogue text-sm font-normal shadow-none focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Search for campaigns"
            value={searchValue}
            onChange={(event) => handleSearchChange(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setSearchFocused(false), 160)}
          />
          <div aria-hidden="true" className="flex-center h-full w-14 rounded-full bg-primary">
            <img src={search} alt="" aria-hidden="true" className="size-3.75 object-contain" />
          </div>
          {!isHome && searchFocused && searchValue.trim() && (
            <div
              id="campaign-search-results"
              role="listbox"
              aria-label="Campaign search results"
              className="absolute z-1 top-full right-0 left-0 mt-2 overflow-hidden rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl"
            >
              {searchLoading ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">Searching campaigns…</p>
              ) : searchError ? (
                <div role="alert" className="flex items-center justify-between gap-3 px-3 py-4">
                  <p className="text-sm text-destructive">
                    Campaign search is unavailable: {formatWeb3Error(searchError)}
                  </p>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void refetchSearch()}
                    className="shrink-0 rounded px-2 py-1 text-sm font-semibold text-primary hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    Retry
                  </button>
                </div>
              ) : searchResults.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">No matching campaigns.</p>
              ) : (
                <ul>
                  {searchResults.map(({ campaign, id }) => (
                    <li key={id}>
                      <Link
                        role="option"
                        aria-selected={false}
                        to={`/campaign-details/${id}`}
                        onClick={() => setSearchFocused(false)}
                        className="flex min-w-0 items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                      >
                        <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <CampaignImage
                            src={campaign.image}
                            alt=""
                            className="size-full object-cover"
                          />
                        </div>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {campaign.title}
                          </span>
                          <span className="mt-1 block line-clamp-3 text-xs text-muted-foreground">
                            {campaign.description}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="hidden justify-end gap-4 sm:flex px-3">
          <Button
            type="button"
            onClick={handleCreateClick}
            disabled={isConnecting}
            aria-busy={isConnecting}
            className={cn(
              isConnected
                ? 'bg-success text-success-foreground'
                : 'bg-brand-purple text-brand-purple-foreground',
            )}
          >
            {isConnecting
              ? 'Connecting...'
              : isConnected
                ? 'Create a campaign'
                : 'Connect'}
          </Button>

          <AccountMenu
            onRequestConnect={() => setWalletDialogOpen(true)}
            className="size-13 rounded-md"
          />
        </div>

        {/* Small Screen Menu */}
        <div className="flex-between relative z-20 sm:hidden!">
          <div className="flex-between relative z-20 w-full overflow-hidden bg-background p-4">
            <div className="flex-center cursor size-10 overflow-hidden rounded-md bg-secondary">
              <Link to="/">
                <Icon className="size-13 bg-secondary" imgUrl={logo} />
              </Link>
            </div>
            <div className="flex-center gap-5">
              <AccountMenu
                onRequestConnect={() => setWalletDialogOpen(true)}
                className="size-9.5 rounded-md"
              />
              <button
                type="button"
                aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
                aria-pressed={resolvedTheme === 'dark'}
                onClick={handleThemeToggle}
                className="flex-center size-9.5 rounded-md border border-border bg-card text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="size-4.5" aria-hidden="true" />
                ) : (
                  <Moon className="size-4.5" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                aria-label={toggleDrawer ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={toggleDrawer}
                aria-controls="mobile-navigation"
                onClick={() => setToggleDrawer(!toggleDrawer)}
              >
                <img src={menu} alt="" aria-hidden="true" className="cursor size-8 object-contain" />
              </button>
            </div>
          </div>

          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            aria-hidden={!toggleDrawer}
            inert={!toggleDrawer}
            className={`shadow-secondary ${!toggleDrawer ? 'translate-y-[-100vh]' : 'translate-y-3.5'} absolute top-15 right-0 left-0 z-10 rounded-md bg-card duration-700`}
          >
            <ul className="mb-4">
              {navlinks.map((link) => (
                <li key={link.name}>
                  <button
                    type="button"
                    aria-current={isActive(link.link) ? 'page' : undefined}
                    disabled={link.name === 'logout' && (!isConnected || disconnectPending)}
                    className={cn(
                      'flex w-full items-center p-4 text-left capitalize',
                      isActive(link.link) && 'bg-muted',
                    )}
                    onClick={() => {
                      setToggleDrawer(false);
                      if (link.name === 'logout') {
                        handleDisconnect();
                      } else {
                        const [pathname, query] = link.link.split('?');
                        navigate({ pathname, search: query ? `?${query}` : '' });
                      }
                    }}
                  >
                    <link.icon className="size-6" aria-hidden="true" />
                    <span
                      className={`font-epilogue text-sm ${isActive(link.link) ? 'text-success' : 'text-muted-foreground'} ml-5 font-semibold`}
                    >
                      {link.name === 'logout' ? 'Disconnect wallet' : link.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex-mx-4">
              <Button
                type="button"
                onClick={handleCreateClick}
                disabled={isConnecting}
                aria-busy={isConnecting}
                className={cn(
                  isConnected
                    ? 'bg-success text-success-foreground'
                    : 'bg-brand-purple text-brand-purple-foreground',
                  'w-full',
                )}
              >
                {isConnecting
                  ? 'Connecting...'
                  : isConnected
                    ? 'Create a campaign'
                    : 'Connect'}
              </Button>
            </div>
          </nav>
        </div>
      </div>
      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
}
