import type { ChangeEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

interface FormInputProps {
  name: string;
  label?: string;
  type?: 'textarea' | 'text' | 'number' | 'date';
  value: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  min?: number | string;
  step?: number | string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export default function FormInput({
  name,
  label,
  type,
  value,
  placeholder,
  required,
  disabled,
  maxLength,
  min,
  step,
  onChange,
}: FormInputProps) {
  return (
    <label className="col w-full flex-1">
      {label && <span className="mb-2.5 text-sm font-medium text-muted-foreground">{label}</span>}
      {type === 'textarea' ? (
        <Textarea
          id={name}
          name={name}
          value={value}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          onChange={onChange}
          rows={7}
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          min={min}
          step={step}
          onChange={onChange}
        />
      )}
    </label>
  );
}
