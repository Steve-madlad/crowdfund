import type { InputHTMLAttributes } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  type?: HTMLInputElement['type'] | 'textarea';
}

export default function FormInput({ label, type, ...props }: FormInputProps) {
  return (
    <label className="col w-full flex-1">
      {label && (
        <span className="font-epilogue mb-2.5 text-sm leading-5.5 font-medium text-[#808191]">
          {label}
        </span>
      )}
      {type === 'textarea' ? (
        <textarea
          {...props}
          className="font-epilogue rounded-lg border border-[#3a3a43] bg-transparent py-3.75 text-sm text-white outline-none placeholder:text-[#4b5264] sm:min-w-65 sm:px-6.25"
          rows={7}
        />
      ) : (
        <input
          {...props}
          className="font-epilogue rounded-lg border border-[#3a3a43] bg-transparent py-3.75 text-sm text-white outline-none placeholder:text-[#4b5264] sm:min-w-65 sm:px-6.25"
        />
      )}
    </label>
  );
}
