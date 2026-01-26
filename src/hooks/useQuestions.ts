'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Question, QuestionCategory } from '@/types/community';
import { fetchQuestions } from '@/lib/supabase/questions';

interface UseQuestionsResult {
  questions: Question[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useQuestions(
  kindergartenId: string,
  category?: QuestionCategory
): UseQuestionsResult {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      const result = await fetchQuestions(kindergartenId, { category });

      if (!cancelled && isMounted.current) {
        setQuestions(result.data);
        setError(result.error);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      isMounted.current = false;
    };
  }, [kindergartenId, category, fetchTrigger]);

  const refetch = useCallback(() => {
    setFetchTrigger((prev) => prev + 1);
  }, []);

  return { questions, isLoading, error, refetch };
}
