'use client';

import { useState } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import { useAuthStore } from '@/stores/authStore';
import { NicknameSetup } from './NicknameSetup';

type AuthStep = 'email' | 'sent' | 'nickname';

export function EmailAuthModal() {
  const { isAuthModalOpen, closeAuthModal, signInWithOtp, user, profile } = useAuthStore();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<AuthStep>('email');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  // 로그인은 됐지만 닉네임이 없는 경우
  if (user && !profile) {
    return (
      <ModalWrapper onClose={closeAuthModal}>
        <NicknameSetup onComplete={closeAuthModal} />
      </ModalWrapper>
    );
  }

  // 이미 로그인 + 프로필까지 있으면 닫기
  if (user && profile) {
    closeAuthModal();
    return null;
  }

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('올바른 이메일 주소를 입력해주세요.');
      setIsSubmitting(false);
      return;
    }

    const result = await signInWithOtp(trimmedEmail);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setStep('sent');
    }
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setError(null);
    closeAuthModal();
  };

  return (
    <ModalWrapper onClose={handleClose}>
      {step === 'email' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">로그인</h3>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            이메일을 입력하면 로그인 링크를 보내드립니다.
            <br />
            <span className="text-gray-400 text-xs">별도 비밀번호 없이 이메일만으로 로그인합니다.</span>
          </p>

          <form onSubmit={handleSubmitEmail}>
            <div className="relative mb-4">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium text-sm hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  전송 중...
                </>
              ) : (
                '로그인 링크 전송'
              )}
            </button>
          </form>
        </div>
      )}

      {step === 'sent' && (
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">이메일을 확인해주세요</h3>
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium text-gray-900">{email}</span>
            <br />
            위 주소로 로그인 링크를 전송했습니다.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            이메일이 도착하지 않으면 스팸함을 확인해주세요.
          </p>
          <button
            onClick={handleClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            닫기
          </button>
        </div>
      )}
    </ModalWrapper>
  );
}

function ModalWrapper({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[60]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm bg-white rounded-2xl shadow-xl animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>
  );
}
