'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GeocodeResult, ApiResponse } from '@/types';

/** 주소 검색 상태 */
interface AddressSearchState {
  query: string;
  suggestions: GeocodeResult[];
  selectedAddress: GeocodeResult | null;
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
}

/** 주소 검색 훅 옵션 */
interface AddressSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
}

const DEFAULT_OPTIONS = {
  debounceMs: 300,
  minQueryLength: 2,
} as const;

/**
 * 주소 검색 자동완성 훅
 */
export function useAddressSearch(options: AddressSearchOptions = {}) {
  const debounceMs = options.debounceMs ?? DEFAULT_OPTIONS.debounceMs;
  const minQueryLength = options.minQueryLength ?? DEFAULT_OPTIONS.minQueryLength;

  const [state, setState] = useState<AddressSearchState>({
    query: '',
    suggestions: [],
    selectedAddress: null,
    isLoading: false,
    error: null,
    isOpen: false,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 검색 함수
  const searchAddress = useCallback(
    async (searchQuery: string) => {
      // 이전 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (searchQuery.length < minQueryLength) {
        setState((prev) => ({
          ...prev,
          suggestions: [],
          isOpen: false,
          isLoading: false,
        }));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          mode: 'search',
        });

        const response = await fetch(`/api/geocode?${params}`, {
          signal: abortController.signal,
        });
        const json: ApiResponse<GeocodeResult[]> = await response.json();

        if (!json.success) {
          setState((prev) => ({
            ...prev,
            error: json.error,
            suggestions: [],
            isLoading: false,
            isOpen: false,
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          suggestions: json.data,
          isLoading: false,
          isOpen: json.data.length > 0,
        }));
      } catch (err) {
        // AbortError는 무시
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        setState((prev) => ({
          ...prev,
          error: '주소 검색 중 오류가 발생했습니다.',
          suggestions: [],
          isLoading: false,
          isOpen: false,
        }));
      }
    },
    [minQueryLength]
  );

  // 디바운스된 쿼리 변경 핸들러
  const setQuery = useCallback(
    (newQuery: string) => {
      setState((prev) => ({ ...prev, query: newQuery }));

      // 이전 디바운스 타이머 취소
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // 새 디바운스 타이머 설정
      debounceRef.current = setTimeout(() => {
        searchAddress(newQuery);
      }, debounceMs);
    },
    [debounceMs, searchAddress]
  );

  // 주소 선택
  const selectAddress = useCallback((address: GeocodeResult) => {
    setState((prev) => ({
      ...prev,
      selectedAddress: address,
      query: address.address,
      suggestions: [],
      isOpen: false,
    }));
  }, []);

  // 선택 초기화
  const clearSelection = useCallback(() => {
    setState({
      query: '',
      suggestions: [],
      selectedAddress: null,
      isLoading: false,
      error: null,
      isOpen: false,
    });
  }, []);

  // 드롭다운 열기/닫기
  const setOpen = useCallback((isOpen: boolean) => {
    setState((prev) => ({ ...prev, isOpen }));
  }, []);

  // 에러 초기화
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // 클린업
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    setQuery,
    selectAddress,
    clearSelection,
    setOpen,
    clearError,
  };
}
