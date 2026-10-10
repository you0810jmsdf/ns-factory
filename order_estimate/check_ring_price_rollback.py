"""pre-commit用: ring-price-stock.csv の巻き戻りを検知する。

直前のコミット(HEAD)とステージ内容を行単位(ring_id・color_id・planner_type・size_mm)で
比較し、次のどちらかがあればコミットを止める。
  1) 確認日時(preferred_last_checked / source_checked_1-3)が後退している
  2) 価格・在庫・メモ(price_jpy / stock_qty / note)の値が消えている

ALLOW_RING_ROLLBACK=1 を付けてコミットすると、このチェックを一回だけ無効化できる。
"""
import csv
import io
import os
import subprocess
import sys
from datetime import datetime

CSV_PATH = "order_estimate/ring-price-stock.csv"
KEY_FIELDS = ["ring_id", "color_id", "planner_type", "size_mm"]
DATE_FIELDS = ["preferred_last_checked", "source_checked_1", "source_checked_2", "source_checked_3"]
VALUE_FIELDS = ["price_jpy", "stock_qty", "note"]
MAX_PROBLEMS_SHOWN = 30


def git_show(ref_path):
    result = subprocess.run(["git", "show", ref_path], capture_output=True)
    if result.returncode != 0:
        return None
    return result.stdout.decode("utf-8-sig", errors="replace")


def parse_csv(text):
    rows = {}
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        key = tuple((row.get(f) or "").strip() for f in KEY_FIELDS)
        rows[key] = row
    return rows


def parse_date(value):
    value = (value or "").strip()
    if not value:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def find_problems(head_rows, staged_rows):
    problems = []
    for key, head_row in head_rows.items():
        staged_row = staged_rows.get(key)
        if staged_row is None:
            continue  # 行削除は今回のガードの対象外

        for field in DATE_FIELDS:
            head_date = parse_date(head_row.get(field))
            staged_date = parse_date(staged_row.get(field))
            if head_date and staged_date and staged_date < head_date:
                problems.append(
                    f"{key}: {field} が {head_date:%Y-%m-%d} -> {staged_date:%Y-%m-%d} に後退"
                )

        for field in VALUE_FIELDS:
            head_val = (head_row.get(field) or "").strip()
            staged_val = (staged_row.get(field) or "").strip()
            if head_val and not staged_val:
                problems.append(f"{key}: {field} の値が消失（『{head_val}』→ 空欄）")
    return problems


def main():
    if os.environ.get("ALLOW_RING_ROLLBACK") == "1":
        print("[ring-price-guard] ALLOW_RING_ROLLBACK=1 のためチェックを省略します。")
        return 0

    staged_names = subprocess.run(
        ["git", "diff", "--cached", "--name-only"], capture_output=True
    ).stdout.decode("utf-8", errors="replace").splitlines()
    if CSV_PATH not in staged_names:
        return 0

    head_text = git_show(f"HEAD:{CSV_PATH}")
    staged_text = git_show(f":{CSV_PATH}")
    if head_text is None or staged_text is None:
        return 0  # 新規追加など、比較対象がない場合は素通りさせる

    problems = find_problems(parse_csv(head_text), parse_csv(staged_text))
    if not problems:
        return 0

    print("=" * 60, file=sys.stderr)
    print("[ring-price-guard] ring-price-stock.csv に巻き戻りの疑いがあります。", file=sys.stderr)
    print("  (直前のコミットより古い内容で上書きされている可能性)", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    for p in problems[:MAX_PROBLEMS_SHOWN]:
        print(f"  - {p}", file=sys.stderr)
    if len(problems) > MAX_PROBLEMS_SHOWN:
        print(f"  ...他 {len(problems) - MAX_PROBLEMS_SHOWN} 件", file=sys.stderr)
    print("", file=sys.stderr)
    print("意図した変更なら、次のいずれかでコミットしてください:", file=sys.stderr)
    print("  1) 本当に古い値へ戻す理由をコミットメッセージに書く", file=sys.stderr)
    print("  2) ALLOW_RING_ROLLBACK=1 を付けて一回だけこのチェックを無効化する", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
