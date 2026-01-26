'use client';

import { Loader2 } from 'lucide-react';
import type { Answer } from '@/types/community';
import { useAuthStore } from '@/stores/authStore';
import { toggleUpvote, deleteAnswer } from '@/lib/supabase/answers';
import { AnswerCard } from './AnswerCard';

interface AnswerListProps {
  answers: Answer[];
  isLoading: boolean;
  onRefetch: () => void;
}

export function AnswerList({ answers, isLoading, onRefetch }: AnswerListProps) {
  const { user, requireAuth } = useAuthStore();

  const handleUpvote = (answerId: string, hasUpvoted: boolean) => {
    if (!user) {
      requireAuth(() => handleUpvote(answerId, hasUpvoted));
      return;
    }
    toggleUpvote(answerId, user.id, hasUpvoted).then(() => onRefetch());
  };

  const handleDelete = (answerId: string) => {
    if (!confirm('답변을 삭제하시겠습니까?')) return;
    deleteAnswer(answerId).then(() => onRefetch());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
      </div>
    );
  }

  if (answers.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-6">
        아직 답변이 없습니다. 첫 답변을 남겨주세요!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {answers.map((answer) => (
        <AnswerCard
          key={answer.id}
          answer={answer}
          onUpvote={handleUpvote}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
