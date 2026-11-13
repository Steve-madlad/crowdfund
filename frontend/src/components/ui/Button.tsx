import cn from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

export default function Button({
  children,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={cn(
        'font-epilogue min-h-13 cursor rounded-lg px-4 text-base leading-6.5 font-semibold text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {children}
    </button>
  );
}
