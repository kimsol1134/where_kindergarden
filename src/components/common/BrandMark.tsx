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
      <span
        className={cn(
          'relative flex items-center justify-center rounded-[1.4rem] border border-white/70 bg-white/80 shadow-[0_14px_40px_rgba(132,143,104,0.16)] backdrop-blur-md',
          compact ? 'h-10 w-10' : 'h-12 w-12',
          iconClassName
        )}
      >
        <Image
          src="/icon.png"
          alt="우리동네 유치원 아이콘"
          fill
          sizes={compact ? '40px' : '48px'}
          className="rounded-[1.2rem] object-cover p-1.5"
        />
      </span>
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
