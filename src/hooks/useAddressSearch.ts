'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GeocodeResult } from '@/types';
import { useKindergartenStore } from '@/stores/kindergartenStore';
import { searchAddressWithKakaoSDK, isKakaoServicesLoaded } from '@/lib/kakaoServices';

/** 유치원 검색 결과 타입 */
export interface KindergartenSearchResult {
  kindercode: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'public' | 'private';
}

/** 주소 검색 상태 */
interface AddressSearchState {
  query: string;
  suggestions: GeocodeResult[];
  kindergartenSuggestions: KindergartenSearchResult[];
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
    kindergartenSuggestions: [],
    selectedAddress: null,
    isLoading: false,
    error: null,
    isOpen: false,
  });

  const kindergartenStore = useKindergartenStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 유치원 이름 검색 함수
  const searchKindergartens = useCallback(
    (searchQuery: string): KindergartenSearchResult[] => {
      // 데이터가 로드되지 않았으면 빈 배열 반환
      if (!kindergartenStore.isLoaded) {
        return [];
      }

      const allData = kindergartenStore.getAll();
      const queryLower = searchQuery.toLowerCase();

      // 이름에 검색어가 포함된 유치원 찾기 (최대 10개)
      const results = allData
        .filter((item) => item.name.toLowerCase().includes(queryLower))
        .slice(0, 10)
        .map((item) => ({
          kindercode: item.kindercode,
          name: item.name,
          address: item.address,
          lat: item.lat,
          lng: item.lng,
          type: item.type,
        }));

      return results;
    },
    [kindergartenStore]
  );

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
          kindergartenSuggestions: [],
          isOpen: false,
          isLoading: false,
        }));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // 유치원 이름 검색 (동기)
      const kindergartenResults = searchKindergartens(searchQuery);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        let addressResults: GeocodeResult[] = [];

        // Kakao SDK가 로드되었으면 클라이언트 사이드 검색 사용
        if (isKakaoServicesLoaded()) {
          addressResults = await searchAddressWithKakaoSDK(searchQuery);
        }

        // 요청이 취소되었으면 무시
        if (abortController.signal.aborted) {
          return;
        }

        const hasResults = addressResults.length > 0 || kindergartenResults.length > 0;

        setState((prev) => ({
          ...prev,
          suggestions: addressResults,
          kindergartenSuggestions: kindergartenResults,
          isLoading: false,
          isOpen: hasResults,
        }));
      } catch (err) {
        // AbortError는 무시
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        // 오류 시에도 유치원 검색 결과는 표시
        setState((prev) => ({
          ...prev,
          error: kindergartenResults.length > 0 ? null : '주소 검색 중 오류가 발생했습니다.',
          suggestions: [],
          kindergartenSuggestions: kindergartenResults,
          isLoading: false,
          isOpen: kindergartenResults.length > 0,
        }));
      }
    },
    [minQueryLength, searchKindergartens]
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
      query: address.placeName || address.address,
      suggestions: [],
      kindergartenSuggestions: [],
      isOpen: false,
    }));
  }, []);

  // 유치원 선택
  const selectKindergarten = useCallback((kindergarten: KindergartenSearchResult) => {
    setState((prev) => ({
      ...prev,
      query: kindergarten.name,
      suggestions: [],
      kindergartenSuggestions: [],
      isOpen: false,
    }));
  }, []);

  // 선택 초기화
  const clearSelection = useCallback(() => {
    setState({
      query: '',
      suggestions: [],
      kindergartenSuggestions: [],
      selectedAddress: null,
      isLoading: false,
      error: null,
      isOpen: false,
    });
  }, []);

  const clearQuery = useCallback(() => {
    setState((prev) => ({
      ...prev,
      query: '',
      suggestions: [],
      kindergartenSuggestions: [],
      isLoading: false,
      error: null,
      isOpen: false,
    }));
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
    selectKindergarten,
    clearSelection,
    clearQuery,
    setOpen,
    clearError,
  };
}
