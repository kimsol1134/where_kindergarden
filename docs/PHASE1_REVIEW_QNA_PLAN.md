# Phase 1: 후기 큐레이션 + Q&A 게시판

> 분당/판교 지역 한정, 실제 유치원 경험자의 후기를 모으기 위한 첫 단계

---

## 1. 개요

### 목표

- **Cold Start 해결**: 직접 후기 수집 대신, 외부 후기 링크 큐레이션 + Q&A로 시작
- **지역 밀도 확보**: 분당/판교(약 100개 유치원)에서 "유치원 후기 = 이 앱" 포지셔닝
- **커뮤니티 씨앗 심기**: Q&A 답변자 = 미래의 인증 후기 작성자

### 핵심 가설

| 가설 | 검증 방법 |
|------|-----------|
| 부모들은 유치원 후기를 찾기 위해 여러 맘카페를 돌아다닌다 | 검색 유입량 분석 |
| "질문에 답변"은 "후기 작성"보다 참여 장벽이 낮다 | Q&A 답변율 측정 |
| 졸업생 맘이 현재 재원생보다 참여 의지가 높다 | 사용자 세그먼트 분석 |

### 타겟 지역

- **성남시 분당구**: 약 60개 유치원
- **성남시 수정구/중원구 일부**: 약 40개 유치원
- 시군구 코드: `41135` (분당구)

---

## 2. 핵심 기능

### 2.1 후기 큐레이션 (외부 링크 수집)

유치원별로 맘카페/블로그의 관련 후기 링크를 모아서 보여주는 기능.

#### 사용자 흐름

```
유치원 상세 → "후기 모음" 탭 → 외부 링크 리스트
                                   ├── [맘카페] "00유치원 1년 다녀본 후기"
                                   ├── [블로그] "분당 00유치원 솔직 리뷰"
                                   └── [+ 후기 링크 제보하기]
```

#### 링크 수집 방식

| 방식 | 설명 | 우선순위 |
|------|------|----------|
| **사용자 제보** | 앱 내 "링크 제보" 버튼 | P0 (핵심) |
| **운영자 수동 수집** | 네이버 카페/블로그 검색 후 등록 | P0 (초기) |
| **자동 수집 (향후)** | 네이버 검색 API 활용 | P2 (Phase 2) |

#### 링크 메타데이터

```typescript
interface ReviewLink {
  id: string;
  kindergartenId: string;        // kindercode
  url: string;                   // 원본 URL
  title: string;                 // 글 제목
  source: 'cafe' | 'blog' | 'community' | 'other';
  sourceName: string;            // "분당맘카페", "네이버블로그" 등
  submittedBy: string;           // 제보자 userId
  submittedAt: string;           // 제보 일시
  upvoteCount: number;           // "도움이 됐어요" 수
  reportCount: number;           // 신고 수
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  verifiedAt: string | null;     // 운영자 확인 일시
}
```

#### 링크 관리 정책

- 운영자 승인 후 노출 (스팸/광고 방지)
- 6개월 이상 된 글은 "오래된 후기" 라벨 표시
- 신고 3회 이상 시 자동 비공개
- 원본 글 삭제 감지 시 자동 비공개

---

### 2.2 Q&A 게시판

"이 유치원 어때요?" 형태의 질문-답변 게시판.

#### 사용자 흐름

```
유치원 상세 → "질문하기" 탭
  ├── 질문 목록 (최신순/답변많은순)
  │     ├── "급식은 직접 조리하나요?" (답변 3)
  │     ├── "통학버스 안전한가요?" (답변 1)
  │     └── "방과후 영어 수업 어때요?" (답변 0)
  └── [질문하기] 버튼
```

#### 질문 카테고리

```typescript
type QuestionCategory =
  | 'meal'           // 급식
  | 'teacher'        // 교사/원장
  | 'facility'       // 시설
  | 'bus'            // 통학버스
  | 'program'        // 교육과정/방과후
  | 'safety'         // 안전
  | 'atmosphere'     // 분위기/문화
  | 'cost'           // 비용
  | 'other';         // 기타
```

#### 데이터 모델

```typescript
interface Question {
  id: string;
  kindergartenId: string;
  authorId: string;
  category: QuestionCategory;
  title: string;                 // 질문 제목 (최대 100자)
  content: string | null;        // 상세 내용 (선택, 최대 500자)
  answerCount: number;
  viewCount: number;
  createdAt: string;
  status: 'active' | 'closed' | 'reported';
}

interface Answer {
  id: string;
  questionId: string;
  authorId: string;
  content: string;               // 답변 내용 (최대 1000자)
  relation: AnswerRelation;      // 작성자와 유치원 관계
  attendPeriod: string | null;   // "2023-2025" 재원 기간
  upvoteCount: number;
  createdAt: string;
  status: 'active' | 'reported' | 'hidden';
}

type AnswerRelation =
  | 'current_parent'    // 현재 재원 중인 학부모
  | 'graduated_parent'  // 졸업생 학부모
  | 'prospective'       // 입학 예정/고려 중
  | 'other';            // 기타
```

