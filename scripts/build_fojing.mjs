// build_fojing.mjs —— 《心经》《金刚经》→ apkg
//
// 笔记结构见 src/data/fojing/notes.js（build 与网站 bundle 共用）：
//   心经：赏析 1 条（全文→题解，牌组 心經::赏析）+ 背诵 8 条（段首→全段，牌组 心經::背诵）
//   金刚经：赏析 32 条（全品→分则提要+品旨，牌组 金剛經::赏析::NN 分名）
//            + 背诵按品拆句对（牌组 金剛經::背诵::NN 分名，一品一牌组）
// 用法: node scripts/build_fojing.mjs [输出路径]

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import initSqlJs from "sql.js";
import JSZip from "jszip";

import { buildApkg } from "../src/anki/index.js";
import { GUWEN_MODEL } from "../src/model/guwen.js";
import { FOJING_NOTES, XINJING_NOTES, JINGANGJING_NOTES } from "../src/data/fojing/notes.js";
import { XINJING_SECTIONS, XINJING_META, JINGANGJING_META } from "../src/data/fojing/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outPath = process.argv[2] ?? join(root, "tests", "out", "fojing.apkg");

const notes = FOJING_NOTES;
const deckPaths = [
  "心經",
  "心經::赏析",
  "心經::背诵",
  "金剛經",
  ...new Set(JINGANGJING_NOTES.map((n) => n.deckPath)),
].filter((d, i, a) => a.findIndex((x) => x === d) === i);
const decks = deckPaths.map((p) => ({ path: p }));

const SQL = await initSqlJs();
const { bytes, noteCount, cardCount, deckCount } = await buildApkg({
  SQL,
  JSZip,
  model: GUWEN_MODEL,
  notes,
  decks,
  media: {},
  meta: {
    source: "《心經》（玄奘譯）、《金剛經》（鳩摩羅什譯）",
    sourceUrl: "https://zh.wikisource.org/wiki/金剛般若波羅蜜經_(鳩摩羅什)",
    generatedAt: "2026-10-18",
  },
  options: { now: new Date("2026-10-18T00:00:00").getTime() },
});
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.from(bytes));

const reciteCount = notes.filter((n) => n.tags.includes("背诵")).length;
const apprCount = notes.length - reciteCount;
const perPart = new Map();
for (const n of JINGANGJING_NOTES) {
  if (!n.tags.includes("背诵")) continue;
  perPart.set(n.deckPath, (perPart.get(n.deckPath) ?? 0) + 1);
}
console.log(`佛经：心经 ${XINJING_SECTIONS.length + 1} 条 + 金刚经 32 品 = 共 ${notes.length} 条（赏析 ${apprCount} + 背诵 ${reciteCount}）/ ${cardCount} 卡 / ${deckCount} 牌组 (${bytes.length} bytes)`);
console.log(`金刚经每品背句数：最少 ${Math.min(...perPart.values())}，最多 ${Math.max(...perPart.values())}`);
console.log(`来源：${XINJING_META.source}；${JINGANGJING_META.source}`);
console.log(`apkg 已生成 ${outPath}`);
