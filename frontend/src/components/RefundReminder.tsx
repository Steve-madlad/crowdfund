import CampaignImage from '@/components/CampaignImage';
import Button from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { crowdFundingAbi } from '@/generated';
import { formatEth } from '@/lib/utils';
import { formatWeb3Error } from '@/lib/web3Errors';
import { AlertCircle, Clock3, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useBlock, useChainId, useConnection, useReadContract, useReadContracts } from 'wagmi';

const contractAddress = import.meta.env.VITE_REACT_CONTRACT_ADDRESS;
const REMINDER_STORAGE_PREFIX = 'venti:refund-reminders:v1';
const REMIND_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

interface ReminderPreference {
  dontRemindAgain: boolean;
  remindAt: number | null;
}

interface ReminderPreferences {
  scopeKey: string;
  entries: Record<string, ReminderPreference>;
}

interface CandidateCampaign {
  id: number;
  title: string;
  image: string;
  canClaim: boolean;
}

interface RefundReminderEntry extends CandidateCampaign {
  amount: bigint;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseReminderPreferences(serialized: string | null): Record<string, ReminderPreference> {
  if (!serialized) return {};
  const parsed: unknown = JSON.parse(serialized);
  if (!isRecord(parsed)) throw new TypeError('Saved reminder preferences are invalid.');

  const entries: Record<string, ReminderPreference> = {};
  for (const [id, value] of Object.entries(parsed)) {
    if (
      isRecord(value) &&
      typeof value.dontRemindAgain === 'boolean' &&
      (typeof value.remindAt === 'number' || value.remindAt === null)
    ) {
      entries[id] = {
        dontRemindAgain: value.dontRemindAgain,
        remindAt: value.remindAt,
      };
    }
  }
  return entries;
}

export default function RefundReminder() {
  const { address } = useConnection();
  const chainId = useChainId();
  const [preferences, setPreferences] = useState<ReminderPreferences>({
    scopeKey: '',
    entries: {},
  });
  const [dontRemindAgainIds, setDontRemindAgainIds] = useState<Set<number>>(() => new Set());
  const [now, setNow] = useState(0);
  const lastStorageError = useRef<string | undefined>(undefined);
  const lastReadError = useRef<unknown>(undefined);
  const scopeKey =
    address && contractAddress
      ? `${REMINDER_STORAGE_PREFIX}:${chainId}:${contractAddress.toLowerCase()}:${address.toLowerCase()}`
      : '';

  const {
    data: campaigns,
    error: campaignsError,
  } = useReadContract({
    address: contractAddress,
    abi: crowdFundingAbi,
    functionName: 'getCampaigns',
    query: {
      enabled: Boolean(address && contractAddress),
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    },
  });
  const {
    data: refundDelay,
    error: refundDelayError,
  } = useReadContract({
    address: contractAddress,
    abi: crowdFundingAbi,
    functionName: 'REFUND_DELAY',
    query: { enabled: Boolean(address && contractAddress) },
  });
  const { data: latestBlock } = useBlock({
    watch: true,
    query: { enabled: Boolean(address), refetchInterval: 60_000 },
  });

  const candidateCampaigns = useMemo(() => {
    if (!address || !campaigns || !latestBlock || refundDelay === undefined) return [];
    const walletAddress = address.toLowerCase();

    return campaigns.flatMap((campaign, id): CandidateCampaign[] => {
      const supported = campaign.donators.some(
        (donator) => donator.toLowerCase() === walletAddress,
      );
      if (!supported) return [];

      const goalReached =
        campaign.target > 0n && campaign.amountCollected >= campaign.target;
      const deadlinePassed = latestBlock.timestamp > campaign.deadline;
      const refundWindowElapsed =
        latestBlock.timestamp >= campaign.deadline &&
        latestBlock.timestamp - campaign.deadline >= refundDelay;
      const canClaim =
        campaign.cancelled ||
        campaign.refundsEnabled ||
        (deadlinePassed && !goalReached);
      const canEnableRefunds =
        goalReached &&
        refundWindowElapsed &&
        !campaign.cancelled &&
        !campaign.withdrawn &&
        !campaign.refundsEnabled;

      if (!canClaim && !canEnableRefunds) return [];
      return [{ id, title: campaign.title, image: campaign.image, canClaim }];
    });
  }, [address, campaigns, latestBlock, refundDelay]);

  const contributionContracts = useMemo(() => {
    if (!address || !contractAddress) return [];
    return candidateCampaigns.map(({ id }) => ({
      address: contractAddress,
      abi: crowdFundingAbi,
      functionName: 'contributions' as const,
      args: [BigInt(id), address] as const,
    }));
  }, [address, candidateCampaigns]);
  const {
    data: contributionResults,
    error: contributionReadError,
  } = useReadContracts({
    contracts: contributionContracts,
    query: {
      enabled: Boolean(address && contributionContracts.length),
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    },
  });

  const reminders = useMemo(
    () =>
      candidateCampaigns.flatMap((campaign, index): RefundReminderEntry[] => {
        const result = contributionResults?.[index];
        if (result?.status !== 'success' || result.result <= 0n) return [];
        return [{ ...campaign, amount: result.result }];
      }),
    [candidateCampaigns, contributionResults],
  );

  useEffect(() => {
    if (!scopeKey) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const serialized = window.localStorage.getItem(scopeKey);
        setPreferences({ scopeKey, entries: parseReminderPreferences(serialized) });
        lastStorageError.current = undefined;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Browser storage is unavailable.';
        if (lastStorageError.current !== message) {
          toast.error(`Refund reminder preferences could not be loaded: ${message}`);
          lastStorageError.current = message;
        }
        setPreferences({ scopeKey, entries: {} });
      }
    });

