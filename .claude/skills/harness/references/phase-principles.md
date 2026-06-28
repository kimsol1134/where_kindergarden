# Phase 작성 7대 원칙

`harness-plan` sub-agent가 Phase 파일을 만들 때 엄수하는 원칙.
mofit-ios / dev-harness의 검증된 7대 원칙을 **where_kindergarden** 프로젝트에 맞게 조정.

---

## 원칙 1. Phase 0은 반드시 문서 업데이트

코드를 쓰기 전에 설계 문서/타입 정의를 먼저 갱신한다.

**where_kindergarden 적용**:
- `docs/` 폴더 업데이트 (해당 기능 문서 있는 경우)
- 또는 `src/types/` 타입 정의 확장
- 또는 관련 `CLAUDE.md` 섹션 업데이트 필요 시

왜: 문서/타입 없이 구현하면 AI가 프로젝트 맥락을 놓친다.
Phase 0 완료 후 그 산출물을 이후 Phase들이 참조한다.

---

## 원칙 2. 자기완결성

각 Phase는 **독립된 `harness-generate` 호출 (새 sub-agent 세션)** 에서 실행된다.
"이전 대화에서 논의한 바와 같이" 류 표현 금지.
필요한 모든 컨텍스트는 Phase 파일 안에 명시.

왜: harness pipeline이 각 Phase를 별도 sub-agent 세션으로 실행하므로,
이전 Phase의 메모리는 남아있지 않다.

---

## 원칙 3. 사전 준비 필수

Phase 파일 시작에 반드시 포함:

```markdown
## 사전 준비
- 읽기:
  - `docs/...` — {왜 읽어야 하는지}
  - `src/...` — {어떤 패턴 참조}
- 참조 artifact:
  - `.harness/runs/{run_id}/01-clarify.md` — 결정 사항 확인
- 이전 Phase 산출물 (있으면):
  - `.harness/runs/{run_id}/tasks/{task_id}/phase{N-1}-output.md`
```

왜: AI가 어디서 정보를 찾아야 하는지 명시해야 일관된 결과 나옴.

---

## 원칙 4. 시그니처 수준 지시

인터페이스(함수 시그니처, 파라미터, 반환 타입)만 제시.
구현 세부는 AI 재량. 단, **핵심 비즈니스 규칙**은 반드시 명시.

**좋은 예 (O)**:
```typescript
// src/lib/favorites/favoriteStore.ts
export interface FavoriteStore {
  ids: Set<string>;
  add: (id: string) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
}
// Persist to localStorage (key: 'kindergarten-favorites')
// Max 50 items; adding 51st removes oldest
```

**나쁜 예 (X)**:
```typescript
// 상세 구현까지 지시
function add(id) {
  if (this.ids.size >= 50) {
    const oldest = [...this.ids][0];
    this.ids.delete(oldest);
  }
  this.ids.add(id);
  localStorage.setItem(...)
  ...
}
```

왜: 구현을 너무 상세히 지시하면 AI의 장점(최적 구현 선택)을 죽인다.

---

## 원칙 5. AC는 실행 가능한 커맨드

"~가 동작해야 한다" 같은 추상적 서술 금지.
**구체적 Bash 명령어 + 기대 결과** 명시.

**where_kindergarden 표준 AC 커맨드**:

```bash
# 타입 체크
pnpm type-check
# 기대: 0 errors

# 린트
pnpm lint
# 기대: exit 0

# 유닛 테스트 (범위 지정 권장)
pnpm test -- src/lib/favorites
# 기대: all pass

# 파일 존재
test -f src/lib/favorites/favoriteStore.ts && echo OK
# 기대: OK

# 스크립트 동작 (데이터 파이프라인)
pnpm sync:kindergartens -- --test --save-json
# 기대: exit 0, scripts/data-output/ 에 파일 생성

# E2E (거의 안 씀, 전체 플로우만)
pnpm test:e2e -- --grep "search flow"
# 기대: all pass
```

