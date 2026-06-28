---
name: harness
description: >
  프로젝트 개발 파이프라인 orchestrator. Clarify → Plan → Generate → Evaluate
  4단계를 전용 sub-agent로 순차 실행하고, 단계 간 artifact(md)로 데이터를 전달한다.
  Use when: 사용자가 "/harness", "harness 실행", "기능 개발 시작" 등 새 기능이나
  작업을 체계적으로 진행하려 할 때. 프로젝트 스코프 — where_kindergarden 전용.
---

# harness — Task Pipeline Orchestrator

## 역할

새 기능/작업을 4단계 파이프라인으로 실행한다.
각 단계는 전용 sub-agent가 담당하고, 결과는 `.harness/runs/{run_id}/` 하위에
md artifact로 저장되어 다음 단계로 전달된다.

| Stage | Sub-agent | 주요 입력 artifact | 주요 출력 artifact |
|-------|-----------|-------------------|-------------------|
| 1. Clarify | `harness-clarify` | `00-task.md` | `01-clarify.md` |
| 2. Plan | `harness-plan` | `00-task.md`, `01-clarify.md` | `02-plan.md`, `tasks/{task-id}/` |
| 3. Generate | `harness-generate` | `tasks/{task-id}/phase{N}.md` | 코드 변경, `phase{N}-output.md`, `index.json` |
| 4. Evaluate | `harness-evaluate` | `04-generate-report.md`, 변경 파일 | `05-evaluate.md` |

스키마 상세: `references/schemas.md`
Phase 작성 원칙: `references/phase-principles.md`

---

## 호출

- `/harness <작업 설명>` — 새 파이프라인 시작
- `/harness resume [run_id]` — 중단된 런 재개 (생략 시 최신 미완료 run 탐색)

---

## Step 0 — Setup

1. **run_id 생성**: `YYYY-MM-DD-HHMM-{slug}`
   - slug: 작업 설명에서 핵심어 추출, 영문 kebab-case 3-5 단어
   - 예: `2026-04-17-1430-review-favorites`
2. `.harness/runs/{run_id}/` 디렉토리 생성
3. **`00-task.md` 작성** (스키마 준수):
   ```markdown
   ---
   stage: task
   run_id: {id}
   task: "사용자 원문 그대로"
   created_at: {ISO+KST}
   ---

   # Task
   {원문 + 사용자 제공 맥락}
   ```
4. `TaskCreate`로 4단계 추적 (Clarify / Plan / Generate / Evaluate)

---

## Step 1 — Clarify

1. `TaskUpdate` Clarify → `in_progress`
2. sub-agent 호출:
   ```
   Task({
     description: "Clarify — 논의점 도출",
     subagent_type: "harness-clarify",
     prompt: `
       Run: {run_id}
       Read: .harness/runs/{run_id}/00-task.md
       Write: .harness/runs/{run_id}/01-clarify.md
       Follow schema in .claude/skills/harness/references/schemas.md.
     `
   })
   ```
3. 완료 후 메인 세션이 `01-clarify.md`를 읽고 frontmatter의 `critical_questions_open` 확인:
   - **> 0 → 블록**. Critical Questions 섹션을 사용자에게 그대로 제시, 답변 수령 후 `01-clarify.md`의 해당 항목을 `resolved` 표기로 업데이트하고 `critical_questions_open`을 0으로 수정
   - **= 0** → non-critical assumption은 artifact에 기록된 채로 통과
4. `TaskUpdate` Clarify → `completed`

**Critical 판단 기준** (sub-agent가 판단, 메인 세션이 재확인):
- 데이터 손실/덮어쓰기 위험
- DB 스키마 breaking change
- 비가역 작업 (프로덕션 배포, 결제, 외부 publish)
- 인증/권한/보안 로직 변경
- 공개 API 계약 변경 (클라이언트 breaking)

그 외 (UX 디테일, 네이밍, 성능 여지, 부가 기능 유무)는 non-critical —
합리적 기본값 기록 후 진행.

---

## Step 2 — Plan

1. `TaskUpdate` Plan → `in_progress`
2. sub-agent 호출:
   ```
   Task({
     description: "Plan — Phase 파일 생성",
     subagent_type: "harness-plan",
     prompt: `
       Run: {run_id}
       Inputs:
         - .harness/runs/{run_id}/00-task.md
         - .harness/runs/{run_id}/01-clarify.md
       Outputs:
         - .harness/runs/{run_id}/02-plan.md
         - .harness/runs/{run_id}/tasks/{task-id}/index.json
         - .harness/runs/{run_id}/tasks/{task-id}/phase{N}.md
       Follow:
         - .claude/skills/harness/references/schemas.md
         - .claude/skills/harness/references/phase-principles.md (7대 원칙)
     `
   })
   ```
3. 메인 세션이 `02-plan.md` 읽어 사용자에게 요약 제시:
   ```
   ## 계획 요약
   Task ID: {task-id}
   Phase 수: N
   - Phase 0: docs-update
   - Phase 1: ...

   이대로 진행? (y / 수정 지시 / n)
   ```
4. 수정 지시 시 plan sub-agent 재호출 (피드백 prompt에 포함)
5. `TaskUpdate` Plan → `completed`

---

## Step 3 — Generate