    return () => {
      active = false;
    };
  }, [scopeKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!scopeKey || preferences.scopeKey !== scopeKey) return;

    try {
      window.localStorage.setItem(scopeKey, JSON.stringify(preferences.entries));
      lastStorageError.current = undefined;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Browser storage is unavailable.';
      if (lastStorageError.current !== message) {
        toast.error(`Refund reminder preferences could not be saved: ${message}`);
        lastStorageError.current = message;
      }
    }
  }, [preferences, scopeKey]);

  const readError = campaignsError ?? refundDelayError ?? contributionReadError;
  useEffect(() => {
    if (!readError || lastReadError.current === readError) return;
    toast.error(`Refund reminder status could not be checked: ${formatWeb3Error(readError)}`);
    lastReadError.current = readError;
  }, [readError]);

  const dueReminders = reminders.filter((reminder) => {
    const preference = preferences.entries[String(reminder.id)];
    return (
      now > 0 &&
      preferences.scopeKey === scopeKey &&
      !preference?.dontRemindAgain &&
      (preference?.remindAt === null || preference?.remindAt === undefined || preference.remindAt <= now)
    );
  });
  const isOpen = dueReminders.length > 0;

  const dismissReminders = () => {
    if (!scopeKey || preferences.scopeKey !== scopeKey) return;

    const remindAt = now + REMIND_AGAIN_AFTER_MS;
    setPreferences((current) => {
      if (current.scopeKey !== scopeKey) return current;
      const entries = { ...current.entries };
      for (const reminder of dueReminders) {
        entries[String(reminder.id)] = dontRemindAgainIds.has(reminder.id)
          ? { dontRemindAgain: true, remindAt: null }
          : { dontRemindAgain: false, remindAt };
      }
      return { ...current, entries };
    });
    setDontRemindAgainIds(new Set());
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) dismissReminders();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-7">
            <RotateCcw className="size-5 text-primary" aria-hidden="true" />
            Refunds need your attention
          </DialogTitle>
          <DialogDescription>
            Some campaigns have refunds you can claim. Successful campaigns past the refund window
            may first need anyone to enable refunds. Your reminder choices are saved in this
            browser for this wallet and network.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {dueReminders.map((reminder) => (
            <section
              key={reminder.id}
              className="grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center"
            >
              <CampaignImage
                src={reminder.image}
                alt=""
                className="aspect-square size-20 rounded-lg object-cover sm:size-20"
              />
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground">
                  {reminder.title}
                </h3>
                <p className="mt-1 text-sm font-medium text-primary">
                  {reminder.canClaim
                    ? `${formatEth(reminder.amount)} ETH available to claim`
                    : `${formatEth(reminder.amount)} ETH contribution`}
                </p>
                <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
                  {reminder.canClaim ? (
                    'Your refund is ready. Claim it from the campaign page.'
                  ) : (
                    <>
                      <Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      Refunds can now be enabled by anyone. After that, you can claim your refund.
                    </>
                  )}
                </p>
                <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={dontRemindAgainIds.has(reminder.id)}
                    onChange={(event) =>
                      setDontRemindAgainIds((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(reminder.id);
                        else next.delete(reminder.id);
                        return next;
                      })
                    }
                    className="size-4 shrink-0 accent-primary"
                  />
                  Don’t remind me again for this campaign
                </label>
              </div>
              <Link
                to={`/campaign-details/${reminder.id}`}
                onClick={dismissReminders}
                className="flex-center min-h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {reminder.canClaim ? 'View refund' : 'Review campaign'}
              </Link>
            </section>
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Dismissing this reminder snoozes the listed campaigns for 7 days. You can also choose
          never to be reminded about individual campaigns.
        </div>
        <Button
          type="button"
          onClick={dismissReminders}
          className="min-h-10 justify-center bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          Remind me in 7 days
        </Button>
      </DialogContent>
    </Dialog>
  );
}
