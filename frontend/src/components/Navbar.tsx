import { logo, menu, search } from '@/assets';
import AccountMenu from '@/components/AccountMenu';
import WalletConnectDialog from '@/components/WalletConnectDialog';
import { navlinks } from '@/lib/constants';
import cn from '@/lib/utils';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useConnection } from 'wagmi';
import { Icon } from './Sidebar';
import Button from './ui/Button';
import { Input } from './ui/Input';

export default function Navbar() {
  const [activeLink, setActiveLink] = useState<string>('/');
  const [toggleDrawer, setToggleDrawer] = useState<boolean>(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const { isConnected, isConnecting } = useConnection();
  const handleCreateClick = () => {
    if (isConnected) {
      navigate('/create-campaign');
    } else {
      setToggleDrawer(false);
      setWalletDialogOpen(true);
    }
  };
  const searchValue = searchParams.get('q') ?? '';
  const handleSearchChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set('q', value);
    else nextParams.delete('q');
    nextParams.delete('page');

    if (location.pathname === '/') {
      setSearchParams(nextParams, { replace: true });
    } else {
      navigate(
        { pathname: '/', search: nextParams.toString() ? `?${nextParams.toString()}` : '' },
        { replace: true },
      );
    }
  };

  return (
    <>
      <div className="mb-8.75 flex flex-col-reverse justify-between gap-6 sm:mt-6 md:flex-row lg:mt-2">
        <div className="mx-4 flex h-13 flex-row rounded-full border border-border bg-card py-1.5 pr-2 pl-4 md:max-w-md lg:mx-0 lg:flex-1">
          <Input
            type="search"
            aria-label="Search campaigns"
            className="h-full flex-1 rounded-full border-0 bg-transparent px-0 py-0 font-epilogue text-sm font-normal shadow-none focus-visible:border-0 focus-visible:ring-0"
            placeholder="Search for campaigns"
            value={searchValue}
            onChange={(event) => handleSearchChange(event.target.value)}
          />
          <div aria-hidden="true" className="flex-center h-full w-14 rounded-full bg-primary">
            <img src={search} alt="" aria-hidden="true" className="size-3.75 object-contain" />
          </div>
        </div>

        <div className="hidden justify-end gap-4 sm:flex">
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
        <div className="flex-between relative sm:hidden!">
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
                    aria-current={activeLink === link.name ? 'page' : undefined}
                    disabled={link.disabled}
                    className={cn(
                      'flex w-full items-center p-4 text-left capitalize',
                      activeLink === link.name && 'bg-muted',
                    )}
                    onClick={() => {
                      setToggleDrawer(false);
                      setActiveLink(link.name);
                      navigate(link.link);
                    }}
                  >
                    <img
                      src={link.imgUrl}
                      alt=""
                      aria-hidden="true"
                      className={`object-contain ${activeLink === link.name ? 'grayscale-0' : 'grayscale'} size-6`}
                    />
                    <span
                      className={`font-epilogue text-sm ${activeLink === link.name ? 'text-success' : 'text-muted-foreground'} ml-5 font-semibold`}
                    >
                      {link.name}
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
