import React from 'react';

export interface GenericModalProps {
  onClose?: () => void;
  className?: string;
  children: React.ReactNode;
}

export const GenericModal = React.forwardRef(({ onClose, children, className }: GenericModalProps, ref: React.Ref<HTMLDialogElement>) => {
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={`
        p-0 rounded-3xl bg-base-100 text-base-content
        border border-base-content/5
        shadow-2xl
        backdrop:bg-black/60 backdrop:backdrop-blur-sm
        animate-in fade-in zoom-in-95 duration-200
        ${className}
      `}
    >
      {children}
    </dialog>
  );
});