'use client';

import { useState } from 'react';
import User from 'lucide-react/dist/esm/icons/user';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { useAuthStore } from '@/stores/authStore';

interface NicknameSetupProps {
  onComplete: () => void;
}

export function NicknameSetup({ onComplete }: NicknameSetupProps) {
  const { createProfile } = useAuthStore();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      setError('닉네임은 최소 2자 이상이어야 합니다.');
      return;
    }
    if (trimmed.length > 20) {
      setError('닉네임은 20자를 초과할 수 없습니다.');
      return;
    }

    setIsSubmitting(true);
    const result = await createProfile(trimmed);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      onComplete();
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-2">닉네임 설정</h3>
      <p className="text-sm text-gray-600 mb-6">
        Q&amp;A에서 사용할 닉네임을 설정해주세요.
        <br />
        <span className="text-xs text-gray-400">2~20자, 다른 사용자와 중복 불가</span>
      </p>

      <form onSubmit={handleSubmit}>
        <div className="relative mb-4">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임 입력"
            maxLength={20}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            autoFocus
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-between items-center mb-4">
          <span className="text-xs text-gray-400">{nickname.trim().length}/20</span>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || nickname.trim().length < 2}
          className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium text-sm hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              설정 중...
            </>
          ) : (
            '설정 완료'
          )}
        </button>
      </form>
    </div>
  );
}
