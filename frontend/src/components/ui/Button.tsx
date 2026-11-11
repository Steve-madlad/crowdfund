import cn from '@/lib/utils';
import React from 'react';

export default function Button({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'font-epilogue cursor min-h-13 rounded-lg px-4 text-base leading-6.5 font-semibold text-white',
        props.className,
      )}
    >
      {children}
    </button>
  );
}
