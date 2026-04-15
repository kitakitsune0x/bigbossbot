import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariantClasses = {
  default: 'border-primary/20 bg-primary/10 text-primary',
  secondary: 'border-border bg-secondary text-secondary-foreground',
  outline: 'border-border bg-background text-muted-foreground',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  destructive: 'border-rose-200 bg-rose-50 text-rose-700',
} as const;

export type BadgeVariant = keyof typeof badgeVariantClasses;

type BadgeProps = HTMLAttributes<HTMLDivElement> & {
  variant?: BadgeVariant;
};

export function badgeVariants({
  variant = 'default',
  className,
}: {
  variant?: BadgeVariant;
  className?: string;
} = {}) {
  return cn(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
    badgeVariantClasses[variant],
    className,
  );
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return <div className={badgeVariants({ variant, className })} {...props} />;
}
