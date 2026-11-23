import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { useTheme } from '@/providers/useTheme';
import { formatWeb3Error } from '@/lib/web3Errors';
import { getWalletAvatarUrl } from '@/lib/walletAvatar';
import { Copy, LogOut, Moon, Sun, UserRound, Wallet } from 'lucide-react';
import cn from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useConnection, useDisconnect } from 'wagmi';

interface AccountMenuProps {
  onRequestConnect: () => void;
  className?: string;
}

export default function AccountMenu({ onRequestConnect, className }: AccountMenuProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [greenAvatar, setGreenAvatar] = useState(
    () => localStorage.getItem('nav-avatar-color') !== 'default',
  );
  const { address, chain, chainId, connector, isConnected } = useConnection();
  const { mutate: disconnect, isPending: disconnectPending, error: disconnectError } = useDisconnect();
  const { resolvedTheme, setTheme } = useTheme();
  const avatarUrl = getWalletAvatarUrl(address);
  const navAvatarUrl = !isConnected
    ? `${avatarUrl}&backgroundColor=866dfd`
    : greenAvatar
      ? `${avatarUrl}&backgroundColor=4acd8d`
      : avatarUrl;
  const shortenedAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : undefined;

  useEffect(() => {
    const updateAvatarColor = () => setGreenAvatar(localStorage.getItem('nav-avatar-color') !== 'default');
    window.addEventListener('nav-avatar-color-change', updateAvatarColor);
    return () => window.removeEventListener('nav-avatar-color-change', updateAvatarColor);
  }, []);

  const handleCopyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Wallet address copied.');
    } catch (error) {
      toast.error(
        `Could not copy the address: ${
          error instanceof Error ? error.message : 'clipboard access is unavailable'
        }`,
      );
    }
  };

  const handleDisconnect = () => {
    if (!connector) {
      toast.error('The active wallet connector is unavailable.');
      return;
    }

    disconnect(
      { connector },
      {
        onSuccess: () => toast.success('Wallet disconnected from this app.'),
        onError: (error) =>
          toast.error(`Could not disconnect wallet: ${formatWeb3Error(error)}`),
      },
    );
  };

  const handleThemeToggle = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    try {
      setTheme(nextTheme);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your theme preference.');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={isConnected ? `Open wallet menu for ${shortenedAddress}` : 'Open account menu'}
          className={cn(
            'flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95',
            className,
          )}
        >
          {!avatarFailed ? (
            <img
              src={navAvatarUrl}
              alt=""
              aria-hidden="true"
              onError={() => setAvatarFailed(true)}
              className="size-full object-cover"
            />
          ) : (
            <UserRound className="size-5 text-muted-foreground" aria-hidden="true" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="px-2.5 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
              {!avatarFailed ? (
                <img
                  src={avatarUrl}
                  alt=""
                  aria-hidden="true"
                  className="size-full object-cover"
                />
              ) : (
                <UserRound className="size-5 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {isConnected ? 'Connected wallet' : 'No wallet connected'}
              </p>
              <p className="mt-1 truncate font-mono text-xs font-normal text-muted-foreground">
                {shortenedAddress ?? 'Connect to view your account'}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        {isConnected && (
          <>
            <div className="px-2.5 pb-2 text-xs text-muted-foreground">
              <span>{chain?.name ?? (chainId ? `Chain ${chainId}` : 'Network unavailable')}</span>
              {connector?.name && <span> · {connector.name}</span>}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                View profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void handleCopyAddress();
              }}
            >
              <Copy className="size-4 text-muted-foreground" aria-hidden="true" />
              Copy address
            </DropdownMenuItem>
          </>
        )}

        {!isConnected && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onRequestConnect();
              }}
            >
              <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
              Connect a wallet
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                View profile
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleThemeToggle}>
          {resolvedTheme === 'dark' ? (
            <Sun className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Moon className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
          Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'} mode
        </DropdownMenuItem>

        {isConnected && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={disconnectPending}
              onSelect={handleDisconnect}
              className="text-destructive focus:text-destructive"
            >
              {disconnectPending ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              ) : (
                <LogOut className="size-4" aria-hidden="true" />
              )}
              {disconnectPending ? 'Disconnecting…' : 'Disconnect wallet'}
            </DropdownMenuItem>
            {disconnectError && (
              <p role="alert" className="px-2.5 py-2 text-xs leading-5 text-destructive">
                Disconnect failed: {formatWeb3Error(disconnectError)}
              </p>
            )}
          </>
        )}

        {isConnected && (
          <p className="px-2.5 pt-1 pb-1 text-[11px] leading-4 text-muted-foreground">
            Disconnecting removes your wallet connection but doesn't revoke this site's permissions in MetaMask.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
