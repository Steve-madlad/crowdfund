import cn from '@/lib/utils';
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
}

export default function Button({ title, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'font-epilogue cursor min-h-13 rounded-lg px-4 text-base leading-6.5 font-semibold text-white',
        props.className,
      )}
    >
      {title}
    </button>
  );
}
