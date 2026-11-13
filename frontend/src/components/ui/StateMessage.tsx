import type { ReactNode } from 'react';
import cn from '@/lib/utils';

interface StateMessageProps {
  title: string;
  description: string;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  title,
  description,
  className,
  children,
}: StateMessageProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-card p-6 text-center sm:p-8',
        className,
      )}
    >
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {children && <div className="mt-5 flex justify-center">{children}</div>}
    </section>
  );
}

interface ErrorStateProps extends StateMessageProps {
  onRetry?: () => void;
}

export function ErrorState({
  title,
  description,
  className,
  onRetry,
  children,
}: ErrorStateProps) {
  return (
    <section
      role="alert"
      className={cn(
        'rounded-xl border border-destructive/40 bg-card p-6 text-center sm:p-8',
        className,
      )}
    >
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onClick={onRetry}
          >
            Try again
          </button>
        )}
        {children}
      </div>
    </section>
  );
}