#### 답변자 프로필

- **자기 신고 방식**: "현재 재원 중 / 졸업생 / 입학 예정" 선택
- **재원 기간 입력**: "2023년 ~ 2025년" (선택 사항)
- **인증 없음** (Phase 1에서는 자기 신고만)
- **Phase 2+**: 재원증명 인증 시 "인증됨" 뱃지 부여

---

### 2.3 사용자 시스템

#### 가입/인증

```
Phase 1: 최소한의 가입
├── 카카오 소셜 로그인 (필수)
├── 닉네임 설정
├── 관심 지역 선택 (분당/판교)
└── 자녀 정보 (선택): 나이, 재원 유치원
```

#### 사용자 등급

| 등급 | 조건 | 권한 |
|------|------|------|
| 일반 | 가입 | 질문, 링크 제보, 좋아요 |
| 답변자 | 답변 3개 이상 | 답변자 뱃지 |
| 선배맘 | 답변 10개 + 좋아요 20개 | 선배맘 뱃지, 프로필 강조 |

---

## 3. 데이터베이스 스키마

### Supabase 테이블 추가

```sql
-- 사용자 프로필 (Supabase Auth 연동)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nickname VARCHAR(20) NOT NULL,
  region_code VARCHAR(10),           -- 관심 지역 시군구 코드
  child_birth_year INTEGER,          -- 자녀 출생년도
  child_kindergarten VARCHAR(20),    -- 자녀 재원 유치원 kindercode
  answer_count INTEGER DEFAULT 0,
  upvote_received INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 후기 링크 큐레이션
CREATE TABLE review_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kindergarten_id VARCHAR(20) NOT NULL,   -- kindercode
  url TEXT NOT NULL,
  title VARCHAR(200) NOT NULL,
  source VARCHAR(20) NOT NULL,            -- cafe, blog, community, other
  source_name VARCHAR(50),
  submitted_by UUID REFERENCES user_profiles(id),
  upvote_count INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',   -- pending, approved, rejected, expired
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_url UNIQUE(url)
);

-- Q&A 질문
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kindergarten_id VARCHAR(20) NOT NULL,
  author_id UUID REFERENCES user_profiles(id),
  category VARCHAR(20) NOT NULL,
  title VARCHAR(100) NOT NULL,
  content TEXT,
  answer_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Q&A 답변
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  author_id UUID REFERENCES user_profiles(id),
  content TEXT NOT NULL,
  relation VARCHAR(30) NOT NULL,          -- current_parent, graduated_parent, etc.
  attend_period VARCHAR(20),              -- "2023-2025"
  upvote_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 좋아요 (중복 방지)
CREATE TABLE upvotes (
  user_id UUID REFERENCES user_profiles(id),
  target_type VARCHAR(20) NOT NULL,       -- review_link, answer
  target_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY(user_id, target_type, target_id)
);

-- 신고
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES user_profiles(id),
  target_type VARCHAR(20) NOT NULL,       -- review_link, question, answer
  target_id UUID NOT NULL,
  reason VARCHAR(50) NOT NULL,            -- spam, inappropriate, fake, etc.
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_review_links_kindergarten ON review_links(kindergarten_id, status);
CREATE INDEX idx_questions_kindergarten ON questions(kindergarten_id, status);
CREATE INDEX idx_answers_question ON answers(question_id, status);
CREATE INDEX idx_upvotes_target ON upvotes(target_type, target_id);
```

### RLS (Row Level Security) 정책

```sql
-- 읽기: 모든 사용자 (approved 상태만)
-- 쓰기: 인증된 사용자만
-- 수정/삭제: 본인만
-- 관리: service_role만
```

---

## 4. API 설계

### 엔드포인트

```
POST   /api/auth/kakao              # 카카오 로그인
GET    /api/kindergartens/:id/reviews  # 후기 링크 목록
POST   /api/kindergartens/:id/reviews  # 후기 링크 제보
POST   /api/reviews/:id/upvote       # 후기 좋아요
POST   /api/reviews/:id/report       # 후기 신고

GET    /api/kindergartens/:id/questions  # 질문 목록
POST   /api/kindergartens/:id/questions  # 질문 작성
GET    /api/questions/:id/answers     # 답변 목록
POST   /api/questions/:id/answers     # 답변 작성
POST   /api/answers/:id/upvote        # 답변 좋아요
POST   /api/answers/:id/report        # 답변/질문 신고
```

