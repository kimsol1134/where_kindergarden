export function Stats() {
  return (
    <section className="py-20 bg-emerald-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6">
            <div className="text-4xl font-bold mb-2 text-emerald-400">7,950+</div>
            <div className="text-emerald-100">등록된 유치원</div>
          </div>
          <div className="p-6 border-t md:border-t-0 md:border-l border-emerald-800">
            <div className="text-4xl font-bold mb-2 text-emerald-400">전국 17개 시/도</div>
            <div className="text-emerald-100">유치원 정보 보유</div>
          </div>
          <div className="p-6 border-t md:border-t-0 md:border-l border-emerald-800">
            <div className="text-4xl font-bold mb-2 text-emerald-400">무료</div>
            <div className="text-emerald-100">회원가입 없는 간편 검색</div>
          </div>
        </div>
      </div>
    </section>
  );
}
