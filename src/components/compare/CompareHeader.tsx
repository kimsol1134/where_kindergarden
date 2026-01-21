'use client';

import { useState } from 'react';
import { ArrowLeft, Share2, Link2, MessageCircle, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCompareStore } from '@/stores';
import { shareToKakao, copyShareUrl } from '@/lib/share/kakaoShare';

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

  const handleKakaoShare = () => {
    const names = items.map((item) => item.name).join(', ');
    shareToKakao({
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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">기관 비교하기</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 mr-2">
            총 <span className="text-emerald-600 font-bold">{items.length}</span>개 비교 중
          </span>
          {items.length > 0 && (
            <>
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="공유하기"
                >
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
                {showShareMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px] z-50">
                    <button
                      onClick={handleKakaoShare}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4 text-yellow-500" />
                      카카오톡 공유
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-500" />
                          복사 완료!
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4 text-gray-500" />
                          링크 복사
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleClearAll}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 underline"
              >
                전체 삭제
              </button>
            </>
          )}
        </div>
      </div>
      {/* Backdrop for closing share menu */}
      {showShareMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowShareMenu(false)}
        />
      )}
    </header>
  );
}
