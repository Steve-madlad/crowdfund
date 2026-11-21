import logo from '@/assets/logo.svg';
import { navlinks } from '@/lib/constants';
import cn from '@/lib/utils';
import { formatWeb3Error } from '@/lib/web3Errors';
import { useTheme } from '@/providers/useTheme';
import Button from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import { LogOut, Moon, Sun } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useConnection, useDisconnect } from 'wagmi';
import { useState } from 'react';

interface IconProps {
  imgUrl: string;
  className?: string;
  name?: string;
  activeLink?: string;
  disabled?: boolean;
  handleClick?: () => void;
}

export const Icon = ({ imgUrl, className, name, activeLink, disabled, handleClick }: IconProps) => {
  const icon = (
    <img
      className={`h-1/2 w-1/2 ${activeLink && activeLink !== name && 'grayscale'}`}
      src={imgUrl}
      alt={handleClick ? '' : 'Venti home'}
      aria-hidden={Boolean(handleClick)}
    />
  );
  const iconClassName = cn(
    'flex-center size-10 rounded-lg',
    activeLink && activeLink === name && 'bg-secondary',
    handleClick && 'cursor focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    className,
  );

  if (handleClick) {
    return (
      <button
        type="button"
        className={iconClassName}
        aria-label={name ?? 'Navigation item'}
        aria-current={activeLink === name ? 'page' : undefined}
        disabled={disabled}
        onClick={handleClick}
      >
        {icon}
      </button>
    );
  }

  return <div className={iconClassName}>{icon}</div>;
};

function isActiveRoute(pathname: string, search: string, link: string): boolean {
  if (pathname.startsWith('/campaign-details/')) return link === '/';
  if (link === '/?bookmarked=1') {
    return pathname === '/' && new URLSearchParams(search).get('bookmarked') === '1';
  }
  if (link === '/') return pathname === '/' && !new URLSearchParams(search).has('bookmarked');
  return pathname === link || (link === '/campaign-details' && pathname.startsWith(link));
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { connector, isConnected } = useConnection();
  const { mutate: disconnect, isPending: disconnectPending } = useDisconnect();
  const [disconnectConfirmationOpen, setDisconnectConfirmationOpen] = useState(false);
  const handleDisconnect = () => {
    if (!isConnected || !connector) {
      toast.error('There is no connected wallet to disconnect.');
      return;
    }

    disconnect(
      { connector },
      {
        onSuccess: () => {
          setDisconnectConfirmationOpen(false);
          toast.success('Wallet disconnected from this app.');
        },
        onError: (error) => toast.error(`Could not disconnect wallet: ${formatWeb3Error(error)}`),
      },
    );
  };

  const toggleTheme = () => {
    try {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your theme preference.');
    }
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="col-between sticky top-5 h-[93vh] items-center">
        <Link to="/" aria-label="Venti home">
          <Icon className="size-13 bg-secondary" imgUrl={logo} />
        </Link>

        <div className="sidebar-panel col-between mt-12 w-14 flex-1 items-center rounded-xl bg-card pt-4 pb-7">
          <nav aria-label="Main navigation">
            <div className="col-center gap-3">
              {navlinks.map((link) => {
                const active = isActiveRoute(location.pathname, location.search, link.link);
                const ItemIcon = link.icon;
                const label =
                  link.name === 'campaign'
                    ? 'Create campaign'
                    : link.name === 'bookmarks'
                      ? 'Saved campaigns'
                      : link.name === 'help'
                        ? 'Help and rules'
                        : link.name === 'logout'
                          ? 'Disconnect wallet'
                          : link.name.charAt(0).toUpperCase() + link.name.slice(1);
                return (
                  <Tooltip key={link.name}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={label}
                        aria-current={active ? 'page' : undefined}
                        disabled={link.name === 'logout' && (!isConnected || disconnectPending)}
                        onClick={() =>
                          link.name === 'logout'
                            ? setDisconnectConfirmationOpen(true)
                            : navigate({
                                pathname: link.link.split('?')[0],
                                search: link.link.split('?')[1]
                                  ? `?${link.link.split('?')[1]}`
                                  : '',
                              })
                        }
                        className={cn(
                          'flex-center size-10 rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50',
                          active && 'bg-secondary text-primary',
                        )}
                      >
                        {link.name === 'logout' && disconnectPending ? (
                          <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        ) : (
                          <ItemIcon className="size-5" aria-hidden="true" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </nav>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex-center size-10 rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
                aria-pressed={theme === 'dark'}
                onClick={toggleTheme}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="size-5" aria-hidden="true" />
                ) : (
                  <Moon className="size-5" aria-hidden="true" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'} mode
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Dialog
        open={disconnectConfirmationOpen}
        onOpenChange={(open) => {
          if (!disconnectPending) setDisconnectConfirmationOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect your wallet?</DialogTitle>
            <DialogDescription>
              This disconnects your wallet from Venti. It does not revoke this site’s
              permissions in your wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              disabled={disconnectPending}
              onClick={() => setDisconnectConfirmationOpen(false)}
              className="flex-center min-h-10 border border-border bg-background text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={disconnectPending}
              onClick={handleDisconnect}
              className="flex-center min-h-10 gap-2 bg-destructive text-destructive-foreground hover:opacity-90"
            >
              {disconnectPending ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              ) : (
                <LogOut className="size-4" aria-hidden="true" />
              )}
              {disconnectPending ? 'Disconnecting…' : 'Disconnect wallet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
