import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  contentStyle?: CSSProperties;
  ariaLabel?: string;
}

export default function Modal({
  isOpen,
  onClose,
  children,
  contentStyle,
  ariaLabel = 'Dialog',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-[#1c1c24] p-4 sm:p-10"
        style={contentStyle}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
