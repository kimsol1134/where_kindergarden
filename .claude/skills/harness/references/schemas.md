# Harness Artifact Schemas

모든 artifact는 **YAML frontmatter + Markdown 본문** 구조.
sub-agent와 메인 orchestrator가 `frontmatter`로 상태를 주고받는다.

---

## 공통 필드

모든 artifact 공통:
```yaml
---
stage: task | clarify | plan | generate | generate_report | evaluate
run_id: YYYY-MM-DD-HHMM-{slug}
generated_at: ISO-8601 (KST 권장, +09:00)
upstream: [이 artifact를 만드는 데 사용된 입력 파일들]
downstream: [이 artifact를 읽어갈 다음 단계 파일들]
---
```

`status` 필드는 stage마다 의미가 다름. 아래 각 stage 참조.

---

## 00-task.md (Step 0, 메인 세션 작성)

```yaml
---
stage: task
run_id: 2026-04-17-1430-review-favorites
task: "사용자 원문 요청 그대로"
created_at: 2026-04-17T14:30:00+09:00
---
```

**본문 구조**:
```markdown
# Task
{사용자 원문}

## 추가 맥락 (선택)
{사용자가 슬래시 커맨드 뒤에 덧붙인 설명, 이전 대화 요약 등}
```

---

## 01-clarify.md (Step 1, harness-clarify 작성)

```yaml
---
stage: clarify
run_id: {run_id}
task_summary: "한 줄 요약 (20자 이내)"
status: complete
critical_questions_open: N  # 0이어야 Plan 진입 가능
generated_at: {ISO}
upstream: [.harness/runs/{run_id}/00-task.md]
downstream: [.harness/runs/{run_id}/02-plan.md]
---
```

**본문 섹션** (순서 고정):
1. `## 요청 분석` — 영역, 영향 범위, 모호성
2. `## Critical Questions (N)` — 각 질문은 맥락/옵션/추천/status/answer 필드
3. `## Non-critical Assumptions` — 각 assumption은 가정/근거/뒤집기 가능
4. `## 코드베이스 참고` — `path:line` 형식
5. `## Constraints / 주의` — CLAUDE.md 적용 규칙, 보호 파일
6. `## Next Step Hint (for harness-plan)` — Phase 분할 제안, 의존성

**Critical Question 블록 형식**:
```markdown
### Q1. {짧은 제목}
- 맥락: ...
- 옵션:
  - A. ... — 결과: ...
  - B. ... — 결과: ...
- 추천: A (근거: ...)
- status: open | resolved
- answer: {사용자 답변 — open 상태에선 비어있음}
```

메인 세션이 사용자 답변 수령 후 `answer` 작성 + `status: resolved`로 수정 + `critical_questions_open` 감소.

---

## 02-plan.md (Step 2, harness-plan 작성)

```yaml
---
stage: plan
run_id: {run_id}
task_id: {task-slug}
phase_count: N
status: complete
generated_at: {ISO}
upstream:
  - .harness/runs/{run_id}/00-task.md
  - .harness/runs/{run_id}/01-clarify.md
downstream:
  - .harness/runs/{run_id}/tasks/{task_id}/phase*.md
---
```

