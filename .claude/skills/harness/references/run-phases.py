#!/usr/bin/env python3
"""
Phase Runner (optional) — harness 파이프라인의 Generate 단계를 CLI 백그라운드로 실행.

사용 시점:
- 메인 세션(orchestrator)에서 Task 도구로 phase를 순차 실행하는 것이 기본.
- 이 스크립트는 "하네스 run을 백그라운드/무인 실행하고 싶을 때" 사용.
- 각 phase는 `claude -p` CLI + harness-generate sub-agent 지정으로 실행.

Usage:
    python3 .claude/skills/harness/references/run-phases.py <run_id> <task_id>
    python3 .claude/skills/harness/references/run-phases.py <run_id> <task_id> --resume
    python3 .claude/skills/harness/references/run-phases.py <run_id> <task_id> --only <phase_num>

예시:
    python3 .claude/skills/harness/references/run-phases.py \\
        2026-04-17-1430-review-favorites review-favorites
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

KST = timezone(timedelta(hours=9))


def find_project_root() -> Path:
    """Find project root by walking up looking for .git."""
    current = Path.cwd()
    while current != current.parent:
        if (current / ".git").exists():
            return current
        current = current.parent
    return Path.cwd()


def now_iso() -> str:
    return datetime.now(KST).isoformat()


def load_index(task_dir: Path) -> dict:
    index_path = task_dir / "index.json"
    if not index_path.exists():
        print(f"Error: {index_path} not found", file=sys.stderr)
        sys.exit(1)
    with open(index_path) as f:
        return json.load(f)


def save_index(task_dir: Path, index: dict) -> None:
    index["updated_at"] = now_iso()
    with open(task_dir / "index.json", "w") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)


def find_next_phase(index: dict, only: int | None = None) -> dict | None:
    for phase in index.get("phases", []):
        if only is not None and phase["phase"] != only:
            continue
        if phase["status"] == "pending":
            return phase
        if only is not None:
            # --only 지정 시 해당 phase가 pending이 아니어도 False
            return None
    return None


def build_prompt(run_dir: Path, task_dir: Path, phase: dict, index: dict) -> str:
    """Build a self-contained prompt invoking harness-generate conventions."""
    phase_num = phase["phase"]
    phase_file = task_dir / f"phase{phase_num}.md"
    if not phase_file.exists():
        print(f"Error: {phase_file} not found", file=sys.stderr)
        sys.exit(1)

    run_id = index["run_id"]
    task_id = index["id"]
    root = find_project_root().resolve()
    phase_file_abs = phase_file.resolve()
    index_abs = (task_dir / "index.json").resolve()
    output_abs = (task_dir / f"phase{phase_num}-output.md").resolve()
    schemas_abs = (root / ".claude/skills/harness/references/schemas.md").resolve()
    agent_abs = (root / ".claude/agents/harness-generate.md").resolve()

    return f"""You are the harness-generate sub-agent executor.
Read the phase file and follow the harness-generate conventions.

Run: {run_id}
Task: {task_id}

Project root (absolute): {root}
Phase file (absolute):   {phase_file_abs}
Index (absolute):        {index_abs}
Output (absolute):       {output_abs}

CRITICAL RULES — ABSOLUTE PATHS REQUIRED:
- ALL Read / Write / Edit calls MUST use absolute paths rooted at {root}.
- Do NOT use `cd` to change working directory. If you need to run a command
  from a specific directory, use `cd {root}/subdir && cmd` as a single
  compound Bash invocation — never issue a standalone `cd` that persists.
- When the phase file mentions a relative path like `.harness/...`,
  `docs/...`, `src/...`, `ios/...`, `scripts/...`, prefix it with `{root}/`.
- When updating index.json, write to {index_abs} (not any other
  `.harness/` under a subdirectory — misplaced paths are a known failure mode).
- When writing phaseN-output.md, write to {output_abs}.

Steps:
1. Read the phase file at {phase_file_abs} (prep / directives / cautions / AC).
2. Execute the directives strictly within scope.
3. Run each AC command and capture exit code + key output.
4. Update {index_abs}: set phase {phase_num} status to
   "completed" (all AC pass) or "error" (any AC fail, with error_message).
5. Write {output_abs} using the schema at {schemas_abs}.

Refer to:
- {agent_abs} (role + rules)
- {schemas_abs} (artifact schema)

