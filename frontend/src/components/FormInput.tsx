import type { InputHTMLAttributes } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  type?: HTMLInputElement['type'] | 'textarea';
}

export default function FormInput({ label, type, ...props }: FormInputProps) {
  return (
    <label className="col w-full flex-1">
      {label && (
        <span className="font-epilogue mb-2.5 text-sm leading-5.5 font-medium text-muted-foreground">
          {label}
        </span>
      )}
      {type === 'textarea' ? (
        <textarea
          {...props}
          className="font-epilogue min-w-0 rounded-lg border border-input bg-transparent py-3.75 text-sm text-foreground outline-none placeholder:text-placeholder focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-65 sm:px-6.25"
          rows={7}
        />
      ) : (
        <input
          type={type}
          {...props}
          className="font-epilogue min-w-0 rounded-lg border border-input bg-transparent py-3.75 text-sm text-foreground outline-none placeholder:text-placeholder focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-65 sm:px-6.25"
        />
      )}
    </label>
  );
}
