# 우리동네 유치원 - Claude Code 개발 가이드

> 모바일 기반 위치 검색으로 주변 유치원/어린이집을 비교하는 서비스

---

## 절대 규칙 (반드시 준수)

다음 규칙은 예외 없이 반드시 지켜야 합니다:

### 코드 품질
- **console.log 절대 남기지 않기** - 디버깅 후 반드시 제거
- **any 타입 사용 금지** - 명시적 타입 정의 필수
- **주석 처리된 코드 커밋 금지** - 삭제하거나 복원
- **TODO 주석 남기고 PR 올리지 않기** - 해결하거나 이슈로 등록

### 보안
- **API 키를 코드에 하드코딩 금지** - 환경 변수 사용
- **사용자 입력 직접 신뢰 금지** - 항상 검증/새니타이징
- **.env 파일 커밋 금지** - .gitignore 확인

### 파일 보호 (건드리지 말 것)
- `next.config.ts` - 보안 설정 포함, 수정 시 반드시 확인 요청
- `.env.local` - 환경 변수, 직접 수정 금지
- `package.json`의 engines 필드 - Node.js 버전 고정

---

## Git 워크플로우

### 저장소 정보

- **GitHub**: https://github.com/kimsol1134/where_kindergarden.git

### Git Worktree 기반 개발

새로운 기능 개발 시 반드시 Git Worktree를 사용합니다.

#### 워크플로우

```bash
# 1. 새 기능 작업 시작 - worktree 생성
git worktree add ../where_kindergarden-feature-name feature/feature-name

# 2. worktree 디렉토리로 이동하여 작업
cd ../where_kindergarden-feature-name

# 3. 작업 완료 후 커밋 및 푸시
git add .
git commit -m "feat: 기능 설명"
git push -u origin feature/feature-name

# 4. GitHub에서 PR 생성

# 5. PR 머지 후 worktree 정리
cd ../where_kindergarden
git worktree remove ../where_kindergarden-feature-name
git branch -d feature/feature-name
```

#### Worktree 관리 명령어

```bash
# 현재 worktree 목록 확인
git worktree list

# worktree 제거 (강제)
git worktree remove --force ../where_kindergarden-feature-name

# 고아 worktree 정리
git worktree prune
```

#### 브랜치 네이밍 규칙

- `feature/기능명` - 새 기능 개발
- `fix/버그명` - 버그 수정
- `refactor/대상` - 리팩토링
- `docs/문서명` - 문서 수정

#### PR 체크리스트

- [ ] 테스트 통과 (`pnpm test`)
- [ ] 린트 통과 (`pnpm lint`)
- [ ] 타입 체크 통과 (`pnpm type-check`)
- [ ] console.log 제거 확인
- [ ] any 타입 사용 없음

### 기능 구현 후 필수 절차

**기능 구현 완료 후 반드시 아래 순서로 진행합니다:**

```bash
# 1. 유닛 테스트 실행
pnpm test

# 2. 타입 체크
pnpm type-check

# 3. 모두 통과하면 커밋
git add .
git commit -m "feat: 기능 설명"
```

- 테스트가 실패하면 커밋하지 않고 수정 후 재시도
- 새로운 기능에는 반드시 해당 기능의 유닛 테스트 작성
- API 관련 기능은 transformer, 유틸리티 함수 테스트 필수

---

## 세션 인계 (HANDOFF.md)

### 컨텍스트 리셋 전 필수 작업

세션 종료나 컨텍스트 리셋 전에 반드시 `HANDOFF.md` 파일을 작성해야 합니다.

```markdown
# HANDOFF.md

## 마지막 작업 일시
2025-01-21

## 완료된 작업
- [ ] 프로젝트 초기 설정
- [x] Supabase 스키마 생성
- [x] 유치원 알리미 API 연동

## 진행 중인 작업
- 검색 결과 목록 컴포넌트 구현 중
  - `src/components/search/KindergartenList.tsx` 작업 중
  - 정렬 로직 완료, 페이지네이션 미구현

## 다음에 할 작업
1. 페이지네이션 구현 (Load More 방식)
2. 지도 뷰 컴포넌트 작성
3. 비교 선택 기능 추가

## 주의사항 / 알려진 이슈
- Kakao Maps API 일일 호출 제한 있음 (확인 필요)
- 유치원 알리미 API 응답 시간 느림 (2-3초)

## 현재 브랜치
feature/search-list

## 참고 파일
- DETAILED_SPEC.md - 전체 기술 스펙
- CLAUDE.md - 개발 가이드
```

