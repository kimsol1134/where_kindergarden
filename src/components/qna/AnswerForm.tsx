'use client';

import { useState } from 'react';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import type { AnswerRelation } from '@/types/community';
import { RELATION_LABELS } from '@/types/community';
import { useAuthStore } from '@/stores/authStore';
import { createAnswer, getTodayAnswerCount } from '@/lib/supabase/answers';

const DAILY_ANSWER_LIMIT = 20;

const RELATIONS: AnswerRelation[] = [
  'current_parent',
  'graduated_parent',
  'prospective',
  'other',
];

interface AnswerFormProps {
  questionId: string;
  onSubmitted: () => void;
}

export function AnswerForm({ questionId, onSubmitted }: AnswerFormProps) {
  const { user, profile, requireAuth } = useAuthStore();
  const [content, setContent] = useState('');
  const [relation, setRelation] = useState<AnswerRelation>('other');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) {
      requireAuth(() => handleSubmit(e));
      return;
    }

    setError(null);

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError('답변 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    // Rate limiting check
    const todayCount = await getTodayAnswerCount(user.id);
    if (todayCount >= DAILY_ANSWER_LIMIT) {
      setError(`하루 최대 ${DAILY_ANSWER_LIMIT}개까지 답변할 수 있습니다.`);
      setIsSubmitting(false);
      return;
    }

    const result = await createAnswer(
      { questionId, content: trimmedContent, relation },
      user.id,
      profile.nickname
    );

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setContent('');
      onSubmitted();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-3.5">
      {/* 관계 선택 */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1.5 block">나의 관계</label>
        <div className="flex flex-wrap gap-1.5">
          {RELATIONS.map((rel) => (
            <button
              key={rel}
              type="button"
              onClick={() => setRelation(rel)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                relation === rel
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {RELATION_LABELS[rel]}
            </button>
          ))}
        </div>
      </div>

      {/* 답변 내용 */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="답변을 작성해주세요"
        rows={3}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent mb-3"
        disabled={isSubmitting}
      />

      {error && (
        <p className="text-xs text-red-500 mb-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !content.trim()}
        className="w-full py-2.5 bg-emerald-500 text-white rounded-lg font-medium text-sm hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            등록 중...
          </>
        ) : (
          '답변 등록'
        )}
      </button>
    </form>
  );
}