왜: 모호한 AC는 AI가 "완료"를 선언하고 실제로는 빌드가 깨진 상태를 만든다.

---

## 원칙 6. Scope 최소화

한 Phase = 한 레이어 또는 한 모듈.
여러 레이어 동시 수정 금지 — 실패 시 원인 파악 어려움.

**전형 패턴**:
- Phase 0: 문서/타입 (`docs/`, `src/types/`)
- Phase 1: 데이터 계층 (`src/lib/supabase/`, `src/lib/api/`)
- Phase 2: 비즈니스 로직 (`src/lib/{feature}/`)
- Phase 3: UI (`src/components/`, `src/app/`)
- Phase 4: 통합 / E2E 연결

단순 작업(리뷰 스크립트 추가, 작은 유틸 수정)은 1-2 Phase로 충분.
과분할도 금지 — "Phase당 파일 1개 미만"이면 묶을 것.

왜: 실패 격리. Phase 3에서 실패해도 0-2는 보존.

---

## 원칙 7. 주의사항은 구체적

"조심해라" → 의미 없음.
"X를 하지 마라. 이유: Y" → 명확.

**where_kindergarden 프로젝트 공통 주의사항** (CLAUDE.md 절대 규칙 참조):

```markdown
## 주의사항
- `any` 타입 사용 금지. 이유: CLAUDE.md 절대 규칙.
- `console.log` 남기지 않음. 이유: 디버깅 후 반드시 제거.
- `next.config.ts` 수정 금지. 이유: 보안 설정 포함, 변경 시 확인 필요.
- `.env.local` 직접 수정 금지. 이유: 환경 변수, 별도 절차.
- `package.json`의 `engines` 필드 수정 금지. 이유: Node.js 버전 고정.
- `ios/App/` (Capacitor 웹앱) 수정 금지. 이유: 레거시, 더 이상 개발하지 않음.
- iOS 기능 수정은 `ios/WhereKindergartenNative/` (SwiftUI). 이유: 현재 메인 앱.
- main 브랜치 직접 커밋 금지. 이유: CLAUDE.md 절대 규칙 (worktree 사용).
- Supabase 기존 마이그레이션 파일 수정 금지. 이유: 새 마이그레이션만 추가.
```

이 중 **이번 Phase와 관련 있는 것만** 해당 Phase 파일에 인용.

---

## Phase 파일 템플릿

```markdown
---
stage: plan
run_id: {run_id}
task_id: {task_id}
phase: N
name: "{phase-name}"
created_at: {ISO+KST}
---

# Phase N: {한글 이름}

## 사전 준비
- 읽기:
  - `docs/...` — {참조 이유}
  - `src/...` — {패턴 확인}
- 참조 artifact:
  - `.harness/runs/{run_id}/01-clarify.md` — 결정 사항
- 이전 Phase 산출물 (있으면):
  - `.harness/runs/{run_id}/tasks/{task_id}/phase{N-1}-output.md`

## 지시
{시그니처 수준 지시 — 타입/함수/파일 경로 명시, 비즈니스 규칙 명시}

## 주의사항
- {구체적 금지 규칙 + 이유}

## AC (완료 기준)
```bash
{실행 가능한 명령어}
# 기대: {구체 결과}
```
```

---

## 점검 체크리스트 (Plan sub-agent 자가 점검용)

각 Phase 파일 작성 후 self-check:

- [ ] Phase 0이 문서/타입 업데이트인가?
- [ ] 이 Phase가 독립 세션에서 실행 가능한가? (외부 컨텍스트 의존 없음)
- [ ] "사전 준비" 섹션이 구체적 파일 경로를 포함하는가?
- [ ] "지시"가 시그니처 수준인가? (상세 구현 코드 안 넣음)
- [ ] AC가 실행 가능한 Bash 명령어인가? (추상적 서술 X)
- [ ] Scope가 한 레이어로 제한되는가?
- [ ] 주의사항이 "X 하지 마라, 이유: Y" 형식인가?