---

## 5. UI 컴포넌트 설계

### 유치원 상세 페이지 변경

```
기존: 유치원 상세 = 공공 데이터만 표시
변경: 탭 추가

[기본정보] [후기 모음] [Q&A]
```

### 새로운 컴포넌트

```
src/components/review/
├── ReviewLinkList.tsx          # 후기 링크 목록
├── ReviewLinkCard.tsx          # 개별 링크 카드
├── ReviewLinkSubmitForm.tsx    # 링크 제보 폼
└── ReviewLinkEmpty.tsx         # 후기 없을 때 CTA

src/components/qna/
├── QuestionList.tsx            # 질문 목록
├── QuestionCard.tsx            # 질문 카드
├── QuestionForm.tsx            # 질문 작성 폼
├── AnswerList.tsx              # 답변 목록
├── AnswerCard.tsx              # 답변 카드 (작성자 관계 표시)
├── AnswerForm.tsx              # 답변 작성 폼
└── CategoryFilter.tsx          # 카테고리 필터

src/components/auth/
├── KakaoLoginButton.tsx        # 카카오 로그인
├── ProfileSetup.tsx            # 닉네임/지역 설정
└── UserBadge.tsx               # 선배맘/답변자 뱃지
```

### 화면 목업

```
┌─────────────────────────────┐
│  ← 00유치원                 │
├─────────────────────────────┤
│ [기본정보] [후기모음] [Q&A] │
├─────────────────────────────┤
│                             │
│  📎 후기 모음 (3건)         │
│                             │
│  ┌─────────────────────┐   │
│  │ 🏷 분당맘카페         │   │
│  │ "00유치원 2년 보낸     │   │
│  │  솔직 후기"           │   │
│  │ 👍 12  ⏰ 2025.09    │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ 🏷 네이버블로그       │   │
│  │ "분당 유치원 비교      │   │
│  │  (00 vs △△)"         │   │
│  │ 👍 8   ⏰ 2025.07    │   │
│  └─────────────────────┘   │
│                             │
│  [+ 후기 링크 제보하기]     │
│                             │
└─────────────────────────────┘
```

```
┌─────────────────────────────┐
│  ← 00유치원                 │
├─────────────────────────────┤
│ [기본정보] [후기모음] [Q&A] │
├─────────────────────────────┤
│                             │
│  ❓ Q&A (5건)               │
│  [전체|급식|교사|시설|버스] │
│                             │
│  ┌─────────────────────┐   │
│  │ Q. 급식 직접 조리      │   │
│  │    하나요?             │   │
│  │ 💬 3개 답변            │   │
│  │                       │   │
│  │  A. 직접 조리해요.     │   │
│  │     재원중 (2024~)    │   │
│  │     👍 5              │   │
│  └─────────────────────┘   │
│                             │
│  [질문하기]                 │
│                             │
└─────────────────────────────┘
```

---

## 6. 구현 단계

### Step 1: 인프라 셋업

- [ ] Supabase 테이블 마이그레이션 작성
- [ ] Supabase Auth + 카카오 소셜 로그인 설정
- [ ] RLS 정책 설정
- [ ] 분당/판교 유치원 필터링 (기존 JSON 데이터에서)

### Step 2: 사용자 시스템

- [ ] 카카오 로그인 컴포넌트
- [ ] 프로필 설정 (닉네임, 관심지역, 자녀정보)
- [ ] 사용자 상태 관리 (Zustand store)

### Step 3: 후기 큐레이션

- [ ] 후기 링크 목록 API (GET)
- [ ] 후기 링크 제보 API (POST)
- [ ] ReviewLinkList / ReviewLinkCard 컴포넌트
- [ ] 링크 제보 폼
- [ ] 좋아요/신고 기능
- [ ] 운영자 승인 대시보드 (간단한 형태)

### Step 4: Q&A 게시판

- [ ] 질문 CRUD API
- [ ] 답변 CRUD API
- [ ] QuestionList / QuestionCard 컴포넌트
- [ ] AnswerList / AnswerCard 컴포넌트
- [ ] 질문/답변 작성 폼
- [ ] 카테고리 필터
- [ ] 좋아요/신고 기능

### Step 5: 유치원 상세 페이지 통합

