'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      question: '위치 정보는 안전한가요?',
      answer:
        '네, 안전합니다. 위치 정보는 오직 현재 위치 기준 주변 시설을 검색하는 용도로만 사용되며 서버에 저장되지 않습니다.',
    },
    {
      question: '비용 정보도 알 수 있나요?',
      answer:
        '기본 교육비 정보는 제공되나, 특별활동비 등 추가 비용은 변동될 수 있어 해당 기관에 직접 문의하시는 것을 권장합니다.',
    },
    {
      question: '모바일에서도 잘 보이나요?',
      answer:
        "우리동네 유치원은 '모바일 퍼스트'로 설계되어 스마트폰에서 가장 최적화된 경험을 제공합니다.",
    },
  ];

  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="mb-12 text-3xl font-bold tracking-[-0.04em] text-[var(--brand-ink)]">
          자주 묻는 질문
        </h2>

        <div className="space-y-4 text-left">
          {faqs.map((faq, index) => (
            <div
              key={index}
              onClick={() => toggleFAQ(index)}
              className="group brand-card cursor-pointer rounded-[1.6rem] p-6 transition-colors hover:border-[rgba(78,169,109,0.42)]"
            >
              <h3 className="flex items-center justify-between font-bold text-[var(--brand-ink)]">
                {faq.question}
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-[var(--brand-ink-soft)] transition-transform duration-300 group-hover:text-[var(--brand-leaf)]',
                    openIndex === index && 'rotate-180'
                  )}
                />
              </h3>
              <div
                className={cn(
                  'grid transition-[grid-template-rows] duration-300 ease-out',
                  openIndex === index ? 'mt-3 grid-rows-[1fr]' : 'grid-rows-[0fr]'
                )}
              >
                <div className="overflow-hidden">
                  <p className="text-sm leading-relaxed text-[var(--brand-ink-soft)]">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
