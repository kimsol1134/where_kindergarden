import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  labelClassName?: string;
  iconClassName?: string;
  compact?: boolean;
}

export function BrandMark({
  className,
  labelClassName,
  iconClassName,
  compact = false,
}: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-3', compact && 'gap-2.5', className)}>
      <Image
        src="/icon.png"
        alt="우리동네 유치원 아이콘"
        width={compact ? 36 : 44}
        height={compact ? 36 : 44}
        className={cn(
          'rounded-xl',
          compact ? 'h-9 w-9' : 'h-11 w-11',
          iconClassName
        )}
      />
      <span
        className={cn(
          'font-semibold tracking-[-0.03em] text-[var(--brand-ink)]',
          compact ? 'text-base' : 'text-xl',
          labelClassName
        )}
      >
        우리동네 유치원
      </span>
    </div>
  );
}
