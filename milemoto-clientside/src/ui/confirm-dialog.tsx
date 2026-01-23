'use client';

import type { ReactNode } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/alert-dialog';
import { buttonVariants, type ButtonVariants } from '@/ui/button';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  confirmVariant?: ButtonVariants['variant'];
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmDisabled,
  cancelDisabled,
  confirmVariant,
  closeOnOutsideClick = true,
  closeOnEscape = true,
}: ConfirmDialogProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onOpenChange(false);
    }
  };
  const overlayProps = closeOnOutsideClick ? { onClick: () => onOpenChange(false) } : {};

  return (
    <AlertDialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <AlertDialogContent
        overlayProps={overlayProps}
        onEscapeKeyDown={event => {
          if (!closeOnEscape) {
            event.preventDefault();
            return;
          }
          onOpenChange(false);
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelDisabled}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={confirmVariant ? buttonVariants({ variant: confirmVariant }) : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
