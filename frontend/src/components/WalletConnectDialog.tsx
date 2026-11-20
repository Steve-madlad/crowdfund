import Button from '@/components/ui/Button';
import { formatWeb3Error } from '@/lib/web3Errors';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  WalletCoinbase,
  WalletMetamask,
  WalletOkx,
  WalletPhantom,
  WalletRabby,
  WalletRainbow,
  WalletSafe,
  WalletTrust,
} from '@web3icons/react';
import { AlertCircle, ArrowUpRight, PlugZap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useConnect, useConnectors, useConnection } from 'wagmi';

type WalletBrand =
  | 'coinbase'
  | 'metamask'
  | 'okx'
  | 'phantom'
  | 'rabby'
  | 'rainbow'
  | 'safe'
  | 'trust';

const walletBrandNames: Record<WalletBrand, string> = {
  coinbase: 'Coinbase Wallet',
  metamask: 'MetaMask',
  okx: 'OKX Wallet',
  phantom: 'Phantom',
  rabby: 'Rabby',
  rainbow: 'Rainbow',
  safe: 'Safe',
  trust: 'Trust Wallet',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getBrandFromName(value: string): WalletBrand | undefined {
  const name = value.toLowerCase().replace(/[._-]/g, ' ');
  if (name.includes('rabby')) return 'rabby';
  if (name.includes('coinbase')) return 'coinbase';
  if (name.includes('rainbow')) return 'rainbow';
  if (name.includes('trust')) return 'trust';
  if (name.includes('phantom')) return 'phantom';
  if (name.includes('okx') || name.includes('okex')) return 'okx';
  if (name.includes('metamask')) return 'metamask';
  if (name.includes('safe')) return 'safe';
  return undefined;
}

function detectProviderBrand(provider: unknown): WalletBrand | undefined {
  if (!isRecord(provider)) return undefined;

  const info = isRecord(provider.info) ? provider.info : {};
  const providerName = [provider.name, provider.rdns, info.name, info.rdns]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  const nameBrand = getBrandFromName(providerName);
  if (nameBrand) return nameBrand;

  if (provider.isRabby === true) return 'rabby';
  if (provider.isCoinbaseWallet === true) return 'coinbase';
  if (provider.isRainbow === true) return 'rainbow';
  if (provider.isTrustWallet === true || provider.isTrust === true) return 'trust';
  if (provider.isPhantom === true) return 'phantom';
  if (provider.isOkxWallet === true || provider.isOKExWallet === true) return 'okx';
  if (provider.isMetaMask === true) return 'metamask';

  if (Array.isArray(provider.providers)) {
    const detectedBrands = [
      ...new Set(provider.providers.map(detectProviderBrand).filter((brand) => brand !== undefined)),
    ];
    if (detectedBrands.length === 1) return detectedBrands[0];
  }
  return undefined;
}

function detectInjectedWallet(): WalletBrand | undefined {
  if (typeof window === 'undefined') return undefined;
  const ethereum: unknown = Reflect.get(window, 'ethereum');
  return detectProviderBrand(ethereum);
}

function getConnectorBrand(
  connector: ReturnType<typeof useConnectors>[number],
  detectedInjectedWallet?: WalletBrand,
): WalletBrand | undefined {
  const connectorName = [
    connector.name,
    connector.id,
    ...(Array.isArray(connector.rdns) ? connector.rdns : connector.rdns ? [connector.rdns] : []),
  ].join(' ');
  return getBrandFromName(connectorName) ??
    (connector.id === 'injected' ? detectedInjectedWallet : undefined);
}

function WalletBrandIcon({ brand }: { brand: WalletBrand }) {
  const props = { 'aria-hidden': true as const, className: 'size-7', variant: 'branded' as const };
  switch (brand) {
    case 'coinbase':
      return <WalletCoinbase {...props} />;
    case 'metamask':
      return <WalletMetamask {...props} />;
    case 'okx':
      return <WalletOkx {...props} />;
    case 'phantom':
      return <WalletPhantom {...props} />;
    case 'rabby':
      return <WalletRabby {...props} />;
    case 'rainbow':
      return <WalletRainbow {...props} />;
    case 'safe':
      return <WalletSafe {...props} />;
    case 'trust':
      return <WalletTrust {...props} />;
  }
}

interface WalletConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getConnectorDescription(name: string, brand?: WalletBrand): string {
  if (brand === 'safe') return 'Connect your Safe smart account.';
  if (brand) return `Continue with ${walletBrandNames[brand]}.`;
  if (name.toLowerCase().includes('safe')) return 'Connect your Safe smart account.';
  return 'Connect with a wallet available in this browser.';
}

export default function WalletConnectDialog({
  open,
  onOpenChange,
}: WalletConnectDialogProps) {
  const [selectedConnector, setSelectedConnector] = useState<string>();
  const connectors = useConnectors();
  const detectedInjectedWallet = detectInjectedWallet();
  const { isConnected } = useConnection();
  const {
    mutate: connect,
    isPending,
    error,
  } = useConnect();

  useEffect(() => {
    if (open && isConnected) onOpenChange(false);
  }, [isConnected, onOpenChange, open]);

  return (
    <Dialog open={open && !isConnected} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
          <DialogDescription>
            Choose a wallet to continue. Disconnecting later only clears this app's connection; it
            does not revoke the wallet's site permissions.
          </DialogDescription>
        </DialogHeader>

        {connectors.length > 0 ? (
          <div className="grid gap-2.5">
            {connectors.map((connector) => {
              const brand = getConnectorBrand(connector, detectedInjectedWallet);
              const displayName =
                connector.id === 'injected' && brand
                  ? `${walletBrandNames[brand]} (Browser)`
                  : connector.name;
              return (
                <Button
                  key={connector.uid}
                  type="button"
                  disabled={isPending}
                  aria-busy={isPending && selectedConnector === connector.uid}
                  onClick={() => {
                    setSelectedConnector(connector.uid);
                    connect(
                      { connector },
                      {
                        onSuccess: () => {
                          toast.success(`${displayName} connected.`);
                          onOpenChange(false);
                        },
                        onError: (connectError) =>
                          toast.error(`Wallet connection failed: ${formatWeb3Error(connectError)}`),
                      },
                    );
                  }}
                  className="flex min-h-16 w-full items-center gap-3 border border-border bg-background px-3 text-left hover:border-primary/60 hover:bg-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                    {connector.icon ? (
                      <img src={connector.icon} alt="" aria-hidden="true" className="size-7 object-contain" />
                    ) : brand ? (
                      <WalletBrandIcon brand={brand} />
                    ) : (
                      <PlugZap className="size-5 text-primary" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {displayName}
                    </span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {getConnectorDescription(displayName, brand)}
                    </span>
                  </span>
                  {isPending && selectedConnector === connector.uid ? (
                    <span className="text-xs text-muted-foreground">Connecting…</span>
                  ) : (
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted p-4">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm leading-6 text-muted-foreground">
              No wallet connectors are available in this browser. Install or enable a supported
              wallet, then try again.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            Wallet connection failed: {formatWeb3Error(error)}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
