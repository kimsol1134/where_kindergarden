'use client';

import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import type { Question } from '@/types/community';
import { CATEGORY_LABELS } from '@/types/community';

interface QuestionCardProps {
  question: Question;
  onClick: () => void;
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

export function QuestionCard({ question, onClick }: QuestionCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-white border border-gray-100 rounded-xl hover:border-emerald-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {CATEGORY_LABELS[question.category]}
        </span>
        <span className="text-xs text-gray-400">
          {formatRelativeTime(question.createdAt)}
        </span>
      </div>

      <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
        {question.title}
      </h4>

      {question.content && (
        <p className="text-xs text-gray-500 line-clamp-1 mb-2">
          {question.content}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{question.authorNickname}</span>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{question.answerCount}</span>
        </div>
      </div>
    </button>
  );
}
