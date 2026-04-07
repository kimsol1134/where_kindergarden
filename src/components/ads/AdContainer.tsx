'use client';

import { WebAdBanner } from './WebAdBanner';

export function AdContainer() {
  return (
    <div className="w-full flex justify-center items-center bg-gray-50 border-t border-gray-100 dark:bg-gray-900 dark:border-gray-800">
      <WebAdBanner />
    </div>
  );
}