**본문 섹션**:
1. `## 접근 방식` — 3-5줄
2. `## Phase 목록` — 마크다운 표 (#, 이름, scope, 의존성, 예상 변경 파일, 예상 AC)
3. `## 주요 결정 사항` — 01-clarify.md 반영
4. `## 위험 요소` — 예상 실패 포인트 + 완화 방안
5. `## Generate 준비 완료` — 체크리스트

---

## tasks/{task-id}/index.json (Step 2, harness-plan 작성, harness-generate가 갱신)

```json
{
  "id": "review-favorites",
  "name": "review-favorites",
  "status": "pending|in_progress|completed|error",
  "run_id": "2026-04-17-1430-review-favorites",
  "prompt": "00-task.md의 원문 task",
  "phases": [
    {
      "phase": 0,
      "name": "docs-update",
      "status": "pending|in_progress|completed|error",
      "started_at": "ISO?",
      "completed_at": "ISO?",
      "error_message": "string?"
    }
  ],
  "created_at": "ISO",
  "updated_at": "ISO"
}
```

**규칙**:
- harness-plan이 초기 상태 작성 (모두 pending)
- harness-generate가 호출될 때마다 해당 phase의 status/시간을 업데이트
- 메인 세션(orchestrator)은 이 파일을 읽기만 함. 갱신 X.

---

## tasks/{task-id}/phase{N}.md (Step 2, harness-plan 작성)

```yaml
---
stage: plan
run_id: {run_id}
task_id: {task_id}
phase: N
name: "phase-name"
created_at: {ISO}
---
```

**본문 섹션** (순서 고정, 7대 원칙 준수):
1. `## 사전 준비` — 읽기 파일, 참조 artifact, 이전 Phase 산출물
2. `## 지시` — 시그니처 수준 구현 지시
3. `## 주의사항` — "X 하지 마라. 이유: Y"
4. `## AC (완료 기준)` — 실행 가능한 Bash 블록 + 기대 결과

---

## tasks/{task-id}/phase{N}-output.md (Step 3, harness-generate 작성)

```yaml
---
stage: generate
run_id: {run_id}
task_id: {task_id}
phase: N
status: completed | error
duration_sec: X
generated_at: {ISO}
upstream: [.harness/runs/{run_id}/tasks/{task_id}/phase{N}.md]
downstream: [.harness/runs/{run_id}/04-generate-report.md]
---
```

**본문 섹션**:
1. `## 변경 파일` — path + (created|modified|deleted)
2. `## AC 결과` — 체크리스트 (명령어 → pass/fail + 간단 결과)
3. `## 주요 결정` — 시그니처 수준 지시에서 자유롭게 선택한 부분
4. `## 다음 Phase 참고` — 이 Phase가 노출한 symbol, API, 파일 경로
5. `## Errors` (있을 시) — stderr 핵심 + 원인 추정

---

## 04-generate-report.md (Step 3 종료 후, 메인 세션 작성)

```yaml
---
stage: generate_report
run_id: {run_id}
task_id: {task_id}
phases_completed: N
phases_failed: M
total_duration_sec: X
generated_at: {ISO}
upstream: [.harness/runs/{run_id}/tasks/{task_id}/phase*-output.md]
downstream: [.harness/runs/{run_id}/05-evaluate.md]
---
```

**본문 섹션**:
1. `## Phase 요약` — 표 (Phase, 이름, status, duration, 변경 파일 수)
2. `## 전체 변경 요약` — 합집합 파일 목록 + 통계
3. `## 주목 사항` — phase outputs의 "주요 결정" 중 하이라이트

---

## 05-evaluate.md (Step 4, harness-evaluate 작성)

```yaml
---
stage: evaluate
run_id: {run_id}
status: pass | fail
generated_at: {ISO}
upstream: [.harness/runs/{run_id}/04-generate-report.md]
checks:
  type_check: pass | fail
  lint: pass | fail
  test: pass | fail | skipped
  build: pass | fail | skipped
---
```

**본문 섹션**:
1. `## 검증 요약` — 표 (항목, 결과, 비고)
2. `## 상세 로그` — 각 검사별 핵심 출력 (20-30줄)
3. `## 실패 원인` (있을 시) — `path:line` + 에러 + 추천 조치
4. `## Artifacts` — 변경 파일 수, 추가 테스트 수

---

## 상태 다이어그램 (요약)

```
[00-task.md]
     ↓ (harness-clarify)
[01-clarify.md] ← critical_questions_open > 0 → 사용자 답변 → 재검증
     ↓ (critical_questions_open == 0)
[02-plan.md] + [tasks/{id}/phase*.md] + [index.json]
     ↓ (harness-generate × N)
[phase0-output.md] ... [phaseN-output.md] + [index.json 업데이트]
     ↓ (메인 세션 집계)
[04-generate-report.md]
     ↓ (harness-evaluate)
[05-evaluate.md]
     ↓
사용자 보고 + 옵션 제시 (커밋 / 수정 / 종료)
```
