import Image from 'next/image';
import { APP_NAME } from '@/lib/auth/config';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/bigbosslogo.png"
      alt={`${APP_NAME} logo`}
      width={736}
      height={736}
      priority={priority}
      className={cn('shrink-0 object-contain', className)}
    />
  );
}
