import { Link } from 'react-router-dom';

const campaignRules = [
  {
    title: 'Set a clear goal and deadline',
    body: 'Campaigns accept contributions until their deadline. Contributions may exceed the goal.',
  },
  {
    title: 'Funds are held in escrow',
    body: 'The campaign owner can withdraw after the goal is reached, subject to the campaign refund rules.',
  },
  {
    title: 'Unsuccessful campaigns can be refunded',
    body: 'If a campaign ends below its goal, supporters can claim full refunds. The contract does not automatically send refunds; each supporter must claim.',
  },
  {
    title: 'Owners may cancel before withdrawal',
    body: 'An owner can cancel before the deadline if funds have not been withdrawn. Cancellation enables supporters to claim full refunds.',
  },
  {
    title: 'Successful but unpaid campaigns have a refund cutoff',
    body: 'If a campaign reaches its goal but remains unpaid three weeks after its deadline, anyone can pay gas to enable refunds for supporters. Once refunds are enabled, the owner cannot withdraw those funds.',
  },
  {
    title: 'Campaign content is your responsibility',
    body: 'Use truthful descriptions and images you have permission to publish. Images are referenced by public HTTPS URLs and remain hosted by their providers.',
  },
];

export default function Help() {
  return (
    <article className="mx-auto w-full max-w-4xl">
      <header className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Venti guide
        </p>
        <h1 className="mt-2 font-epilogue text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Venti campaign rules and help
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Review how contributions, withdrawals, cancellations, and refunds work before you create
          or support a campaign.
        </p>
      </header>

      <div className="grid gap-3">
        {campaignRules.map((rule, index) => (
          <section
            key={rule.title}
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <span className="flex-center size-9 shrink-0 rounded-full bg-primary/10 text-sm font-bold text-primary">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <h2 className="font-epilogue text-base font-semibold text-card-foreground sm:text-lg">
                {rule.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{rule.body}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="text-sm leading-6 text-foreground">
          Need a campaign to support? Browse current campaigns and check their individual details.
        </p>
        <Link
          to="/"
          className="flex-center min-h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Explore campaigns
        </Link>
      </div>
    </article>
  );
}
