'use client';

import { CompareHeader } from '@/components/compare/CompareHeader';
import { CompareGrid } from '@/components/compare/CompareGrid';

export default function ComparePage() {
  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen">
      <CompareHeader />
      <main className="max-w-5xl mx-auto pb-24">
        <CompareGrid />
      </main>
    </div>
  );
}
