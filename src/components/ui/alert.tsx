import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const alertToneClasses = {
  default: 'border-border bg-secondary/70 text-foreground',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  destructive: 'border-rose-200 bg-rose-50 text-rose-800',
} as const;

export type AlertTone = keyof typeof alertToneClasses;

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: AlertTone;
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone = 'default', ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      className={cn(
        'relative w-full rounded-lg border px-4 py-3 text-sm leading-6',
        alertToneClasses[tone],
        className,
      )}
      {...props}
    />
  ),
);

Alert.displayName = 'Alert';

export const AlertTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('font-semibold tracking-tight', className)} {...props} />
  ),
);

AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm leading-6', className)} {...props} />
  ),
);

AlertDescription.displayName = 'AlertDescription';
