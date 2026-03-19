'use client';

import { useState } from 'react';
import { ArrowLeft, Check, Link2, MessageCircle, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/common/BrandMark';
import { copyShareUrl, shareComparison } from '@/lib/share/kakaoShare';
import { useCompareStore } from '@/stores';

export function CompareHeader() {
  const router = useRouter();
  const { items, clearAll } = useCompareStore();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleClearAll = () => {
    clearAll();
    router.push('/search');
  };

  const kindercodes = items.map((item) => item.kindercode);

  const handleKakaoShare = async () => {
    const names = items.map((item) => item.name).join(', ');
    await shareComparison({
      title: '우리동네 유치원 비교표',
      description: `${names} 비교 결과를 확인해보세요.`,
      compareIds: kindercodes,
    });
    setShowShareMenu(false);
  };

  const handleCopyLink = async () => {
    const success = await copyShareUrl(kindercodes);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setShowShareMenu(false);
  };

  return (
    <>
      <header className="sticky safe-top-offset z-30 px-4 pt-3">
        <div className="brand-shell mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-[2rem] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-full bg-white/80 p-2 text-[var(--brand-ink)] transition-colors hover:bg-white"
              aria-label="뒤로 가기"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <BrandMark compact labelClassName="hidden sm:block text-base" />
              <p className="mt-1 text-xs text-[var(--brand-ink-soft)]">최대 3곳 비교 및 공유</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-[var(--brand-ink-soft)] md:block">
              총 <span className="font-bold text-[var(--brand-leaf)]">{items.length}</span>개 비교 중
            </span>
            {items.length > 0 ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="rounded-full bg-white/80 p-2 text-[var(--brand-ink-soft)] transition-colors hover:bg-white hover:text-[var(--brand-ink)]"
                    aria-label="공유하기"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                  {showShareMenu ? (
                    <div className="brand-card absolute right-0 top-full z-50 mt-2 min-w-[180px] rounded-[1.25rem] py-2">
                      <button
                        onClick={handleKakaoShare}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--brand-ink)] hover:bg-white/80"
                      >
                        <MessageCircle className="h-4 w-4 text-[var(--brand-sun)]" />
                        카카오톡 공유
                      </button>
                      <button
                        onClick={handleCopyLink}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--brand-ink)] hover:bg-white/80"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 text-[var(--brand-leaf)]" />
                            복사 완료!
                          </>
                        ) : (
                          <>
                            <Link2 className="h-4 w-4 text-[var(--brand-ink-soft)]" />
                            링크 복사
                          </>
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={handleClearAll}
                  className="rounded-full border border-[rgba(203,188,174,0.32)] bg-white/70 px-3 py-2 text-xs font-semibold text-[var(--brand-ink-soft)] transition-colors hover:bg-white"
                >
                  전체 삭제
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {showShareMenu ? (
        <div className="fixed inset-0 z-20" onClick={() => setShowShareMenu(false)} />
      ) : null}
    </>
  );
}
