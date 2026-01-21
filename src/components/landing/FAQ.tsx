'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn utility exists, usually standard in shadcn projects

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      question: "위치 정보는 안전한가요?",
      answer: "네, 안전합니다. 위치 정보는 오직 현재 위치 기준 주변 시설을 검색하는 용도로만 사용되며 서버에 저장되지 않습니다."
    },
    {
      question: "비용 정보도 알 수 있나요?",
      answer: "기본 교육비 정보는 제공되나, 특별활동비 등 추가 비용은 변동될 수 있어 해당 기관에 직접 문의하시는 것을 권장합니다."
    },
    {
      question: "모바일에서도 잘 보이나요?",
      answer: "우리동네 유치원은 '모바일 퍼스트'로 설계되어 스마트폰에서 가장 최적화된 경험을 제공합니다."
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-12">자주 묻는 질문</h2>
        
        <div className="space-y-4 text-left">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              onClick={() => toggleFAQ(index)}
              className="group border border-gray-200 rounded-xl p-6 hover:border-emerald-500 transition-colors cursor-pointer bg-gray-50"
            >
              <h3 className="font-bold text-gray-900 flex justify-between items-center">
                {faq.question}
                <ChevronDown 
                  className={cn(
                    "w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-transform duration-300",
                    openIndex === index && "rotate-180"
                  )} 
                />
              </h3>
              <div 
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out",
                  openIndex === index ? "grid-rows-[1fr] mt-3" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <p className="text-gray-600 text-sm leading-relaxed">
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
