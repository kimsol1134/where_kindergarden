'use client';

import { Newspaper } from 'lucide-react';

export function ReviewEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
        <Newspaper className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-600 mb-1">수집된 후기가 없습니다</p>
      <p className="text-xs text-gray-400">
        이 유치원의 후기 정보가 아직 수집되지 않았습니다.
      </p>
    </div>
  );
}
