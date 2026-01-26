'use client';

import { ThumbsUp, Trash2 } from 'lucide-react';
import type { Answer } from '@/types/community';
import { RELATION_LABELS } from '@/types/community';
import { useAuthStore } from '@/stores/authStore';

interface AnswerCardProps {
  answer: Answer;
  onUpvote: (answerId: string, hasUpvoted: boolean) => void;
  onDelete: (answerId: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

const RELATION_STYLES: Record<string, string> = {
  current_parent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  graduated_parent: 'bg-blue-50 text-blue-700 border-blue-200',
  prospective: 'bg-amber-50 text-amber-700 border-amber-200',
  other: 'bg-gray-50 text-gray-600 border-gray-200',
};

export function AnswerCard({ answer, onUpvote, onDelete }: AnswerCardProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthor = user?.id === answer.authorId;
  const relationStyle = RELATION_STYLES[answer.relation] ?? RELATION_STYLES.other;

  return (
    <div className="p-3.5 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-900">
          {answer.authorNickname}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${relationStyle}`}>
          {RELATION_LABELS[answer.relation]}
        </span>
        <span className="text-[10px] text-gray-400 ml-auto">
          {formatRelativeTime(answer.createdAt)}
        </span>
      </div>

      <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
        {answer.content}
      </p>

      <div className="flex items-center justify-between">
        <button
          onClick={() => onUpvote(answer.id, answer.hasUpvoted ?? false)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
            answer.hasUpvoted
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-white text-gray-500 hover:bg-gray-100'
          }`}
        >
          <ThumbsUp className={`w-3 h-3 ${answer.hasUpvoted ? 'fill-emerald-600' : ''}`} />
          <span>{answer.upvoteCount}</span>
        </button>

        {isAuthor && (
          <button
            onClick={() => onDelete(answer.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            삭제
          </button>
        )}
      </div>
    </div>
  );
}