### 새 세션 시작 시

```bash
# 새 세션 시작하면 이 파일들을 먼저 읽어주세요
1. CLAUDE.md      # 개발 가이드
2. HANDOFF.md     # 작업 인계 내용
3. DETAILED_SPEC.md  # 필요시 참고
```

### HANDOFF.md 업데이트 시점

- 2시간 이상 연속 작업 후
- 복잡한 기능 구현 완료 후
- 세션 종료 요청 시
- 에러 해결 후 (해결 방법 기록)

---

## 프로젝트 개요

- **서비스명**: 우리동네 유치원
- **목적**: 현재 위치 기반 유치원/어린이집 검색 및 비교표 생성
- **주요 기능**: GPS/주소 검색, 반경 필터(1/2/5km), 목록/지도 뷰, 최대 3개 기관 비교, 카카오톡 공유

---

## 기술 스택

| 분류 | 기술 | 버전 |
|-----|-----|-----|
| Framework | Next.js | 16.1.x |
| UI Library | React | 19.2.x |
| Runtime | Node.js | 20.9+ |
| Language | TypeScript | 5.1.0+ |
| Styling | TailwindCSS | 4.x |
| Components | shadcn/ui + Radix | latest |
| State | Zustand + URL params | 5.x |
| Database | Supabase PostgreSQL | - |
| Testing | Vitest + Playwright | - |
| Deployment | Vercel | - |

---

## TDD 개발 원칙

### 테스트 우선 개발 프로세스

```
1. RED   - 실패하는 테스트 먼저 작성
2. GREEN - 테스트를 통과하는 최소한의 코드 구현
3. REFACTOR - 코드 개선 (테스트는 계속 통과해야 함)
```

### 테스트 구조

```
src/
├── __tests__/           # 통합 테스트
├── components/
│   └── __tests__/       # 컴포넌트 테스트
├── lib/
│   └── __tests__/       # 유틸리티 테스트
└── e2e/                 # Playwright E2E 테스트
```

### Unit 테스트 (Vitest)

필수 테스트 대상:
- 거리 계산 함수 (Haversine formula)
- API 응답 파싱 및 변환
- 비교표 데이터 정규화
- 유틸리티 함수 (시군구 코드 변환 등)

```typescript
// 테스트 파일 네이밍: *.test.ts 또는 *.spec.ts
// 예: haversine.test.ts

import { describe, it, expect } from 'vitest';
import { calculateDistance } from '@/lib/geo';

describe('calculateDistance', () => {
  it('should calculate distance between two points correctly', () => {
    const distance = calculateDistance(
      { lat: 37.5665, lng: 126.9780 }, // 서울시청
      { lat: 37.5512, lng: 126.9882 }  // 남산타워
    );
    expect(distance).toBeCloseTo(1.89, 1); // km
  });
});
```

### E2E 테스트 (Playwright)

핵심 사용자 플로우 테스트:
- 위치 검색 → 목록 표시 → 비교 선택 → 비교표 생성 → 공유

```typescript
// e2e/search-flow.spec.ts
import { test, expect } from '@playwright/test';

test('search and compare kindergartens', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /현재 위치로 검색/ }).click();
  // ... 테스트 흐름
});
```

### 테스트 실행 명령어

```bash
# Unit 테스트
pnpm test              # 전체 실행
pnpm test:watch        # 감시 모드
pnpm test:coverage     # 커버리지 포함

# E2E 테스트
pnpm test:e2e          # 헤드리스 모드
pnpm test:e2e:ui       # UI 모드
```

---

## React/Next.js 개발 규칙