- [ ] 탭 UI 추가 (기본정보 / 후기모음 / Q&A)
- [ ] 유치원 상세 페이지 라우팅 (`/kindergarten/[id]`)
- [ ] 검색 결과에서 상세 페이지 연결

### Step 6: 초기 데이터 시딩

- [ ] 분당/판교 유치원 50개 대상 후기 링크 수동 수집
- [ ] 운영자 계정으로 예시 질문 10개 작성
- [ ] 테스트 답변 작성

### Step 7: 테스트 및 QA

- [ ] 유닛 테스트 (API, 유틸리티)
- [ ] 컴포넌트 테스트
- [ ] E2E 테스트 (질문 작성 → 답변 → 좋아요 흐름)
- [ ] 모바일 반응형 확인

---

## 7. 초기 운영 전략

### 콘텐츠 시딩 (런칭 전)

```
1. 운영자가 분당/판교 유치원 50개 대상으로:
   - 네이버 카페/블로그 검색하여 후기 링크 3-5개씩 수집
   - 예상 질문 2-3개씩 미리 작성
   - 총: 링크 200개 + 질문 100개

2. 지인 동원:
   - 분당 거주 지인에게 답변 요청
   - 초기 답변 50개 확보 목표
```

### 사용자 유입 채널

| 채널 | 방법 | 예상 효과 |
|------|------|-----------|
| 분당맘 네이버 카페 | "유치원 정보 앱 만들었어요" 홍보 | 중 |
| 당근마켓 동네홍보 | 분당구 타겟 광고 | 중 |
| 인스타그램 | #분당유치원 #판교유치원 해시태그 | 하 |
| 입소문 | 후기 제보자에게 지인 초대 요청 | 상 |

### 초기 인센티브

- 첫 후기 링크 제보 시: 스타벅스 아메리카노 쿠폰 (100명 한정)
- 첫 답변 작성 시: 편의점 상품권 1,000원 (50명 한정)
- 예산: 약 50만원

---

## 8. 성공 지표 (KPI)

### 런칭 후 3개월 목표

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 가입자 수 | 500명 | Supabase Auth |
| 후기 링크 수 | 300개 (승인 기준) | review_links 테이블 |
| 질문 수 | 200개 | questions 테이블 |
| 답변 수 | 500개 | answers 테이블 |
| 답변율 | 60% 이상 | 답변 1개 이상인 질문 비율 |
| MAU | 200명 | Vercel Analytics |
| 평균 체류시간 | 3분 이상 | Vercel Analytics |

### 실패 판단 기준

- 3개월 후 가입자 100명 미만 → 피봇 검토
- 질문 대비 답변율 30% 미만 → Q&A 방식 재고
- 후기 링크 제보 월 10건 미만 → 인센티브 강화 또는 자동 수집 도입

---

## 9. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 외부 링크 원본 삭제 | 빈 링크 노출 | 주기적 링크 유효성 체크 (크론잡) |
| 광고성 링크 제보 | 신뢰도 하락 | 운영자 승인 필수 + 신고 시스템 |
| 악의적 질문/답변 | 법적 이슈 | 신고 + 자동 비공개 + 이용약관 |
| 특정 유치원 집중 공격 | 명예훼손 | Q&A만 허용 (주관적 후기 X), 법적 고지 |
| 사용자 미유입 | 서비스 실패 | 지역 집중 + 인센티브 강화 |

---

## 10. Phase 2 연결 포인트

Phase 1 성공 시 다음 단계:

```
Phase 1 성과 → Phase 2 전환 조건:
├── 가입자 500명 이상
├── 월 활성 답변자 50명 이상
└── 답변율 60% 이상

Phase 2 기능:
├── 인증된 후기 (재원증명 기반)
├── 구조화된 평가 (별점)
├── 선배맘 1:1 매칭
├── 지역 확장 (용인, 수원)
└── 키즈노트 연동 검토
```

---

## 11. 기술적 고려사항

### 기존 아키텍처와의 호환

- **유치원 DB**: 기존 JSON 파일 유지, 분당/판교 유치원만 필터링
- **Supabase**: 사용자/후기/Q&A 데이터만 Supabase 저장
- **인증**: Supabase Auth + 카카오 프로바이더
- **상태 관리**: 기존 Zustand 패턴 유지, 새 store 추가

### 성능

- Q&A 목록: 페이지네이션 (20개씩)
- 후기 링크: 최대 50개 표시
- 답변: 최대 30개 표시, 좋아요순 정렬

### 보안

- RLS로 데이터 접근 제어
- 사용자 입력 새니타이징 (XSS 방지)
- URL 유효성 검증 (후기 링크 제보 시)
- Rate limiting: 질문 1일 5개, 답변 1일 20개
