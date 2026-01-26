'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { QuestionCategory } from '@/types/community';
import { CATEGORY_LABELS } from '@/types/community';
import { useAuthStore } from '@/stores/authStore';
import { createQuestion } from '@/lib/supabase/questions';
import { getTodayQuestionCount } from '@/lib/supabase/questions';

const DAILY_QUESTION_LIMIT = 5;

const CATEGORIES: QuestionCategory[] = [
  'meal',
  'teacher',
  'facility',
  'bus',
  'program',
  'safety',
  'cost',
  'other',
];

interface QuestionFormProps {
  kindergartenId: string;
  onSubmitted: () => void;
  onCancel: () => void;
}

export function QuestionForm({ kindergartenId, onSubmitted, onCancel }: QuestionFormProps) {
  const { user, profile, requireAuth } = useAuthStore();
  const [category, setCategory] = useState<QuestionCategory>('other');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) {
      requireAuth(() => handleSubmit(e));
      return;
    }

    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (trimmedTitle.length > 100) {
      setError('제목은 100자 이하로 작성해주세요.');
      return;
    }

    setIsSubmitting(true);

    // Rate limiting check
    const todayCount = await getTodayQuestionCount(user.id);
    if (todayCount >= DAILY_QUESTION_LIMIT) {
      setError(`하루 최대 ${DAILY_QUESTION_LIMIT}개까지 질문할 수 있습니다.`);
      setIsSubmitting(false);
      return;
    }

    const result = await createQuestion(
      {
        kindergartenId,
        category,
        title: trimmedTitle,
        content: content.trim() || undefined,
      },
      user.id,
      profile.nickname
    );

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setTitle('');
      setContent('');
      onSubmitted();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-gray-900">질문 작성</h4>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 카테고리 선택 */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 mb-1.5 block">카테고리</label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* 제목 */}
      <div className="mb-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="질문 제목 (필수)"
          maxLength={100}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          disabled={isSubmitting}
        />
        <div className="text-right text-xs text-gray-400 mt-1">{title.length}/100</div>
      </div>

      {/* 본문 (선택) */}
      <div className="mb-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="추가 설명 (선택사항)"
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        className="w-full py-2.5 bg-emerald-500 text-white rounded-lg font-medium text-sm hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            등록 중...
          </>
        ) : (
          '질문 등록'
        )}
      </button>
    </form>
  );
}
