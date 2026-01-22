'use client';

import { useMemo } from 'react';
import type { Kindergarten } from '@/types';
import type { FavoriteItem } from '@/stores/favoriteStore';
import { useKindergartenStore, useSearchStore } from '@/stores';
import { transformToKindergarten } from '@/lib/transforms';

/**
 * 찜한 유치원들의 전체 데이터를 조회하는 훅
 * 정렬(거리순, 정원순)에 필요한 전체 데이터를 Map으로 반환
 *
 * @param items - 찜한 유치원 목록 (FavoriteItem[])
 * @returns Map<kindercode, Kindergarten> - 유치원 전체 데이터
 */
export function useFavoriteKindergartens(
  items: FavoriteItem[]
): Map<string, Kindergarten> {
  const { getByKindercode, isLoaded } = useKindergartenStore();
  const location = useSearchStore((s) => s.location);

  return useMemo(() => {
    if (!isLoaded) return new Map();

    const map = new Map<string, Kindergarten>();

    items.forEach((item) => {
      const raw = getByKindercode(item.kindercode);
      if (raw) {
        map.set(
          item.kindercode,
          transformToKindergarten(raw, location ?? undefined)
        );
      }
    });

    return map;
  }, [items, isLoaded, getByKindercode, location]);
}

/**
 * 단일 찜한 유치원의 전체 데이터를 조회하는 훅
 *
 * @param kindercode - 조회할 유치원 코드 (null이면 null 반환)
 * @returns { kindergarten, isLoading }
 */
export function useFavoriteKindergarten(kindercode: string | null): {
  kindergarten: Kindergarten | null;
  isLoading: boolean;
} {
  const { getByKindercode, isLoaded } = useKindergartenStore();
  const location = useSearchStore((s) => s.location);

  const kindergarten = useMemo(() => {
    if (!kindercode || !isLoaded) return null;

    const raw = getByKindercode(kindercode);
    if (!raw) return null;

    return transformToKindergarten(raw, location ?? undefined);
  }, [kindercode, isLoaded, getByKindercode, location]);

  return {
    kindergarten,
    isLoading: !isLoaded,
  };
}
