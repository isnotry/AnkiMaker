// build_texts_apkg.mjs —— 道德经 + 逍遥游 → 一个 .apkg
//
// 道德经：81 整章（理解卡）+ 473 背诵（背诵卡）= 554 笔记
// 逍遥游：7 段理解卡
// 合计 561 笔记 / 561 卡 / 94 牌组（主牌组 道德经、庄子、逍遥游 + 81 章子牌组）
// 用法：node scripts/build_texts_apkg.mjs [输出路径]

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import initSqlJs from "sql.js";
import JSZip from "jszip";

import { buildApkg } from "../src/anki/index.js";
import { GUWEN_MODEL } from "../src/model/guwen.js";
import { DAODEJING_NOTES, DAODEJING_META } from "../src/data/daodejing/index.js";
import { ZHUANGZI_NOTES, XIAOYAOYOU_META } from "../src/data/zhuangzi/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outPath = process.argv[2] ?? join(root, "tests", "out", "daodejing-xiaoyaoyou.apkg");

const notes = [...DAODEJING_NOTES, ...ZHUANGZI_NOTES];
const deckPaths = [...new Set(notes.map((n) => n.deckPath))];
const decks = [
  { path: "道德经" },
  { path: "庄子" },
  { path: "庄子::逍遥游" },
  ...deckPaths.map((p) => ({ path: p })),
].filter((d, i, arr) => arr.findIndex((x) => x.path === d.path) === i);

const SQL = await initSqlJs();
const { bytes, noteCount, cardCount, deckCount } = await buildApkg({
  SQL,
  JSZip,
  model: GUWEN_MODEL,
  notes,
  decks,
  media: {},
  meta: {
    source: `${DAODEJING_META.source}；${XIAOYAOYOU_META.source}`,
    sourceUrl: `${DAODEJING_META.sourceUrl}\n${XIAOYAOYOU_META.sourceUrl}`,
    sourceCommit: `${DAODEJING_META.sourceCommit}+${XIAOYAOYOU_META.sourceCommit}`,
    generatedAt: "2026-10-17",
  },
  options: { now: new Date("2026-10-17T00:00:00").getTime() },
});
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.from(bytes));

console.log(`道德经 ${DAODEJING_NOTES.length} + 逍遥游 ${ZHUANGZI_NOTES.length} = ${noteCount} 笔记 / ${cardCount} 卡 / ${deckCount} 牌组 (${bytes.length} bytes)`);
console.log(`apkg 已生成 ${outPath}`);
