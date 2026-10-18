// anki.test.mjs —— 生成核心单元测试（node:test）
//
// 运行：npm test（node --test tests/anki.test.mjs；目录参数会 MODULE_NOT_FOUND）

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import initSqlJs from "sql.js";
import JSZip from "jszip";

import { buildApkg, downloadApkg } from "../src/anki/index.js";
import { stableGuid, stableDeckId, cardCsum, sha1, fnv1a64 } from "../src/anki/ids.js";
import { GUWEN_MODEL } from "../src/model/guwen.js";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
const SQL = await initSqlJs();

const FIXED_NOW = new Date("2026-10-17T00:00:00").getTime();

// 样例笔记：两条背诵（上句非空、原文留空）+ 一条理解（仅原文）+ 一条混合
const sampleNotes = [
  {
    fields: { 篇目: "道德经 · 第01章 · 背句 01", 标题: "第01章 · 背句 01", 上句: "道可道", 下句: "非常道；" },
    tags: ["道德经", "道经", "背诵"],
    deckPath: "道德经::第01章",
    guidSeed: "daodejing:01:recite:01",
  },
  {
    fields: { 篇目: "道德经 · 第01章 · 背句 02", 标题: "第01章 · 背句 02", 上句: "名可名", 下句: "非常名。" },
    tags: ["道德经", "道经", "背诵"],
    deckPath: "道德经::第01章",
    guidSeed: "daodejing:01:recite:02",
  },
  {
    fields: { 篇目: "道德经 · 第01章 · 道可道", 标题: "第1章 道可道，非常道", 原文: "道可道，非常道；名可名，非常名。\n无名天地之始，有名万物之母。", 译文: "可以说出的道，不是恒常的道……", 注释: "道：宇宙本原" },
    tags: ["道德经", "道经"],
    deckPath: "道德经::第01章",
    guidSeed: "daodejing:chapter:01",
  },
  {
    fields: { 篇目: "庄子 · 逍遥游 · 第1段", 标题: "北冥有鱼，其名为鲲", 原文: "北冥有鱼，其名为鲲。", 译文: "北方大海里有条鱼，名字叫鲲。", 注释: "北冥：北海" },
    tags: ["庄子", "逍遥游", "内篇"],
    deckPath: "庄子::逍遥游::第1段",
    guidSeed: "zhuangzi:xiaoyaoyou:1",
  },
];

async function makeSample() {
  return buildApkg({
    SQL,
    JSZip,
    model: GUWEN_MODEL,
    notes: sampleNotes,
    decks: [{ path: "道德经" }, { path: "庄子" }, { path: "道德经::第01章" }, { path: "庄子::逍遥游" }, { path: "庄子::逍遥游::第1段" }],
    media: {},
    meta: { source: "测试样例", sourceUrl: "https://example.com", generatedAt: "2026-10-17" },
    options: { now: FIXED_NOW },
  });
}

test("buildApkg 生成合法 .apkg（schema v11 结构）", async () => {
  const r = await makeSample();
  const zip = await JSZip.loadAsync(r.bytes);
  assert.ok(zip.file("collection.anki2"), "zip 应含 collection.anki2");
  assert.ok(zip.file("media"), "zip 应含 media");
  const db = new SQL.Database(await zip.file("collection.anki2").async("uint8array"));
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'").flatMap((x) => x.values.flat());
  assert.deepEqual(new Set(tables), new Set(["col", "notes", "cards", "revlog", "graves"]));
  assert.equal(db.exec("SELECT ver FROM col")[0].values[0][0], 11);
  assert.equal(db.exec("SELECT COUNT(*) FROM notes")[0].values[0][0], 4);
  assert.equal(db.exec("SELECT COUNT(*) FROM cards")[0].values[0][0], 4);
  db.close();
});

test("模板 req 控制出卡：背诵/理解互不串扰", async () => {
  const r = await makeSample();
  const zip = await JSZip.loadAsync(r.bytes);
  const db = new SQL.Database(await zip.file("collection.anki2").async("uint8array"));
  const ordByGuid = {};
  db.exec("SELECT n.guid, c.ord FROM cards c JOIN notes n ON n.id = c.nid").forEach((t) =>
    t.values.forEach(([g, o]) => (ordByGuid[g] = (ordByGuid[g] ?? []).concat(o).sort()))
  );
  const g = (seed) => stableGuid(seed);
  // 背诵卡（原文留空）→ 只出 ord=0；理解卡（仅原文）→ 只出 ord=1；混合 → 0+1
  assert.deepEqual(ordByGuid[g("daodejing:01:recite:01")], [0]);
  assert.deepEqual(ordByGuid[g("daodejing:chapter:01")], [1]);
  assert.deepEqual(ordByGuid[g("daodejing:01:recite:02")], [0]);
  db.close();
});

test("稳定 guid / 牌组 id：同 seed 恒定，不同 seed 不同", () => {
  assert.equal(stableGuid("daodejing:01:recite:01"), stableGuid("daodejing:01:recite:01"));
  assert.equal(stableGuid("daodejing:01:recite:01").length, 8);
  assert.notEqual(stableGuid("daodejing:01:recite:01"), stableGuid("daodejing:01:recite:02"));
  assert.equal(stableDeckId("道德经::第01章"), stableDeckId("道德经::第01章"));
  assert.notEqual(stableDeckId("道德经::第01章"), stableDeckId("道德经::第02章"));
});

test("csum = \\x1f 拼字段截 500 字 → sha1 前 8 位 hex", () => {
  const fields = ["道德经 · 第01章 · 背句 01", "第01章 · 背句 01", "道可道", "非常道；", "", "", "", "", ""];
  const expect = parseInt(sha1(fields.join("\x1f").slice(0, 500)).slice(0, 8), 16);
  assert.equal(cardCsum(fields), expect);
  assert.ok(fnv1a64("x") !== fnv1a64("y"));
});

// 落盘样例 apkg 供 npm run verify 交叉验证
mkdirSync(outDir, { recursive: true });
const sample = await makeSample();
writeFileSync(join(outDir, "sample.apkg"), Buffer.from(sample.bytes));
