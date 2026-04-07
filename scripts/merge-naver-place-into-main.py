#!/usr/bin/env python3
"""
백업 디렉토리(/tmp/np-merge-backup/reviews)의 네이버 플레이스 리뷰를
현재 작업 디렉토리(public/data/reviews/{sido}.json)에 머지합니다.

Usage:
    python3 scripts/merge-naver-place-into-main.py [--dry-run]
"""
import json
import sys
from pathlib import Path

BACKUP = Path("/tmp/np-merge-backup/reviews")
TARGET = Path("public/data/reviews")
DRY_RUN = "--dry-run" in sys.argv


def main() -> None:
    if not BACKUP.exists():
        print(f"[ERROR] 백업 디렉토리 없음: {BACKUP}")
        sys.exit(1)

    total_added = 0
    total_kgs = 0

    for backup_file in sorted(BACKUP.glob("*.json")):
        sido = backup_file.stem
        # 51, 52는 이미 Step 4에서 복사됨
        if sido in ("51", "52"):
            continue

        target_file = TARGET / f"{sido}.json"
        if not target_file.exists():
            print(f"[SKIP] {sido}.json: target에 없음")
            continue

        backup_data = json.loads(backup_file.read_text(encoding="utf-8"))
        target_data = json.loads(target_file.read_text(encoding="utf-8"))
        target_reviews = target_data.setdefault("reviews", {})

        added = 0
        added_kgs = 0
        for kg_id, reviews in backup_data.get("reviews", {}).items():
            np_reviews = [r for r in reviews if r.get("source") == "naver_place"]
            if not np_reviews:
                continue

            existing = target_reviews.get(kg_id, [])
            existing_urls = {r["url"] for r in existing}
            new_reviews = [r for r in np_reviews if r["url"] not in existing_urls]

            if new_reviews:
                target_reviews[kg_id] = existing + new_reviews
                added += len(new_reviews)
                if not existing:
                    added_kgs += 1

        if added > 0:
            target_data["totalCount"] = sum(
                len(rs) for rs in target_reviews.values()
            )
            target_data["kindergartenCount"] = len(target_reviews)
            if not DRY_RUN:
                target_file.write_text(
                    json.dumps(target_data, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
            total_added += added
            total_kgs += added_kgs
            mark = "[DRY] " if DRY_RUN else ""
            print(
                f"{mark}{sido}.json: +{added}건 (신규 유치원 {added_kgs}개, "
                f"총 {target_data['totalCount']}건)"
            )

    print()
    print(f"{'[DRY] ' if DRY_RUN else ''}총 추가: {total_added}건 (신규 유치원 {total_kgs}개)")


if __name__ == "__main__":
    main()
