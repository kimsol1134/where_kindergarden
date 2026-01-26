'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Answer } from '@/types/community';
import { fetchAnswers } from '@/lib/supabase/answers';
import { useAuthStore } from '@/stores/authStore';

interface UseAnswersResult {
  answers: Answer[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const EMPTY_ANSWERS: Answer[] = [];

export function useAnswers(questionId: string | null): UseAnswersResult {
  const [answers, setAnswers] = useState<Answer[]>(EMPTY_ANSWERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const user = useAuthStore((state) => state.user);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!questionId) return;

    isMounted.current = true;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      const result = await fetchAnswers(questionId, user?.id);

      if (!cancelled && isMounted.current) {
        setAnswers(result.data);
        setError(result.error);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      isMounted.current = false;
    };
  }, [questionId, user?.id, fetchTrigger]);

  const refetch = useCallback(() => {
    setFetchTrigger((prev) => prev + 1);
  }, []);

  const effectiveAnswers = questionId ? answers : EMPTY_ANSWERS;

  return { answers: effectiveAnswers, isLoading, error, refetch };
}