### Critical: 워터폴 제거

```typescript
// BAD: 순차적 await (워터폴 발생)
const user = await getUser(id);
const posts = await getPosts(userId);
const comments = await getComments(postId);

// GOOD: 독립적인 작업은 병렬 실행
const [user, posts] = await Promise.all([
  getUser(id),
  getPosts(userId)
]);
```

### Critical: 번들 사이즈 최적화

```typescript
// BAD: barrel file import
import { Check, X, Menu } from 'lucide-react';

// GOOD: 직접 import
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';

// GOOD: 무거운 컴포넌트는 dynamic import
import dynamic from 'next/dynamic';
const KakaoMap = dynamic(() => import('@/components/KakaoMap'), {
  ssr: false,
  loading: () => <MapSkeleton />
});
```

### High: 서버 사이드 성능

```typescript
// Server Action에서 항상 인증 검증
'use server';

export async function updateKindergarten(id: string, data: FormData) {
  const session = await auth(); // 항상 검증
  if (!session) throw new Error('Unauthorized');
  // ...
}

// RSC 경계에서 최소한의 데이터만 전달
// BAD: 전체 객체 전달
<ClientComponent data={kindergartens} />

// GOOD: 필요한 필드만 전달
<ClientComponent
  data={kindergartens.map(({ id, name, distance }) => ({ id, name, distance }))}
/>
```

### Medium: 리렌더 최적화

```typescript
// BAD: 객체 직접 비교
useEffect(() => {
  // searchParams 객체가 변경될 때마다 실행
}, [searchParams]);

// GOOD: 필요한 primitive 값만 의존성에 추가
const lat = searchParams.get('lat');
const lng = searchParams.get('lng');
useEffect(() => {
  // lat, lng 값이 변경될 때만 실행
}, [lat, lng]);

// Lazy state initialization
// BAD
const [state] = useState(expensiveComputation());

// GOOD
const [state] = useState(() => expensiveComputation());
```

### Medium: 렌더링 성능

```typescript
// 정적 JSX는 컴포넌트 외부로 호이스팅
const staticHeader = <header className="...">우리동네 유치원</header>;

function Page() {
  return (
    <div>
      {staticHeader}  {/* 매 렌더마다 재생성되지 않음 */}
      <DynamicContent />
    </div>
  );
}

// 조건부 렌더링시 && 대신 삼항 연산자 사용
// BAD: count가 0일 때 "0"이 렌더됨
{count && <Badge>{count}</Badge>}

// GOOD
{count > 0 ? <Badge>{count}</Badge> : null}
```

### Low: JavaScript 성능

```typescript
// 반복 조회는 Map/Set 사용
// BAD: O(n) 조회 반복
const found = items.find(item => item.id === targetId);

// GOOD: O(1) 조회
const itemMap = new Map(items.map(item => [item.id, item]));
const found = itemMap.get(targetId);

// 배열 불변 정렬
// BAD: 원본 배열 변경
items.sort((a, b) => a.distance - b.distance);

// GOOD: 새 배열 반환
const sorted = items.toSorted((a, b) => a.distance - b.distance);
```

---

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 홈 (위치 검색)
│   ├── search/
│   │   └── page.tsx          # 검색 결과
│   ├── compare/
│   │   └── page.tsx          # 비교표
│   ├── privacy/
│   │   └── page.tsx          # 개인정보처리방침
│   ├── about/
│   │   └── page.tsx          # 서비스 소개
│   └── api/
│       ├── kindergartens/
│       │   └── route.ts      # 유치원 검색 API
│       └── geocode/
│           └── route.ts      # 지오코딩 API
├── components/
│   ├── ui/                   # shadcn/ui 컴포넌트
│   ├── search/               # 검색 관련 컴포넌트
│   ├── compare/              # 비교표 관련 컴포넌트
│   └── map/                  # 지도 관련 컴포넌트
├── lib/
│   ├── api/                  # API 클라이언트
│   ├── geo/                  # 지리 계산 유틸
│   ├── supabase/             # Supabase 클라이언트
│   └── utils/                # 공통 유틸리티
├── hooks/                    # 커스텀 훅
├── stores/                   # Zustand 스토어
└── types/                    # TypeScript 타입 정의
```

---

## Next.js 16 주의사항

### 비동기 API 변경 (Breaking Change)

```typescript
// BAD: 동기 접근 (더 이상 지원 안 함)
const { id } = params;
const { q } = searchParams;
const cookie = cookies().get('token');

