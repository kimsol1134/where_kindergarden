export function Stats() {
  return (
    <section className="relative overflow-hidden py-20">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(60,135,87,0.96),rgba(31,36,29,0.94))]" />
      <div className="absolute left-[-5rem] top-[-3rem] h-60 w-60 rounded-full bg-[rgba(244,216,106,0.24)] blur-3xl" />
      <div className="absolute right-[-6rem] bottom-[-4rem] h-72 w-72 rounded-full bg-[rgba(255,255,255,0.12)] blur-3xl" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 text-center text-white md:grid-cols-3">
          <div className="rounded-[2rem] border border-white/14 bg-white/6 p-6">
            <div className="mb-2 text-4xl font-bold text-[var(--brand-sun)]">7,950+</div>
            <div className="text-white/76">등록된 유치원</div>
          </div>
          <div className="rounded-[2rem] border border-white/14 bg-white/6 p-6">
            <div className="mb-2 text-4xl font-bold text-[var(--brand-sun)]">전국 17개 시/도</div>
            <div className="text-white/76">유치원 정보 보유</div>
          </div>
          <div className="rounded-[2rem] border border-white/14 bg-white/6 p-6">
            <div className="mb-2 text-4xl font-bold text-[var(--brand-sun)]">무료</div>
            <div className="text-white/76">회원가입 없는 간편 검색</div>
          </div>
        </div>
      </div>
    </section>
  );
}
