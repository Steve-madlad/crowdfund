import AccountMenu from '@/components/AccountMenu';
import WalletConnectDialog from '@/components/WalletConnectDialog';
import Button from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/StateMessage';
import { Skeleton } from '@/components/ui/Skeleton';
import { crowdFundingAbi } from '@/generated';
import { formatEth } from '@/lib/utils';
import { formatWeb3Error } from '@/lib/web3Errors';
import { summarizeProfile } from '@/lib/profile';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Copy, Plus, TrendingUp, Users, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatEther } from 'viem';
import { toast } from 'sonner';
import { useConnection, useReadContract } from 'wagmi';
import type { ReactNode } from 'react';

const contractAddress = import.meta.env.VITE_REACT_CONTRACT_ADDRESS;
const chartColors = ['var(--primary)', 'var(--accent)', 'var(--brand-purple)', 'var(--warning)'];
const chartTooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '0.75rem',
  color: 'var(--popover-foreground)',
};

function toChartEth(value: bigint): number {
  return Number(formatEther(value));
}

function compactTitle(title: string): string {
  return title.length > 20 ? `${title.slice(0, 18)}…` : title;
}

export default function Profile() {
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const { address, isConnected } = useConnection();
  const {
    data: campaignData,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: contractAddress,
    abi: crowdFundingAbi,
    functionName: 'getCampaigns',
    query: { enabled: Boolean(address) },
  });
  const summary = useMemo(
    () => (address ? summarizeProfile(campaignData ?? [], address) : null),
    [address, campaignData],
  );
  const raisedChartData = useMemo(
    () =>
      (summary?.createdCampaigns ?? []).map(({ campaign }) => ({
        title: compactTitle(campaign.title),
        raised: toChartEth(campaign.amountCollected),
      })),
    [summary],
  );
  const donatedChartData = useMemo(
    () =>
      (summary?.supportedCampaigns ?? []).map((campaign) => ({
        title: compactTitle(campaign.title),
        amount: toChartEth(campaign.totalDonated),
      })),
    [summary],
  );

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Wallet address copied.');
    } catch (copyError) {
      toast.error(
        `Could not copy the address: ${
          copyError instanceof Error ? copyError.message : 'clipboard access is unavailable'
        }`,
      );
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader />
        <EmptyState
          title="Connect your wallet to view your profile"
          description="Your campaign and contribution activity is calculated from on-chain records for the connected address."
          className="mt-6"
        >
          <Button
            type="button"
            onClick={() => setConnectDialogOpen(true)}
            className="bg-primary text-primary-foreground hover:opacity-90"
          >
            Connect wallet
          </Button>
        </EmptyState>
        <WalletConnectDialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader />
        <ErrorState
          title="Profile activity couldn't be loaded"
          description={formatWeb3Error(error)}
          onRetry={() => void refetch()}
          className="mt-6"
        />
      </div>
    );
  }

  if (isLoading || campaignData === undefined || !summary) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader />
        <ProfileSkeleton />
      </div>
    );
  }

  const createdChartIsEmpty = raisedChartData.length === 0;
  const donatedChartIsEmpty = donatedChartData.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader />

      <section className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <img
          src={`https://api.dicebear.com/10.x/bottts-neutral/svg?seed=${encodeURIComponent(address.toLowerCase())}`}
          alt=""
          aria-hidden="true"
          className="size-14 shrink-0 rounded-full bg-secondary sm:size-16"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-card-foreground">Your wallet</p>
          <p className="mt-1 break-all font-mono text-sm text-muted-foreground">{address}</p>
        </div>
        <Button
          type="button"
          onClick={() => void copyAddress()}
          className="min-h-10 gap-2 border border-border bg-background text-sm text-foreground hover:bg-muted"
        >
          <Copy className="size-4" aria-hidden="true" />
          Copy address
        </Button>
        <AccountMenu onRequestConnect={() => setConnectDialogOpen(true)} />
      </section>

      <section aria-label="Profile statistics" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Campaigns created"
          value={String(summary.createdCampaigns.length)}
          icon={<Plus className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Gross raised"
          value={`${formatEth(summary.totalRaised)} ETH`}
          icon={<TrendingUp className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Gross contributed"
          value={`${formatEth(summary.totalDonated)} ETH`}
          icon={<WalletCards className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Unique supporters"
          value={String(summary.supporterCount)}
          icon={<Users className="size-5" aria-hidden="true" />}
        />
      </section>

      <section className="mt-7">
        <div className="mb-4">
          <h2 className="font-epilogue text-xl font-semibold text-foreground">Your activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Lifetime totals reflect original on-chain contributions, including amounts later refunded.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard
            title="Campaign contributions"
            description="Original ETH contributions to campaigns you created; refunded amounts remain in this history."
          >
            {createdChartIsEmpty ? (
              <ChartEmptyState message="Create a campaign to see its funding here." />
            ) : (
              <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                <BarChart data={raisedChartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="title"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [`${Number(value).toFixed(4)} ETH`, 'Raised']}
                  />
                  <Bar dataKey="raised" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Where you contribute"
            description="Original contributions grouped by campaign; refunded amounts remain in this history."
          >
            {donatedChartIsEmpty ? (
              <ChartEmptyState message="Contribute to a campaign to see your activity here." />
            ) : (
              <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                <PieChart>
                  <Pie
                    data={donatedChartData}
                    dataKey="amount"
                    nameKey="title"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {donatedChartData.map((campaign, index) => (
                      <Cell
                        key={`${campaign.title}-${index}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [`${Number(value).toFixed(4)} ETH`, 'Contributed']}
                  />
                  <Legend
                    wrapperStyle={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-epilogue text-xl font-semibold text-foreground">Your campaigns</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.createdCampaigns.length} created
              </p>
            </div>
            <Link
              to="/create-campaign"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </div>
          {summary.createdCampaigns.length === 0 ? (
            <EmptyState
              title="No campaigns created yet"
              description="Start a campaign to share your cause with the community."
              className="h-full"
            />
          ) : (
            <ul className="grid gap-3">
              {summary.createdCampaigns.map(({ campaign, id }) => (
                <li key={id}>
                  <CampaignActivityCard
                    id={id}
                    title={campaign.title}
                    image={campaign.image}
                    amount={campaign.amountCollected}
                    target={campaign.target}
                    detail={
                      campaign.cancelled
                        ? 'pledged · cancelled'
                        : campaign.refundsEnabled
                          ? 'pledged · refunds open'
                          : campaign.withdrawn
                            ? 'raised · withdrawn'
                            : 'raised'
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-4">
            <h2 className="font-epilogue text-xl font-semibold text-foreground">
              Campaigns you support
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.contributions.length} contributions across {summary.supportedCampaigns.length}{' '}
              campaigns
            </p>
          </div>
          {summary.supportedCampaigns.length === 0 ? (
            <EmptyState
              title="No contributions yet"
              description="Explore campaigns and support a cause that matters to you."
              className="h-full"
            >
              <Link
                to="/"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Explore campaigns
              </Link>
            </EmptyState>
          ) : (
            <ul className="grid gap-3">
              {summary.supportedCampaigns.map((campaign) => (
                <li key={campaign.id}>
                  <CampaignActivityCard
                    id={campaign.id}
                    title={campaign.title}
                    image={campaign.image}
                    amount={campaign.totalDonated}
                    detail={`${campaign.contributionCount} ${
                      campaign.contributionCount === 1 ? 'contribution' : 'contributions'
                    }`}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <WalletConnectDialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen} />
    </div>
  );
}

function PageHeader() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Your dashboard
        </p>
        <h1 className="mt-2 font-epilogue text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Profile
        </h1>
      </div>
      <Link
        to="/create-campaign"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Plus className="size-4" aria-hidden="true" />
        New campaign
      </Link>
    </header>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
      </div>
      <p className="mt-4 break-words font-epilogue text-xl font-bold text-card-foreground sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="font-epilogue text-base font-semibold text-card-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-4 h-64 min-w-0">{children}</div>
    </section>
  );
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl bg-background px-5 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function CampaignActivityCard({
  id,
  title,
  image,
  amount,
  target,
  detail,
}: {
  id: number;
  title: string;
  image: string;
  amount: bigint;
  target?: bigint;
  detail: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const progress =
    target !== undefined && target > 0n
      ? Number((amount * 100n) / target > 100n ? 100n : (amount * 100n) / target)
      : null;

  return (
    <Link
      to={`/campaign-details/${id}`}
      className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {image && !imageFailed ? (
          <img
            src={image}
            alt=""
            aria-hidden="true"
            onError={() => setImageFailed(true)}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            ETH
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-card-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatEth(amount)} ETH {detail}
          {target !== undefined && ` of ${formatEth(target)} ETH`}
        </p>
        {progress !== null && (
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={`${title} funding progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </Link>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mt-6 grid gap-5" role="status" aria-label="Loading profile">
      <span className="sr-only">Loading profile activity…</span>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
