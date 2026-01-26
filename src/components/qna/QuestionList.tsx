'use client';

import { useState } from 'react';
import { Plus, Loader2, MessageCircle } from 'lucide-react';
import type { QuestionCategory } from '@/types/community';
import { useQuestions } from '@/hooks/useQuestions';
import { useAuthStore } from '@/stores/authStore';
import { CategoryFilter } from './CategoryFilter';
import { QuestionCard } from './QuestionCard';
import { QuestionForm } from './QuestionForm';
import { QuestionDetail } from './QuestionDetail';

interface QuestionListProps {
  kindergartenId: string;
}

export function QuestionList({ kindergartenId }: QuestionListProps) {
  const [categoryFilter, setCategoryFilter] = useState<QuestionCategory | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const { requireAuth } = useAuthStore();
  const { questions, isLoading, refetch } = useQuestions(kindergartenId, categoryFilter);

  const handleAskQuestion = () => {
    requireAuth(() => setShowForm(true));
  };

  if (selectedQuestionId) {
    return (
      <QuestionDetail
        questionId={selectedQuestionId}
        onBack={() => {
          setSelectedQuestionId(null);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 필터 + 질문하기 버튼 */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500">
            {isLoading ? '로딩 중...' : `${questions.length}개의 질문`}
          </span>
          {!showForm && (
            <button
              onClick={handleAskQuestion}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-full text-xs font-medium hover:bg-emerald-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              질문하기
            </button>
          )}
        </div>
        <CategoryFilter selected={categoryFilter} onSelect={setCategoryFilter} />
      </div>

      {/* 질문 작성 폼 */}
      {showForm && (
        <div className="px-5 pb-3">
          <QuestionForm
            kindergartenId={kindergartenId}
            onSubmitted={() => {
              setShowForm(false);
              refetch();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* 질문 목록 */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-500 mb-1">아직 질문이 없습니다</p>
            <p className="text-xs text-gray-400">첫 번째 질문을 남겨보세요!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onClick={() => setSelectedQuestionId(question.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
