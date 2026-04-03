import Image from 'next/image';

interface PhoneFrameProps {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}

export function PhoneFrame({ src, alt, priority = false, className = '' }: PhoneFrameProps) {
  return (
    <div className={`relative mx-auto max-w-[280px] ${className}`}>
      <div className="overflow-hidden rounded-[2.125rem] border border-white/60 bg-white/90 p-[5px] shadow-[0_24px_48px_rgba(129,136,97,0.10)]">
        <Image
          src={src}
          alt={alt}
          width={393}
          height={852}
          priority={priority}
          className="rounded-[1.875rem]"
        />
      </div>
    </div>
  );
}
