'use client';

import { useState } from 'react';
import { X, Send, Plus, Flag, Loader2 } from 'lucide-react';
import type { ReviewSource, ReviewSuggestion } from '@/types';

const SOURCE_OPTIONS: { value: ReviewSource; label: string }[] = [
  { value: 'naver_blog', label: '네이버 블로그' },
  { value: 'naver_cafe', label: '네이버 카페' },
  { value: 'google', label: '웹사이트' },
  { value: 'other', label: '기타' },
];

interface ReviewSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  kindergartenId: string;
  type: 'add' | 'delete';
  reviewId?: string;
  reviewTitle?: string;
}

export function ReviewSuggestionModal({
  isOpen,
  onClose,
  kindergartenId,
  type,
  reviewId,
  reviewTitle,
}: ReviewSuggestionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Add form state
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<ReviewSource>('naver_blog');

  // Delete form state
  const [reason, setReason] = useState('');

  // Common
  const [email, setEmail] = useState('');

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setSource('naver_blog');
    setReason('');
    setEmail('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: ReviewSuggestion = type === 'add'
        ? {
            type: 'add',
            kindergartenId,
            url,
            title,
            source,
            submitterEmail: email || undefined,
          }
        : {
            type: 'delete',
            kindergartenId,
            reviewId: reviewId!,
            reason,
            submitterEmail: email || undefined,
          };

      const response = await fetch('/api/review-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '제출 중 오류가 발생했습니다.');
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between ${
          type === 'add' ? 'bg-emerald-50' : 'bg-amber-50'
        }`}>
          <div className="flex items-center gap-2">
            {type === 'add' ? (
              <Plus className="w-5 h-5 text-emerald-600" />
            ) : (
              <Flag className="w-5 h-5 text-amber-600" />
            )}
            <h3 className={`font-bold ${
              type === 'add' ? 'text-emerald-900' : 'text-amber-900'
            }`}>
              {type === 'add' ? '후기 추가 제안' : '후기 삭제 제안'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {success ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Send className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-semibold text-gray-900">제안이 접수되었습니다!</p>
              <p className="text-sm text-gray-500 mt-1">검토 후 반영됩니다.</p>
            </div>
          ) : (
            <>
              {type === 'add' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      후기 URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://blog.naver.com/..."
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      후기 제목 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="후기 글 제목을 입력하세요"
                      required
                      maxLength={200}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      출처 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value as ReviewSource)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {SOURCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">삭제 제안 대상:</p>
                    <p className="font-medium text-gray-900 line-clamp-2">{reviewTitle}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      삭제 사유 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="삭제를 요청하는 이유를 입력하세요 (예: 링크가 만료됨, 잘못된 정보)"
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 (선택)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="답변받을 이메일 주소"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  검토 결과를 받으실 경우 입력하세요
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 ${
                  type === 'add'
                    ? 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300'
                    : 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    제출 중...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    제안 제출하기
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
