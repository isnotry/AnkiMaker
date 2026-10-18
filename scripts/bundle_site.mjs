// bundle_site.mjs —— 站点静态资源打包
//
// 产出（site/ 目录，纯前端静态站，浏览器内生成 apkg）：
//   vendor/ankicore.js    生成核心 IIFE（buildApkg + GUWEN_MODEL），esbuild 打包
//   vendor/sql-wasm.js/.wasm、jszip.min.js  运行时依赖（node_modules 复制）
//   data.js               全部古籍笔记数据（window.ANKI_MAKER_DATA）
// 用法：npm run bundle:site（前置：npm run check:data）

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { DAODEJING_NOTES, DAODEJING_META } from "../src/data/daodejing/index.js";
import { ZHUANGZI_NOTES, XIAOYAOYOU_META } from "../src/data/zhuangzi/index.js";
import { TANG300_NOTES, TANG300_META, TANG300_POEMS } from "../src/data/tang300/index.js";
import { SONG300_NOTES, SONG300_META, SONG300_POEMS } from "../src/data/song300/index.js";
import { XINJING_NOTES, JINGANGJING_NOTES } from "../src/data/fojing/notes.js";
import { XINJING_META, JINGANGJING_META } from "../src/data/fojing/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const site = join(root, "site");
mkdirSync(join(site, "vendor"), { recursive: true });

// 1) 生成核心 → IIFE
await build({
  entryPoints: [join(here, "site-core.js")],
  bundle: true,
  format: "iife",
  globalName: "AnkiCore",
  outfile: join(site, "vendor", "ankicore.js"),
  logLevel: "warning",
  legalComments: "none",
});

// 2) 运行时依赖（已在构建脚本外复制；此处保证幂等）
for (const f of ["sql-wasm.js", "sql-wasm.wasm"]) copyFileSync(join(root, "node_modules/sql.js/dist", f), join(site, "vendor", f));
copyFileSync(join(root, "node_modules/jszip/dist/jszip.min.js"), join(site, "vendor", "jszip.min.js"));

// 3) 数据 bundle
const books = [
  {
    id: "daodejing",
    name: "道德经",
    subtitle: "王弼本通行文字（维基文库汇校本核对）",
    sourceUrl: DAODEJING_META.sourceUrl,
    stats: {
      整章: DAODEJING_META.chapterCount,
      背诵: DAODEJING_META.reciteCount,
      合计: DAODEJING_META.noteCount,
    },
    cardTypes: ["背诵", "理解"],
  },
  {
    id: "xiaoyaoyou",
    name: "逍遥游",
    subtitle: "《庄子·内篇》（维基文库）",
    sourceUrl: XIAOYAOYOU_META.sourceUrl,
    stats: { 理解: XIAOYAOYOU_META.noteCount },
    cardTypes: ["理解"],
  },
  {
    id: "tang300",
    name: "唐诗三百首",
    subtitle: `蘅塘退士编 · ${TANG300_POEMS.length} 首 · 每首背诵卡+赏析卡各一 · 繁体（Project Gutenberg #52323）`,
    sourceUrl: TANG300_META.sourceUrl,
    stats: { 背诵: TANG300_META.reciteCount, 赏析: TANG300_META.appreciateCount, 体裁: 7 },
    cardTypes: ["背诵", "理解"],
  },
  {
    id: "song300",
    name: "宋词三百首",
    subtitle: `朱孝臧辑本 · ${SONG300_POEMS.length} 首 · 每首背诵卡+赏析卡各一 · 繁体（Wikisource）`,
    sourceUrl: SONG300_META.sourceUrl,
    stats: { 背诵: SONG300_META.reciteCount, 赏析: SONG300_META.appreciateCount, 词牌: 153 },
    cardTypes: ["背诵", "理解"],
  },
  {
    id: "xinjing",
    name: "心经",
    subtitle: "《般若波罗蜜多心经》玄奘译 · 260 字 · 赏析 1 卡 + 背诵 8 卡",
    sourceUrl: XINJING_META.sourceUrl,
    stats: { 赏析: 1, 背诵: XINJING_NOTES.length - 1 },
    cardTypes: ["背诵", "理解"],
  },
  {
    id: "jingangjing",
    name: "金刚经",
    subtitle: `鸠摩罗什译 · 32 分（昭明太子分则）· 每分赏析卡 1 张 + 背句若干`,
    sourceUrl: JINGANGJING_META.sourceUrl,
    stats: { 赏析: 32, 背诵: JINGANGJING_NOTES.length - 32 },
    cardTypes: ["背诵", "理解"],
  },
];

const payload = {
  generatedAt: "2026-10-18",
  version: "0.3.0",
  books,
  notes: {
    daodejing: DAODEJING_NOTES.map((n) => ({ f: n.fields, t: n.tags, d: n.deckPath, g: n.guidSeed })),
    xiaoyaoyou: ZHUANGZI_NOTES.map((n) => ({ f: n.fields, t: n.tags, d: n.deckPath, g: n.guidSeed })),
    tang300: TANG300_NOTES.map((n) => ({ f: n.fields, t: n.tags, d: n.deckPath, g: n.guidSeed })),
    song300: SONG300_NOTES.map((n) => ({ f: n.fields, t: n.tags, d: n.deckPath, g: n.guidSeed })),
    xinjing: XINJING_NOTES.map((n) => ({ f: n.fields, t: n.tags, d: n.deckPath, g: n.guidSeed })),
    jingangjing: JINGANGJING_NOTES.map((n) => ({ f: n.fields, t: n.tags, d: n.deckPath, g: n.guidSeed })),
  },
};

const dataFile = `// data.js —— 古籍笔记数据 bundle（由 scripts/bundle_site.mjs 生成）
window.ANKI_MAKER_DATA = ${JSON.stringify(payload)};
`;
writeFileSync(join(site, "data.js"), dataFile);

const totalNotes = Object.values(payload.notes).reduce((a, b) => a + b.length, 0);
const kb = (p) => (readFileSync(join(site, p)).length / 1024).toFixed(0);
console.log(`站点资源打包完成：data.js ${kb("data.js")}KB（${totalNotes} 条笔记）/ ankicore.js ${kb("vendor/ankicore.js")}KB / sql-wasm ${kb("vendor/sql-wasm.wasm")}KB`);
