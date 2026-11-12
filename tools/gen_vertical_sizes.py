"""週間バーチカル（bible-vertical）を他の判型へ展開する生成スクリプト（2026-11-12 事業主決定A）。

考え方:
  bible-vertical は bible-weekly から派生した（2026-10-27）。寸法・穴・面付け・用紙の記述は bible-weekly と同じ文のまま残っている。
  そこで「bible-weekly → <判型>-weekly の差分」のうち、置き換え前の文が bible-vertical にもそのまま1回だけ出てくる箇所だけを
  置き換えて <判型>-vertical/index.html を作る。縦型にしか無い記述（題名・説明・設定キーなど）は REPLACE_EXTRA で直す。

⛔ <判型>-vertical/index.html は生成物。直すときは bible-vertical（正本）を直してから、このスクリプトで作り直す。

使い方:
  py tools/gen_vertical_sizes.py            # 5判型を生成し、置き換えた箇所の一覧を出す
  py tools/gen_vertical_sizes.py a6 mini6   # 指定の判型だけ
"""
import difflib
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZES = {  # slug: (表示名, 寸法の文字列)
    "a5": ("A5", "148×210mm"),
    "a5slim": ("A5スリム", "110×210mm"),
    "a6": ("A6", "105×148mm"),
    "mini6": ("Mini6", "80×128mm"),
    "micro5": ("Micro5", "62×105mm"),
}


SKIP_RE = re.compile(r"dbox|Dbox|bgForStorage")
PAPER_BLOCK_RE = re.compile(r"<script>\r?\n// 用紙切り替え（paper-switch\.js）.*?<script src=\"\.\./assets/paper-switch\.js\"></script>\r?\n", re.S)


def read(rel):
    with io.open(os.path.join(ROOT, rel), encoding="utf-8", newline="") as f:
        return f.read()