1. `TaskUpdate` Generate → `in_progress`
2. `tasks/{task-id}/index.json` 로드 → Phase 목록 확인
3. **각 Phase를 순차 실행** (Phase 번호 오름차순):
   ```
   Task({
     description: `Phase {N} — {phase.name}`,
     subagent_type: "harness-generate",
     prompt: `
       Run: {run_id}
       Task: {task-id}
       Phase file: .harness/runs/{run_id}/tasks/{task-id}/phase{N}.md
       Index: .harness/runs/{run_id}/tasks/{task-id}/index.json

       1. Read the phase file completely (prep / directives / cautions / AC).
       2. Execute the directives.
       3. Run the AC commands listed in the phase.
       4. On success: update index.json phase {N} status to "completed" + completed_at.
          On failure: status = "error", error_message = stderr summary.
       5. Write .harness/runs/{run_id}/tasks/{task-id}/phase{N}-output.md
          using schema in .claude/skills/harness/references/schemas.md.
     `
   })
   ```
4. Phase 완료 후 `index.json` 재로드 → 다음 pending Phase로 이동
5. **Phase 실패 시 즉시 중단** — 사용자에게 `phase{N}-output.md` 요약 보고, 옵션:
   - 재시도 (같은 sub-agent 재호출)
   - 수동 수정 후 재개 (`/harness resume`)
   - 종료
6. 모든 Phase 완료 후 메인 세션이 `04-generate-report.md` 작성 (각 phase-output.md 집계)
7. `TaskUpdate` Generate → `completed`

---

## Step 4 — Evaluate

1. `TaskUpdate` Evaluate → `in_progress`
2. sub-agent 호출:
   ```
   Task({
     description: "Evaluate — type-check / lint / test",
     subagent_type: "harness-evaluate",
     prompt: `
       Run: {run_id}
       Inputs:
         - .harness/runs/{run_id}/04-generate-report.md
         - git diff --name-only HEAD
       Write: .harness/runs/{run_id}/05-evaluate.md

       Run all (do NOT stop on first failure — run every applicable check):
         1. pnpm type-check
         2. pnpm lint
         3. pnpm test — only if changed files include tests or sibling tests exist
         4. pnpm build — skip by default (only if user requested)

       Report pass/fail per check with key error lines.
     `
   })
   ```
3. 메인 세션이 `05-evaluate.md` 읽어 결과 제시:
   - ✅ `status: pass` → 사용자에게 최종 성공 보고 + 다음 액션 제안 (커밋? PR?)
   - ❌ `status: fail` → 실패 항목 요약 + 옵션:
     - 자동 수정 시도 (새 Generate 루프 — 수정 전용 Phase 추가)
     - 수동 확인 (사용자가 고친 뒤 `/harness resume`)
     - 종료
4. `TaskUpdate` Evaluate → `completed`

---

## Resume 로직

`/harness resume [run_id]` 또는 `/harness` 호출 시 기존 미완료 run 존재:

1. `run_id` 생략 시 `.harness/runs/*` 디렉토리 중 가장 최근 + 미완료인 것 탐색
2. artifact 존재 여부로 진행 단계 추론:
   | 상태 | 재개 지점 |
   |------|----------|
   | `00-task.md` only | Clarify |
   | `01-clarify.md` 있음 & critical_questions_open > 0 | 사용자 질문부터 |
   | `02-plan.md` 있음 & `index.json`에 pending phase | Generate (pending phase부터) |
   | 모든 phase `completed` & `05-evaluate.md` 없음 | Evaluate |
   | `05-evaluate.md` 있음 & status=fail | 사용자에게 옵션 제시 |
3. 재개 전 사용자에게 현재 상태 요약 후 확인

---

## Artifact 디렉토리 구조

```
.harness/
└── runs/
    └── {run_id}/
        ├── 00-task.md
        ├── 01-clarify.md
        ├── 02-plan.md
        ├── tasks/
        │   └── {task-id}/
        │       ├── index.json
        │       ├── phase0.md
        │       ├── phase0-output.md
        │       ├── phase1.md
        │       └── phase1-output.md
        ├── 04-generate-report.md
        └── 05-evaluate.md
```

---

## 절대 규칙

- ❌ 단계 건너뛰기 금지 — Clarify critical 미해결 시 Plan 진입 금지
- ❌ Evaluate fail을 "일단 커밋"으로 덮지 않음 — 사용자 명시적 확인 필요
- ❌ sub-agent 호출 시 artifact 풀 경로 누락 금지 (`.harness/runs/{run_id}/...`)
- ❌ sub-agent는 자신 담당 외 stage의 artifact를 수정하지 않음 (Read만)
- ❌ `CLAUDE.md`의 절대 규칙 위배 금지 (main 직접 작업 금지, any 타입 금지 등)
- ✅ 모든 artifact는 md + YAML frontmatter
- ✅ 각 stage 완료 시 메인 세션이 artifact를 읽고 상태를 사용자에게 한 줄 요약
- ✅ 파이프라인 중단 지점은 항상 artifact로 표시되어 있어야 함 (Resume 가능)

---

## 참조 파일

- `references/schemas.md` — 각 artifact의 YAML frontmatter + 본문 구조
- `references/phase-principles.md` — Phase 작성 7대 원칙 (harness-plan이 준수)
- `references/run-phases.py` — (optional) 백그라운드 CLI 자동 실행 스크립트
