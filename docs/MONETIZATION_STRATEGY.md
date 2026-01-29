# 우리동네 유치원 앱 - 사용자 확보 & 수익화 전략

> 작성일: 2026-01-28

## 현재 상태

| 항목 | 상태 |
|------|------|
| iOS | **App Store 정식 출시** |
| Android | 배포 준비 중 |
| 웹 | Vercel 운영 중 |
| MAU | ~10명 |
| 유치원 데이터 | 7,950개 전국 |
| 후기 데이터 | 4,876건 (18% 커버리지) |
| 광고 | 배너 광고만 (전면 광고 없음) |

---

## 핵심 진단

**MAU 10명 → 수익화는 시기상조**
- 현재 광고 수익: 월 ~₩2,700 (무의미)
- **지금은 사용자 확보가 100배 더 중요**

---

## 사용자 확보 전략 (마케팅)

### 1순위: ASO (앱스토어 최적화) - 무료, 가성비 최고

**왜 중요한가?**
- 앱 다운로드의 65%가 앱스토어 검색에서 발생
- 한 번 최적화하면 iOS/Android 모두 효과
- [AppTweak에 따르면](https://www.apptweak.com/ko/aso-blog/what-is-app-store-optimization-and-why-is-aso-important) CPP 적용 시 전환율 20-35% 향상

**즉시 할 일:**
```
1. 앱 이름 최적화
   현재: "우리동네 유치원"
   개선: "우리동네 유치원 - 유치원 비교, 어린이집 후기"

2. 키워드 (App Store Connect)
   추천: 유치원, 어린이집, 유치원후기, 유치원비교,
         유치원검색, 어린이집찾기, 유치원선택, 유아교육

3. 앱 설명 첫 3줄 (가장 중요)
   - 핵심 기능 명시
   - "위치 기반", "실제 후기", "비교" 키워드 포함

4. 스크린샷 개선
   - 기능 설명 텍스트 추가
   - Before/After 비교 이미지
```

---

### 2순위: 맘카페 바이럴 - 무료, 고신뢰도

**타겟 카페 (네이버)**
| 카페명 | 회원수 | 특징 |
|--------|--------|------|
| 맘스홀릭베이비 | 370만+ | 영유아 육아 최대 |
| 육아대디 | 50만+ | 아빠 타겟 |
| 지역 맘카페 | 다양 | 서울, 경기 지역별 |

**전략:**
1. **체험단 후기** 형식으로 작성
   - "유치원 선택 고민하다가 발견한 앱"
   - 실제 사용 스크린샷 첨부
   - 솔직한 장단점 언급 (신뢰도↑)

2. **Q&A 답변에 자연스럽게 언급**
   - "유치원 어디가 좋아요?" 질문에 답변
   - "저는 이 앱으로 비교해봤어요"

**주의사항:**
- 광고티 나면 역효과
- 카페 규정 확인 (홍보글 금지 카페 있음)
- [맘카페 마케팅 가이드](https://blog.awesomecorp.kr/blog/%EB%B0%94%EC%9D%B4%EB%9F%B4%EB%A7%88%EC%BC%80%ED%8C%85/%EC%84%B1%EA%B3%B5%EC%A0%81%EC%9D%B8-%EB%A7%98%EC%B9%B4%ED%8E%98-%EB%B0%94%EC%9D%B4%EB%9F%B4-%EB%A7%88%EC%BC%80%ED%8C%85-%EC%A0%84%EB%9E%B5) 참고

---

### 3순위: 바이럴 콘텐츠 - 무료, 고효과

**아이디어: "우리 아이 맞춤 유치원 테스트"**

[오늘의집 사례](https://www.openads.co.kr/content/contentDetail?contsId=5333)처럼 심리테스트 형식:
- "아이 성향에 맞는 유치원 유형은?"
- 5-7개 질문 → 결과 공유
- 결과 페이지에서 앱 다운로드 유도

**구현:**
- 별도 웹페이지 (예: kindergarten-test.vercel.app)
- 카카오톡/인스타그램 공유 기능
- 로그인 없이 바로 참여 가능

---

### 4순위: Android 출시 - 잠재 사용자 2배

**준비물:**
- Google Play Console 계정 (₩25,000 일회성)
- 개인정보처리방침 URL (이미 있음)
- 앱 스크린샷, 설명

**명령어:**
```bash
# Android 빌드
pnpm build && npx cap sync android
npx cap open android  # Android Studio 열기
# Build → Generate Signed Bundle → AAB 파일 생성
```

---

### 5순위: SEO 블로그 포스팅

**목표 키워드:**
- "유치원 선택 기준"
- "어린이집 유치원 차이"
- "2026년 유치원 입학 준비"

**작성 채널:**
- 네이버 블로그 (검색 노출↑)
- 브런치 (신뢰도↑)
- 티스토리 (SEO↑)

---

## 수익화 로드맵 (MAU 기준)

| 단계 | MAU | 수익화 전략 | 예상 월수익 |
|------|-----|------------|------------|
| 현재 | 10명 | 배너만 유지 | ~₩3,000 |
| 1단계 | 500명 | 전면 광고 추가 | ~₩50,000 |
| 2단계 | 2,000명 | 보상형 광고 | ~₩200,000 |
| 3단계 | 5,000명 | 프리미엄 구독 | ~₩700,000 |
| 4단계 | 10,000명 | B2B + 제휴 | ~₩1,500,000 |

### MAU 500명 도달 시: 전면 광고 추가

```typescript
// src/components/ads/InterstitialAd.tsx
// 비교 결과 확인 후 또는 3번째 검색 후 표시
// AdMob Interstitial 사용
```

### MAU 5,000명 도달 시: Freemium 모델

**무료 기능:**
- 유치원 검색, 지도, 기본 정보
- 후기 2개 미리보기
- 3개 비교

**프리미엄 (월 ₩2,900):**
- 후기 무제한
- 10개 비교
- PDF 리포트
- 광고 제거

---

## 지금 당장 할 일 (우선순위)

### 이번 주
1. [ ] **ASO 최적화**
   - App Store Connect에서 앱 이름, 키워드, 설명 수정
   - 스크린샷 개선

2. [ ] **맘카페 후기 1개 작성**
   - 맘스홀릭베이비 또는 지역 맘카페
   - 자연스러운 체험 후기 형식

### 다음 주
3. [ ] **Android 빌드 & Play Store 제출**
   - AAB 파일 생성
   - Play Console 심사 제출

4. [ ] **블로그 포스팅 1개**
   - "유치원 선택 시 고려할 5가지"
   - 앱 소개 자연스럽게 포함

### 한 달 내
5. [ ] **바이럴 테스트 페이지 제작** (선택)
   - 심리테스트 형식 미니 사이트

---

## 참고 자료

- [ASO 가이드 - AppTweak](https://www.apptweak.com/ko/aso-blog/what-is-app-store-optimization-and-why-is-aso-important)
- [앱 출시 성공 전략 - AppsFlyer](https://www.appsflyer.com/ko/blog/tips-strategy/launch-app-success-steps/)
- [맘카페 바이럴 마케팅](https://blog.awesomecorp.kr/blog/%EB%B0%94%EC%9D%B4%EB%9F%B4%EB%A7%88%EC%BC%80%ED%8C%85/%EC%84%B1%EA%B3%B5%EC%A0%81%EC%9D%B8-%EB%A7%98%EC%B9%B4%ED%8E%98-%EB%B0%94%EC%9D%B4%EB%9F%B4-%EB%A7%88%EC%BC%80%ED%8C%85-%EC%A0%84%EB%9E%B5)
- [바이럴 마케팅 성공기 - 오늘의집](https://www.openads.co.kr/content/contentDetail?contsId=5333)
- [앱 마케팅 효율 전략 - Airbridge](https://www.airbridge.io/ko/blog/6-marketing-efficiency)
