'use client';

import { useState } from 'react';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { cn } from '@/lib/utils';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      question: '어린이집도 검색할 수 있나요?',
      answer:
        '현재는 교육부 유치원 알리미에 등록된 유치원만 제공하고 있습니다. 어린이집은 관할 기관이 달라 별도 데이터 연동이 필요하며, 추후 지원을 검토 중입니다.',
    },
    {
      question: '정보가 얼마나 최신인가요?',
      answer:
        '교육부 유치원 알리미의 공식 데이터를 기반으로 하며, 정기적으로 업데이트됩니다. 원아 수, 교사 수 등 일부 항목은 전년도 공시 기준일 수 있으니, 중요한 사항은 해당 기관에 직접 확인해 주세요.',
    },
    {
      question: '비용 정보도 알 수 있나요?',
      answer:
        '기본 교육비 정보는 제공되나, 특별활동비 등 추가 비용은 변동될 수 있어 해당 기관에 직접 문의하시는 것을 권장합니다.',
    },
    {
      question: '위치 정보는 안전한가요?',
      answer:
        '네, 안전합니다. 위치 정보는 오직 현재 위치 기준 주변 시설을 검색하는 용도로만 사용되며 서버에 저장되지 않습니다.',
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
              className="group brand-card rounded-[1.75rem] transition-colors hover:border-[rgba(78,169,109,0.42)]"
            >
              <button
                onClick={() => toggleFAQ(index)}
                aria-expanded={openIndex === index}
                className="flex w-full cursor-pointer items-center justify-between p-6 text-left"
              >
                <h3 className="font-bold text-[var(--brand-ink)]">{faq.question}</h3>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 shrink-0 text-[var(--brand-ink-soft)] transition-transform duration-300 group-hover:text-[var(--brand-leaf)]',
                    openIndex === index && 'rotate-180'
                  )}
                />
              </button>
              <div
                className={cn(
                  'grid transition-[grid-template-rows] duration-300 ease-out',
                  openIndex === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-6 text-sm leading-relaxed text-[var(--brand-ink-soft)]">
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
