import { logo, menu, search } from '@/assets';
import { navlinks } from '@/lib/constants';
import cn from '@/lib/utils';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConnect, useConnection, useConnectors } from 'wagmi';
import { Icon } from './Sidebar';
import Button from './ui/Button';

export default function Navbar() {
  const [activeLink, setActiveLink] = useState<string>('/');
  const [toggleDrawer, setToggleDrawer] = useState<boolean>(false);
  const navigate = useNavigate();

  const { address, isConnected } = useConnection();
  const {
    mutate: connectWallet,
    isPending: connectionLoading,
    error: connectionError,
  } = useConnect();
  const connectors = useConnectors();
  const handleCreateClick = () => {
    if (isConnected) {
      navigate('/create-campaign');
    } else if (connectors[0]) {
      connectWallet({ connector: connectors[0] });
    }
  };

  return (
    <>
      <div className="mb-8.75 flex flex-col-reverse justify-between gap-6 sm:mt-6 md:flex-row lg:mt-2">
        <div className="mx-4 flex h-13 flex-row rounded-full bg-card py-2 pr-2 pl-4 md:max-w-md lg:mx-0 lg:flex-1">
          <input
            type="text"
            aria-label="Search campaigns"
            className="font-epilogue flex w-full bg-transparent text-sm font-normal text-foreground outline-none placeholder:text-placeholder"
            placeholder="Search for campaigns"
          />
          <div className="flex-center curosr h-full w-18 rounded-full bg-primary">
            <img src={search} alt="" aria-hidden="true" className="size-3.75 object-contain" />
          </div>
        </div>

        <div className="hidden justify-end gap-4 sm:flex">
          <Button
            type="button"
            onClick={handleCreateClick}
            disabled={connectionLoading || (!isConnected && connectors.length === 0)}
            aria-busy={connectionLoading}
            className={cn(
              isConnected
                ? 'bg-success text-success-foreground'
                : 'bg-brand-purple text-brand-purple-foreground',
            )}
          >
            {connectionLoading
              ? 'Connecting...'
              : isConnected
                ? 'Create a campaign'
                : 'Connect'}
          </Button>

          <Link
            className="flex-center cursor size-13 overflow-hidden rounded-md bg-secondary duration-100 active:scale-90"
            to="/profile"
          >
            <img
              src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${isConnected ? address : 'user'}&backgroundColor=${isConnected ? '4acd8d' : '866dfd'}`}
              alt="Profile"
              className="object-contain"
            />
          </Link>
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
              <Link
                className="flex-center cursor size-9.5 overflow-hidden rounded-md bg-secondary"
                to="/profile"
              >
                <img
                  src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${isConnected ? address : 'user'}&backgroundColor=${isConnected ? '4acd8d' : '866dfd'}`}
                  alt="Profile"
                  className="object-contain"
                />
              </Link>
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
                disabled={connectionLoading || (!isConnected && connectors.length === 0)}
                aria-busy={connectionLoading}
                className={cn(
                  isConnected
                    ? 'bg-success text-success-foreground'
                    : 'bg-brand-purple text-brand-purple-foreground',
                  'w-full',
                )}
              >
                {connectionLoading
                  ? 'Connecting...'
                  : isConnected
                    ? 'Create a campaign'
                    : 'Connect'}
              </Button>
            </div>
          </nav>
        </div>
      </div>
      {connectionError && (
        <p role="alert" className="mx-4 -mt-5 text-sm text-destructive sm:mx-0">
          Wallet connection failed: {connectionError.message}
        </p>
      )}
    </>
  );
}