def gen(slug):
    name, dims = SIZES[slug]
    base_w = read("bible-weekly/index.html").splitlines(keepends=True)
    size_w = read(f"{slug}-weekly/index.html").splitlines(keepends=True)
    out = read("bible-vertical/index.html")
    applied, skipped = [], 0
    sm = difflib.SequenceMatcher(None, base_w, size_w, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag != "replace":
            continue
        old = "".join(base_w[i1:i2])
        new = "".join(size_w[j1:j2])
        if SKIP_RE.search(new):  # 週間にしか無い機能（A5のデザイン画像）を縦型に持ち込まない
            skipped += 1
            continue
        if out.count(old) == 1:
            out = out.replace(old, new)
            applied.append((i1 + 1, old.strip()[:70]))
        else:
            skipped += 1
    # 週間に用紙の切り替えが無い判型（A5スリム・A6・Micro5）は、バイブル由来の用紙切り替えを外す
    # （残すと const の SLOT_MAP へ代入して止まり、用紙もバイブルのA4横3面になる）
    if "NSF_PAPERS" not in "".join(size_w):
        out, n = PAPER_BLOCK_RE.subn("", out)
        if n != 1:
            raise RuntimeError(f"{slug}: 用紙切り替えの部分を外せませんでした（{n}）")
    # 縦型にしか無い文の言い換え（更新履歴より前だけ。履歴はバイブル版の経緯として残す）
    hi = out.index("const HISTORY_ENTRIES = [")
    head, tail = out[:hi], out[hi:]
    for a, b in [
        ("バイブル週間バーチカル", f"{name}週間バーチカル"),
        ("バイブル 週間バーチカル", f"{name} 週間バーチカル"),
        ("バイブル（95×170mm）", f"{name}（{dims.replace('mm', '')}mm）"),
        ("nsf_bible_vertical_g1", f"nsf_{slug}_vertical_g1"),
        (f"`{slug}-weekly-${{opts.undated", f"`{slug}-vertical-${{opts.undated"),  # PDFの名前
        ("`bible-weekly-${opts.undated", f"`{slug}-vertical-${{opts.undated"),
        ("`bible-vertical-${opts.undated", f"`{slug}-vertical-${{opts.undated"),
    ]:
        head = head.replace(a, b)
    out = head + tail
    # 更新履歴：この判型版を作った1件を先頭（最初の要素）に足す
    entry = (f"  {{ date: '2026-11-12', type: 'feat', title: '{name} 週間バーチカルを新規作成',\n"
             f"    detail: 'バイブル週間バーチカルを土台に、{name}（{dims}）版を作りました。面付け・穴位置・用紙の選択は {name} 週間ブロックと同じです。"
             f"実物での組み立て・穴位置の確認は未了です。' }},\n")
    # 履歴は古い順に並び、画面で逆順に出す。最初の閉じ括弧（"\n]" か "\n];"）の手前＝末尾に足す
    # バイブル版だけの履歴（PDF名の直し）は他の判型に載せない
    out = re.sub(r"  \{ date: '2026-11-12', type: 'fix', title: 'PDFのファイル名を「bible-vertical」に',.*?\},\r?\n", "", out, flags=re.S)
    hi = out.index("const HISTORY_ENTRIES = [")
    pos = out.index("\n]", hi) + 1            # "]" の位置（直前の行は改行で終わっている）
    if out[pos - 2] == "\r":
        entry = entry.replace("\n", "\r\n")
    head = out[:pos]
    body = head.rstrip("\r\n")
    nlpart = head[len(body):]
    if not body.endswith(","):               # 直前の項目にカンマが無ければ足す
        body += ","
    out = body + nlpart + entry + out[pos:]
    os.makedirs(os.path.join(ROOT, f"{slug}-vertical"), exist_ok=True)
    with io.open(os.path.join(ROOT, f"{slug}-vertical", "index.html"), "w", encoding="utf-8", newline="") as f:
        f.write(out)
    left = [m.start() for m in re.finditer("バイブル|95×170|bible", out)]
    return applied, skipped, out, left


NAV_SIZES = [("a5", "A5"), ("a5slim", "A5スリム"), ("a6", "A6"), ("bible", "バイブル"), ("mini6", "Mini6"), ("micro5", "Micro5")]
NAV_KINDS = [("weekly", "週間"), ("vertical", "週間バーチカル"), ("monthly", "月間"), ("daily", "日次")]
A_STYLE = 'style="color:#7A5540;font-weight:700;text-decoration:underline;"'
CUR_STYLE = 'style="background:#7A5540;color:#fff;padding:1px 9px;border-radius:4px;font-weight:700;"'
ROW_RE = re.compile(r'^  <span><span style="color:#8a7362;">[^<]+：</span>.*</span>\r?$', re.M)


def nav_rows(cur):
    rows = []
    for slug, label in NAV_SIZES:
        parts = []
        for kind, kl in NAV_KINDS:
            d = f"{slug}-{kind}"
            parts.append(f'<strong aria-current="page" {CUR_STYLE}>{kl}</strong>' if d == cur
                         else f'<a href="../{d}/" {A_STYLE}>{kl}</a>')
        rows.append(f'  <span><span style="color:#8a7362;">{label}：</span>' + " ／ ".join(parts) + "</span>")
    return rows


def rebuild_nav(dirname):
    """判型の切り替え欄の行を、全判型×（週間・週間バーチカル・月間・日次）で作り直す。"""
    path = os.path.join(ROOT, dirname, "index.html")
    html = read(f"{dirname}/index.html")
    m = re.search(r'<nav id="nsf-size-switch".*?</nav>', html, re.S)
    if not m:
        return False
    block = m.group(0)
    olds = ROW_RE.findall(block)
    if len(olds) != 6:
        raise RuntimeError(f"{dirname}: 判型の行が6行ではありません（{len(olds)}行）")
    nl = "\r\n" if "\r\n" in block else "\n"
    first = block.index(olds[0])
    last = block.index(olds[-1]) + len(olds[-1])
    new_block = block[:first] + nl.join(nav_rows(dirname)) + block[last:]
    html = html.replace(block, new_block)
    with io.open(path, "w", encoding="utf-8", newline="") as f:
        f.write(html)
    return True


def main():
    if sys.argv[1:2] == ["--nav"]:
        dirs = [f"{s}-{k}" for s, _ in NAV_SIZES for k, _ in NAV_KINDS]
        for d in dirs:
            if os.path.exists(os.path.join(ROOT, d, "index.html")):
                rebuild_nav(d)
                print("nav", d)
            else:
                print("なし", d)
        return
    slugs = sys.argv[1:] or list(SIZES)
    for slug in slugs:
        applied, skipped, out, left = gen(slug)
        print(f"== {slug}: 置き換え {len(applied)} 箇所・該当なし {skipped}")
        for ln, s in applied:
            print(f"   L{ln}: {s}")
        lines = out.splitlines()
        hits = [i + 1 for i, l in enumerate(lines) if re.search("バイブル|95×170|bible", l)]
        print(f"   残った「バイブル/bible」の行: {hits}")


if __name__ == "__main__":
    main()