// GOOD: 비동기 접근 필수
const { id } = await params;
const { q } = await searchParams;
const cookie = (await cookies()).get('token');
```

### Cache Components 활용

```typescript
// 명시적 캐싱
'use cache';

export async function getKindergartens(sigunguCode: string) {
  // 24시간 캐싱
  return await fetchKindergartenData(sigunguCode);
}
```

### 보안 설정 (CVE-2025-66478 대응)

```typescript
// next.config.ts
const nextConfig = {
  images: {
    dangerouslyAllowLocalIP: false,
    maximumRedirects: 3,
    remotePatterns: [
      { protocol: 'https', hostname: 'your-cdn.com' }
    ]
  }
};
```

---

## 코딩 컨벤션

### 파일 네이밍

- 컴포넌트: `PascalCase.tsx` (예: `SearchResult.tsx`)
- 유틸리티: `camelCase.ts` (예: `calculateDistance.ts`)
- 타입 정의: `types.ts` 또는 `*.types.ts`
- 테스트: `*.test.ts` 또는 `*.spec.ts`

### 컴포넌트 구조

```typescript
// 1. imports
import { useState } from 'react';

// 2. types
interface Props {
  items: Kindergarten[];
}

// 3. component
export function KindergartenList({ items }: Props) {
  // hooks first
  const [selected, setSelected] = useState<string[]>([]);

  // derived state
  const sortedItems = items.toSorted((a, b) => a.distance - b.distance);

  // handlers
  const handleSelect = (id: string) => {
    setSelected(prev => [...prev, id]);
  };

  // render
  return (
    <ul>
      {sortedItems.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### 에러 처리

```typescript
// API 응답 타입
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// 에러 바운더리 사용
<ErrorBoundary fallback={<ErrorFallback />}>
  <KindergartenList />
</ErrorBoundary>
```

---

## 개발 명령어

```bash
# 개발 서버 실행
pnpm dev

# 빌드
pnpm build

# 프로덕션 실행
pnpm start

# 린트
pnpm lint

# 타입 체크
pnpm type-check

# 테스트
pnpm test
pnpm test:e2e

# Supabase 마이그레이션
pnpm db:migrate
pnpm db:generate
```

---

## 환경 변수

```env
# .env.local

# 유치원 알리미 API
KINDERGARTEN_API_KEY=

# Kakao API
KAKAO_REST_API_KEY=
NEXT_PUBLIC_KAKAO_JS_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Analytics (optional)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=
```

---

## 외부 API 참고

- [유치원 알리미 Open API](https://e-childschoolinfo.moe.go.kr/)
- [Kakao Maps API](https://apis.map.kakao.com/)
- [Kakao 주소 검색 API](https://developers.kakao.com/docs/latest/ko/local/dev-guide)

### 유치원 알리미 API 엔드포인트 (공식)

Base URL: `https://e-childschoolinfo.moe.go.kr/api/notice`

| 기능 | 엔드포인트 | 비고 |
|-----|-----------|------|
| 기본현황 | `basicInfo` | 유치원 기본 정보 |
| 기본현황(신규) | `basicInfo2` | |
| 건물현황 | `building` | |
| 교실면적현황 | `classArea` | 면적 정보 |
| 직위·자격별 교직원현황 | `teachersInfo` | |
| 수업일수현황 | `lessonDay` | |
| 급식운영현황 | `schoolMeal` | 급식 정보 |
| 통학차량현황 | `schoolBus` | 차량 운영 여부 |
| 근속연수현황 | `yearOfWork` | |
| 환경위생 관리현황 | `environmentHygiene` | |
| 안전점검·교육 실시현황 | `safetyEdu` | |
| 공제회 가입현황 | `deductionSociety` | |
| 보험별 가입현황 | `insurance` | |
| 방과후 과정 편성 운영 현황 | `afterSchoolPresent` | 방과후 운영 여부 |

> **주의**: "현원현황" API (`childAbstnt`)는 공식적으로 제공되지 않음

#### 현재 사용 중인 엔드포인트

```typescript
// scripts/sync-kindergartens.ts - 13개 엔드포인트 전체 수집
'basicInfo2'         // 기본현황(신규) - 좌표(lat, lng) 포함
'building'           // 건물현황
'classArea'          // 교실면적현황
'teachersInfo'       // 직위·자격별 교직원현황
'lessonDay'          // 수업일수현황
'schoolMeal'         // 급식운영현황
'schoolBus'          // 통학차량현황
'yearOfWork'         // 근속연수현황
'environmentHygiene' // 환경위생 관리현황
'safetyEdu'          // 안전점검·교육 실시현황
'deductionSociety'   // 공제회 가입현황
'insurance'          // 보험별 가입현황
'afterSchoolPresent' // 방과후 과정
```

---

## 유치원 데이터 동기화 스크립트

### 개요

`scripts/sync-kindergartens.ts` 스크립트를 사용하여 유치원 알리미 API에서 전국 유치원 데이터를 수집합니다.

### 실행 방법

```bash
# 전체 동기화 (250개 시군구, 13개 엔드포인트)
pnpm sync:kindergartens

# 테스트 모드 (서울 종로구만)
pnpm sync:kindergartens -- --test

# JSON 파일로 저장
pnpm sync:kindergartens -- --save-json

# 테스트 + JSON 저장
pnpm sync:kindergartens -- --test --save-json
```

### 필요한 환경 변수

```env
# .env.local
KINDERGARTEN_API_KEY=your_api_key_here

# Supabase에 저장하려면 (선택사항)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 출력 파일

- **위치**: `scripts/data-output/`
- **파일명**: `kindergartens-full-YYYY-MM-DD.json`
- **크기**: 약 94MB (7,950개 유치원, 13개 엔드포인트 데이터 포함)

### 데이터 구조

```typescript
interface KindergartenRecord {
  // 핵심 필드 (DB 저장용)
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
  sigungu_code: string;
  type: 'public' | 'private' | 'home';
  capacity: number;
  current_count: number;
  has_bus: boolean;
  bus_count: number;
  meal_type: 'direct' | 'outsourced' | null;
  has_after_school: boolean;
  area_per_child: number;
  phone: string | null;
  homepage: string | null;
  operation_hours: string | null;
  has_playground: boolean;
  lat: number | null;    // 위도 (basicInfo2에서 제공)
  lng: number | null;    // 경도 (basicInfo2에서 제공)

  // 원시 데이터 (JSON 저장시에만 포함)
  raw_data: {
    basicInfo2: {...};
    building: {...};
    teachersInfo: {...};
    lessonDay: {...};
    schoolBus: {...};
    schoolMeal: {...};
    classArea: {...};
    yearOfWork: {...};
    environmentHygiene: {...};
    safetyEdu: {...};
    deductionSociety: {...};
    afterSchool: {...};
    insurance: [...];  // 보험은 유치원당 여러 행
  };
}
```

### 수집 프로세스

1. **시군구 코드 로드**: `scripts/data/sigungu-codes.ts`에서 250개 시군구 정보 로드
2. **병렬 API 호출**: 각 시군구별로 13개 엔드포인트 동시 호출
3. **데이터 병합**: `kindercode`를 키로 모든 데이터 병합
4. **저장**: Supabase 또는 JSON 파일로 저장

### 주의사항

- API 호출 간 300ms 딜레이 적용 (Rate limiting 대응)
- `insurance` 엔드포인트는 유치원당 여러 행 반환 (보험 종류별)
- `basicInfo2`에서 좌표(`lttdcdnt`, `lngtcdnt`) 제공
- Supabase 저장 시 `raw_data` 필드는 제외됨
