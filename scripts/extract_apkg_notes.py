#!/usr/bin/env python3
"""extract_apkg_notes.py —— 从 .apkg 提取全部笔记为 JSON

用途：把已生成的卡组反向还原为结构化数据（fields/tags/deckPath/guid），
用于重建 src/data/*.js、数据审计、或「导入既有卡组」场景。

用法：python3 scripts/extract_apkg_notes.py <apkg> [--out out.json] [--json-indent 2]
"""

import argparse
import json
import os
import sqlite3
import sys
import tempfile
import zipfile

FIELDS = ["篇目", "标题", "上句", "下句", "原文", "译文", "注释", "赏析", "链接"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("apkg")
    ap.add_argument("--out", default=None)
    ap.add_argument("--json-indent", type=int, default=2)
    args = ap.parse_args()

    with zipfile.ZipFile(args.apkg) as z:
        anki2 = z.read("collection.anki2")

    tmp = tempfile.NamedTemporaryFile(suffix=".anki2", delete=False)
    try:
        tmp.write(anki2)
        tmp.close()
        conn = sqlite3.connect(tmp.name)
        conn.row_factory = sqlite3.Row
        col = conn.execute("SELECT decks FROM col").fetchone()
        decks = {int(did): d["name"] for did, d in json.loads(col["decks"]).items()}
        notes = conn.execute("SELECT * FROM notes ORDER BY id").fetchall()
        cards = conn.execute("SELECT nid, did, ord FROM cards").fetchall()

        deck_of = {}
        for c in cards:
            deck_of.setdefault(c["nid"], set()).add(decks.get(c["did"], "?"))
        ord_of = {}
        for c in cards:
            ord_of.setdefault(c["nid"], set()).add(c["ord"])

        out = []
        for n in notes:
            vals = n["flds"].split("\x1f")
            fields = {}
            for i, name in enumerate(FIELDS):
                fields[name] = vals[i] if i < len(vals) else ""
            out.append({
                "guid": n["guid"],
                "tags": n["tags"].split(),
                "deckPath": "/".join(sorted(deck_of.get(n["id"], []))),
                "ord": sorted(ord_of.get(n["id"], [])),
                "fields": fields,
            })
    finally:
        os.unlink(tmp.name)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=args.json_indent)
    else:
        print(json.dumps(out, ensure_ascii=False, indent=args.json_indent))
    print(f"# 提取 {len(out)} 条笔记", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
