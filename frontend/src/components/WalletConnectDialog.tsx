import Button from '@/components/ui/Button';
import { formatWeb3Error } from '@/lib/web3Errors';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, ArrowUpRight, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useConnect, useConnectors } from 'wagmi';

interface WalletConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getConnectorDescription(name: string): string {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes('safe')) return 'Connect your Safe smart account.';
  if (normalizedName.includes('metamask')) return 'Continue with MetaMask.';
  return 'Connect with a wallet available in this browser.';
}

export default function WalletConnectDialog({
  open,
  onOpenChange,
}: WalletConnectDialogProps) {
  const [selectedConnector, setSelectedConnector] = useState<string>();
  const connectors = useConnectors();
  const {
    mutate: connect,
    isPending,
    error,
  } = useConnect();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            {connectors.map((connector) => (
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
                        toast.success(`${connector.name} connected.`);
                        onOpenChange(false);
                      },
                      onError: (connectError) =>
                        toast.error(`Wallet connection failed: ${formatWeb3Error(connectError)}`),
                    },
                  );
                }}
                className="flex min-h-16 w-full items-center gap-3 border border-border bg-background px-3 text-left hover:border-primary/60 hover:bg-muted"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <WalletCards className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {connector.name}
                  </span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {getConnectorDescription(connector.name)}
                  </span>
                </span>
                {isPending && selectedConnector === connector.uid ? (
                  <span className="text-xs text-muted-foreground">Connecting…</span>
                ) : (
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
              </Button>
            ))}
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
