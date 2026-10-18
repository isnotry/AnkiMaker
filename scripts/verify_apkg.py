#!/usr/bin/env python3
"""verify_apkg.py —— 用 Python 独立回读 .apkg，交叉验证生成正确性

与生成路径（Node + sql.js + JSZip）不同：zipfile 解包 + sqlite3 读库。
任一检查失败 → 非零退出码。

用法：python3 scripts/verify_apkg.py tests/out/sample.apkg
"""

import argparse
import json
import os
import sqlite3
import sys
import tempfile
import zipfile

EXPECTED_TABLES = {"col", "notes", "cards", "revlog", "graves"}
FIELDS = ["篇目", "标题", "上句", "下句", "原文", "译文", "注释", "赏析", "链接"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("apkg", help="待验证的 .apkg 路径")
    ap.add_argument("--main-deck", default="唐诗三百首", help="承载生成元信息的主牌组名")
    ap.add_argument("--expect-notes", type=int, default=None, help="期望笔记数（缺省只报告不判定）")
    ap.add_argument("--expect-cards", type=int, default=None, help="期望卡片数（缺省只报告不判定）")
    args = ap.parse_args()

    failures = []
    ok = lambda msg: print(f"  [PASS] {msg}")
    fail = lambda msg: failures.append(msg) or print(f"  [FAIL] {msg}")

    print(f"== 解包 {args.apkg} ==")
    with zipfile.ZipFile(args.apkg) as z:
        names = set(z.namelist())
        for required in ("collection.anki2", "media"):
            if required not in names:
                fail(f"zip 缺少 {required}")
                print("终止：apkg 结构不完整")
                return 1
        media = json.loads(z.read("media").decode("utf-8"))
        ok(f"zip 含 collection.anki2 + media；media 映射 {len(media)} 项")
        anki2 = z.read("collection.anki2")

    tmp = tempfile.NamedTemporaryFile(suffix=".anki2", delete=False)
    try:
        tmp.write(anki2)
        tmp.close()
        conn = sqlite3.connect(tmp.name)
        conn.row_factory = sqlite3.Row

        print("== 表结构 ==")
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if tables == EXPECTED_TABLES:
            ok(f"表集合一致 {sorted(tables)}")
        else:
            fail(f"表集合不符：{sorted(tables)}")

        print("== col 行 ==")
        col = conn.execute("SELECT * FROM col").fetchone()
        if col["ver"] == 11:
            ok("schema 版本 ver=11")
        else:
            fail(f"ver={col['ver']}，预期 11")
        try:
            conf = json.loads(col["conf"])
            models = json.loads(col["models"])
            decks = json.loads(col["decks"])
            dconf = json.loads(col["dconf"])
            tags = json.loads(col["tags"])
            ok("conf/models/decks/dconf/tags 均为合法 JSON")
        except json.JSONDecodeError as e:
            fail(f"col JSON 解析失败：{e}")
            return 1

        print("== 牌组配置（dconf）==")
        dconf_bad = []
        for cid, cfg in dconf.items():
            for key in ("new", "rev", "lapse"):
                if key not in cfg or not isinstance(cfg[key], dict):
                    dconf_bad.append(f"{cid}.{key}")
        if not dconf_bad:
            ok("dconf 含 Anki 26 schema11 兼容结构（new/rev/lapse）——可被新版 Anki 导入")
        else:
            fail(f"dconf 缺少嵌套子对象（新版 Anki 导入会报 missing field `rev`/`lapse` 类错误）：{dconf_bad}")

        print("== 笔记类型 ==")
        for mid, model in models.items():
            nf = len(model.get("flds", []))
            nt = len(model.get("tmpls", []))
            sortf = model.get("sortf")
            print(f"  模型 {mid}：{model['name']} | 字段 {nf} | 模板 {nt} | sortf {sortf}")
            all_refs_ok = True
            for t in model.get("tmpls", []):
                refs = [
                    f["name"] for f in model["flds"]
                    if "{{" + f["name"] + "}}" in t.get("qfmt", "")
                    or "{{" + f["name"] + "}}" in t.get("afmt", "")
                ]
                if not refs:
                    all_refs_ok = False
            ok("所有模板均引用字段") if all_refs_ok else fail("存在未引用任何字段的模板")
        if conf.get("curModel") in models:
            ok(f"conf.curModel={conf['curModel']} 指向存在的模型")
        else:
            fail("conf.curModel 指向不存在的模型")

        print("== 牌组 ==")
        names_ = [d["name"] for d in decks.values()]
        print(f"  牌组：{names_}")
        # Anki 26 用 HashMap<DeckId, DeckSchema11> 解码 col.decks——JSON key 必须是数字 ID 字符串，
        # 写牌组名会报 "expected key to be a number in quotes" → decoding decks: JsonError
        bad_keys = [k for k in decks if not str(k).isdigit()]
        if not bad_keys:
            ok(f"decks JSON 的 key 全部为数字 ID（{len(decks)} 个），可被 Anki 26 解码")
        else:
            fail(f"decks JSON 存在非数字 key（会导致 decoding decks: JsonError）：{bad_keys[:5]}")
        main = [d for d in decks.values() if d["name"] == args.main_deck]
        if main and "来源" in main[0]["desc"]:
            ok(f"主牌组「{args.main_deck}」描述含生成元信息（来源）")
        else:
            fail(f"主牌组「{args.main_deck}」描述缺少生成元信息")

        print("== 笔记 ==")
        notes = conn.execute("SELECT * FROM notes ORDER BY id").fetchall()
        if len(notes) > 0:
            ok(f"笔记数 {len(notes)}")
        else:
            fail("笔记数为 0")
        if args.expect_notes is not None and len(notes) != args.expect_notes:
            fail(f"笔记数 {len(notes)}，预期 {args.expect_notes}")
        fld_counts = set(len(n["flds"].split("\x1f")) for n in notes)
        if fld_counts == {9}:
            ok("所有笔记字段均以 \\x1f 分隔且为 9 个")
        else:
            fail(f"字段数异常：{sorted(fld_counts)}")
        if all(n["sfld"] == n["flds"].split("\x1f")[1] for n in notes):
            ok("sfld = 排序字段（标题）")
        else:
            fail("sfld 与排序字段不一致")
        if all(n["guid"] and len(n["guid"]) == 8 for n in notes):
            ok("guid 均为 8 字符")
        else:
            fail("guid 长度异常")
        bad_csum = [n for n in notes if not isinstance(n["csum"], int)]
        if not bad_csum:
            ok("csum 均为整数")
        else:
            fail("csum 类型异常")

        print("== 卡片 ==")
        cards = conn.execute("SELECT * FROM cards").fetchall()
        if args.expect_cards is None:
            ok(f"卡片数 {len(cards)}（未指定预期，仅报告）")
        elif len(cards) == args.expect_cards:
            ok(f"卡片数 = {args.expect_cards}")
        else:
            fail(f"卡片数 {len(cards)}，预期 {args.expect_cards}")
        if all(c["type"] == 0 and c["queue"] == 0 for c in cards):
            ok("全部卡片为「新卡」(type=0, queue=0)")
        else:
            fail("存在非新卡")
        ords = sorted({c["ord"] for c in cards})
        print(f"  模板 ord 分布：{ords}")
        if all(n["nid"] in {n0["id"] for n0 in notes} for n in cards):
            ok("卡片 nid 全部指向存在的笔记")
        else:
            fail("存在孤儿卡片")
        # 牌组归属：did 必须全部存在于 decks，且不是"全部挤进同一牌组"（防止 did 错配）
        deck_ids = set(decks.keys())
        bad_did = [c["did"] for c in cards if str(c["did"]) not in deck_ids]
        distinct_did = {c["did"] for c in cards}
        if bad_did:
            fail(f"卡片 did 指向不存在的牌组：{bad_did[:5]}")
        elif len(distinct_did) <= 1 and len(decks) > 1 and args.expect_cards and args.expect_cards > 1:
            fail(f"全部卡片挤在同一牌组（did 错配，导入后牌组错乱）：{distinct_did}")
        else:
            ok(f"卡片 did 全部存在且分布到 {len(distinct_did)} 个牌组")
        # 通用断言：tag 含「背诵」的笔记（上句非空、原文留空）只应出背诵模板 ord=0；
        # 其余原文非空的笔记（无「背诵」tag）必须出理解模板 ord=1（字段齐全时可与背诵卡并存 ord 0+1）
        recite_ids = {n["id"] for n in notes if "背诵" in n["tags"]}
        other_ids = {n["id"] for n in notes if "背诵" not in n["tags"] and n["flds"].split("\x1f")[4]}
        recite_ords = {c["ord"] for c in cards if c["nid"] in recite_ids}
        other_ords = {c["ord"] for c in cards if c["nid"] in other_ids}
        if not recite_ids:
            ok("本包无背诵卡（样例场景）")
        elif recite_ords == {0}:
            ok("背诵卡（tag「背诵」）只生成背诵模板（ord=0，req 上句非空）")
        else:
            fail(f"背诵卡 ord 异常：{recite_ords}")
        if not other_ids:
            ok("本包无整章理解卡")
        elif 1 in other_ords and other_ords <= {0, 1}:
            ok(f"整章理解卡生成理解模板 ord=1（{sorted(other_ords)}，字段齐全时可并存背诵卡）")
        else:
            fail(f"整章理解卡 ord 异常：{other_ords}")

        print("== 复习/删除表 ==")
        if conn.execute("SELECT COUNT(*) FROM revlog").fetchone()[0] == 0 and \
           conn.execute("SELECT COUNT(*) FROM graves").fetchone()[0] == 0:
            ok("revlog / graves 为空（全新卡组）")
        else:
            fail("revlog/graves 非空")

        conn.close()
    finally:
        os.unlink(tmp.name)

    print()
    if failures:
        print(f"结论：失败 {len(failures)} 项")
        return 1
    print("结论：全部通过 ✅（Python 独立回读与 Node 生成一致）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
