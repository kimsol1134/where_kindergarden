'use client';

import type { QuestionCategory } from '@/types/community';
import { CATEGORY_LABELS } from '@/types/community';

interface CategoryFilterProps {
  selected: QuestionCategory | undefined;
  onSelect: (category: QuestionCategory | undefined) => void;
}

const CATEGORIES: QuestionCategory[] = [
  'meal',
  'teacher',
  'facility',
  'bus',
  'program',
  'safety',
  'cost',
  'other',
];

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect(undefined)}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          selected === undefined
            ? 'bg-emerald-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        전체
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat === selected ? undefined : cat)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selected === cat
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}
