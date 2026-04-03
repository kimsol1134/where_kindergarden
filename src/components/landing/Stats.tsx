export function Stats() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          <div className="brand-card flex flex-row items-center gap-4 rounded-[1.75rem] p-5 sm:flex-col sm:gap-2 sm:p-6 sm:text-center">
            <div className="text-3xl font-bold text-[var(--brand-leaf)] sm:text-4xl">7,950+</div>
            <div className="text-sm text-[var(--brand-ink-soft)]">유치원 알리미 기준 등록 기관</div>
          </div>
          <div className="brand-card flex flex-row items-center gap-4 rounded-[1.75rem] p-5 sm:flex-col sm:gap-2 sm:p-6 sm:text-center">
            <div className="text-3xl font-bold text-[var(--brand-leaf)] sm:text-4xl">전국 17개</div>
            <div className="text-sm text-[var(--brand-ink-soft)]">시/도 유치원 정보 보유</div>
          </div>
          <div className="brand-card flex flex-row items-center gap-4 rounded-[1.75rem] p-5 sm:flex-col sm:gap-2 sm:p-6 sm:text-center">
            <div className="text-3xl font-bold text-[var(--brand-leaf)] sm:text-4xl">무료</div>
            <div className="text-sm text-[var(--brand-ink-soft)]">회원가입 없이 바로 검색</div>
          </div>
        </div>
      </div>
    </section>
  );
}
