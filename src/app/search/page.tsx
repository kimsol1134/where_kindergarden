'use client';

import { SearchHeader } from '@/components/search/SearchHeader';
import { KindergartenList } from '@/components/search/KindergartenList';
import { MapView } from '@/components/search/MapView';
import { CompareFloatingBar } from '@/components/search/CompareFloatingBar';

export default function SearchPage() {
  return (
    <div className="bg-gray-50 text-gray-800 flex flex-col h-screen">
      <SearchHeader />
      <main className="flex-1 flex overflow-hidden relative">
        <KindergartenList />
        <MapView />
      </main>
      <CompareFloatingBar />
    </div>
  );
}
