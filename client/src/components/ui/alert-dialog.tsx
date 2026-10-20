import * as React from 'react';
import { AlertDialog as AD } from 'radix-ui';
import { buttonVariants } from './button';
import { cn } from '@/lib/utils';

interface ConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/** Accessible confirmation dialog for irreversible actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  onConfirm,
}: ConfirmProps) {
  return (
    <AD.Root open={open} onOpenChange={onOpenChange}>
      <AD.Portal>
        <AD.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AD.Content className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-popover p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="space-y-1.5">
            <AD.Title className="text-lg font-semibold">{title}</AD.Title>
            <AD.Description className="text-sm text-muted-foreground">{description}</AD.Description>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AD.Cancel className={buttonVariants({ variant: 'outline' })}>Cancel</AD.Cancel>
            <AD.Action
              className={cn(buttonVariants({ variant: destructive ? 'destructive' : 'default' }))}
              onClick={onConfirm}
            >
              {confirmLabel}
            </AD.Action>
          </div>
        </AD.Content>
      </AD.Portal>
    </AD.Root>
  );
}
