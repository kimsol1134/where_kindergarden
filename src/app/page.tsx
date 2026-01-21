'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleLocationSearch = () => {
    if (!navigator.geolocation) {
      alert('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        router.push(`/search?lat=${latitude}&lng=${longitude}&radius=1`);
      },
      () => {
        alert('위치 권한이 필요합니다. 주소를 직접 입력해주세요.');
      }
    );
  };

  const handleAddressSearch = () => {
    router.push('/search');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <main className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900">우리동네 유치원</h1>
          <p className="text-gray-600">
            주변 유치원을 찾고 한눈에 비교하세요
          </p>
        </div>

        <div className="flex w-full flex-col gap-4">
          <button
            onClick={handleLocationSearch}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 text-white transition-colors hover:bg-gray-800"
          >
            <span className="text-lg">현재 위치로 검색하기</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-sm text-gray-500">또는</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            onClick={handleAddressSearch}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-gray-900 transition-colors hover:bg-gray-50"
          >
            <span className="text-lg">주소로 검색하기</span>
          </button>
        </div>
      </main>
    </div>
  );
}
