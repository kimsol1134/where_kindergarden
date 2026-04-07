'use client';

import { useState, useEffect } from 'react';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import type { Question } from '@/types/community';
import { CATEGORY_LABELS } from '@/types/community';
import { useAuthStore } from '@/stores/authStore';
import { useAnswers } from '@/hooks/useAnswers';
import { fetchQuestion, deleteQuestion } from '@/lib/supabase/questions';
import { AnswerList } from './AnswerList';
import { AnswerForm } from './AnswerForm';

interface QuestionDetailProps {
  questionId: string;
  onBack: () => void;
}

export function QuestionDetail({ questionId, onBack }: QuestionDetailProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { answers, isLoading: answersLoading, refetch: refetchAnswers } = useAnswers(questionId);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const result = await fetchQuestion(questionId);
      setQuestion(result.data);
      setIsLoading(false);
    };
    load();
  }, [questionId]);

  const handleDeleteQuestion = async () => {
    if (!confirm('질문을 삭제하시겠습니까? 답변도 모두 삭제됩니다.')) return;
    const result = await deleteQuestion(questionId);
    if (!result.error) {
      onBack();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="p-5 text-center">
        <p className="text-sm text-gray-500">질문을 찾을 수 없습니다.</p>
        <button
          onClick={onBack}
          className="mt-3 text-sm text-emerald-600 hover:underline"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const isAuthor = user?.id === question.authorId;

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {CATEGORY_LABELS[question.category]}
          </span>
        </div>

        <h3 className="text-base font-bold text-gray-900 mb-2">{question.title}</h3>

        {question.content && (
          <p className="text-sm text-gray-600 whitespace-pre-wrap mb-3">
            {question.content}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{question.authorNickname}</span>
            <span className="text-xs text-gray-400">
              {new Date(question.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          {isAuthor && (
            <button
              onClick={handleDeleteQuestion}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              삭제
            </button>
          )}
        </div>
      </div>

      {/* 답변 목록 */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-900">
            답변 {answers.length}개
          </h4>
        </div>

        <AnswerList
          answers={answers}
          isLoading={answersLoading}
          onRefetch={refetchAnswers}
        />
      </div>

      {/* 답변 작성 폼 */}
      <div className="px-5 pb-4 pt-2 border-t border-gray-100">
        <AnswerForm
          questionId={questionId}
          onSubmitted={refetchAnswers}
        />
      </div>
    </div>
  );
}
