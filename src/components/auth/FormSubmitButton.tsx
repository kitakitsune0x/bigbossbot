'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FormSubmitButtonProps = {
  label: string;
  pendingLabel: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
};

export default function FormSubmitButton({
  label,
  pendingLabel,
  variant = 'default',
  size = 'default',
  className,
  fullWidth = true,
  disabled = false,
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      variant={variant}
      size={size}
      className={cn(fullWidth && 'w-full', className)}
    >
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? pendingLabel : label}
    </Button>
  );
}