Original task prompt: {index.get('prompt', 'N/A')}
"""


def run_phase(run_dir: Path, task_dir: Path, phase: dict, index: dict) -> bool:
    phase_num = phase["phase"]
    prompt = build_prompt(run_dir, task_dir, phase, index)

    print(f"\n{'=' * 60}")
    print(f"Phase {phase_num}: {phase['name']}")
    print(f"{'=' * 60}")

    phase["status"] = "in_progress"
    phase["started_at"] = now_iso()
    save_index(task_dir, index)

    start = time.time()
    try:
        result = subprocess.run(
            [
                "claude",
                "-p",
                "--dangerously-skip-permissions",
                "--output-format", "json",
                prompt,
            ],
            capture_output=True,
            text=True,
            timeout=900,  # 15 min per phase
            cwd=find_project_root(),
        )
        elapsed = time.time() - start

        # Save raw CLI output for debugging
        cli_log_path = task_dir / f"phase{phase_num}-cli.json"
        try:
            cli_data = json.loads(result.stdout) if result.stdout else {}
        except json.JSONDecodeError:
            cli_data = {"raw_stdout": result.stdout, "raw_stderr": result.stderr}
        cli_data["elapsed_seconds"] = round(elapsed, 1)
        with open(cli_log_path, "w") as f:
            json.dump(cli_data, f, indent=2, ensure_ascii=False)

        # Re-read index — harness-generate should have updated it
        updated = load_index(task_dir)
        updated_phase = next(
            (p for p in updated["phases"] if p["phase"] == phase_num), None
        )

        if updated_phase and updated_phase["status"] == "completed":
            print(f"  ✅ Completed in {elapsed:.0f}s")
            return True
        elif updated_phase and updated_phase["status"] == "error":
            print(f"  ❌ Error: {updated_phase.get('error_message', 'unknown')}")
            return False
        else:
            print(f"  ⚠️  Phase did not update its status — marking error")
            if updated_phase:
                updated_phase["status"] = "error"
                updated_phase["error_message"] = (
                    "harness-generate did not update status. "
                    f"CLI log: {cli_log_path.relative_to(find_project_root())}"
                )
                save_index(task_dir, updated)
            return False

    except subprocess.TimeoutExpired:
        print(f"  ⏰ Timeout (15 min)")
        phase["status"] = "error"
        phase["error_message"] = "Timeout after 900 seconds"
        save_index(task_dir, index)
        return False
    except Exception as e:
        print(f"  💥 Exception: {e}")
        phase["status"] = "error"
        phase["error_message"] = str(e)
        save_index(task_dir, index)
        return False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run harness Generate phases via claude CLI"
    )
    parser.add_argument("run_id", help="e.g. 2026-04-17-1430-review-favorites")
    parser.add_argument("task_id", help="e.g. review-favorites")
    parser.add_argument("--resume", action="store_true", help="Resume pending phases")
    parser.add_argument("--only", type=int, help="Run only the given phase number")
    args = parser.parse_args()

    root = find_project_root()
    run_dir = root / ".harness" / "runs" / args.run_id
    task_dir = run_dir / "tasks" / args.task_id

    if not task_dir.exists():
        print(f"Error: {task_dir} not found", file=sys.stderr)
        sys.exit(1)

    index = load_index(task_dir)
    print(f"\n🚀 Task: {index['name']} ({len(index['phases'])} phases)")
    print(f"   Run:    {args.run_id}")
    print(f"   Root:   {root}")

    total_start = time.time()
    completed = 0

    while True:
        index = load_index(task_dir)
        phase = find_next_phase(index, only=args.only)
        if phase is None:
            break

        ok = run_phase(run_dir, task_dir, phase, index)
        if ok:
            completed += 1
            if args.only is not None:
                break
        else:
            print(f"\n❌ Stopped at phase {phase['phase']}. Fix and re-run with --resume.")
            break

    total = time.time() - total_start
    index = load_index(task_dir)
    all_done = all(p["status"] == "completed" for p in index["phases"])
    if all_done:
        index["status"] = "completed"
        index["completed_at"] = now_iso()
        save_index(task_dir, index)

    print(f"\n{'=' * 60}")
    print(f"📊 Summary")
    print(f"   Completed this run: {completed}")
    print(f"   Total phases:       {len(index['phases'])}")
    print(f"   Overall status:     {index.get('status', 'pending')}")
    print(f"   Total time:         {total:.0f}s ({total / 60:.1f}min)")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
