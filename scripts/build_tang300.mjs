// build_tang300.mjs —— 《唐诗三百首》→ 每首诗 2 条笔记（背诵 + 赏析）apkg
//
// 流程：raw.txt → parseTang300 → 每首诗生成：
//   - 背诵条目：上句=首句（提示）→ 下句=全诗（答案）；原文留空 → 只出「背诵卡」；
//     deckPath = 唐诗三百首::背诵::<NN> <诗名>（每首诗一个牌组，不混排）
//   - 赏析条目：原文=全诗 → 出「理解卡」（正面全诗、背面题解/赏析）；
//     deckPath = 唐诗三百首::<体裁>（按体裁分组）
//       → 落盘 src/data/tang300/index.js → 打包 tests/out/tang300.apkg
// 用法: node scripts/build_tang300.mjs [输出路径]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import initSqlJs from "sql.js";
import JSZip from "jszip";

import { buildApkg } from "../src/anki/index.js";
import { GUWEN_MODEL } from "../src/model/guwen.js";
import { parseTang300 } from "../src/parser/tang300.js";
import { APPRECIATIONS } from "../src/data/tang300/appreciations.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const rawPath = join(root, "src", "data", "tang300", "raw.txt");
const outData = join(root, "src", "data", "tang300", "index.js");
const outPath = process.argv[2] ?? join(root, "tests", "out", "tang300.apkg");

const raw = readFileSync(rawPath, "utf8");
const poems = parseTang300(raw);

const stripPunct = (s) => s.replace(/[，。；？！、]+$/g, "");

/** 每首诗 → [背诵条目, 赏析条目] */
function notesFor(poem) {
  const no = String(poem.no).padStart(3, "0");
  const fullText = poem.lines.join("\n");
  const firstLine = stripPunct(poem.lines[0]);
  const titleField = `唐诗三百首 · ${poem.genre} · ${poem.author} · ${poem.title}`;
  return [
    // 背诵：首句→全诗；牌组按「诗」为单位，一首一牌组
    {
      fields: {
        篇目: titleField,
        标题: `${poem.title}`,
        上句: firstLine,
        下句: fullText, // 答案=整首诗（原文留空，避免触发理解卡）
        原文: "",
        译文: "",
        注释: "",
        赏析: "",
        链接: "",
      },
      tags: ["唐诗三百首", poem.genre, poem.author, "背诵"],
      deckPath: `唐诗三百首::背诵::${no} ${poem.title}`,
      guidSeed: `tang300:${no}:recite`,
    },
    // 赏析：正面全诗 → 背面解析（来自 src/data/tang300/appreciations.js，见 build 下方解析合并）
    {
      fields: {
        篇目: titleField,
        标题: `${poem.title}`,
        上句: "",
        下句: "",
        原文: fullText,
        译文: "",
        注释: "",
        赏析: APPRECIATIONS[poem.no] ?? `${poem.author} 的 ${poem.genre}，共 ${poem.lines.length} 句。`,
        链接: "",
      },
      tags: ["唐诗三百首", poem.genre, poem.author, "赏析"],
      deckPath: `唐诗三百首::赏析::${no} ${poem.title}`,
      guidSeed: `tang300:${no}:appreciate`,
    },
  ];
}

const notes = poems.flatMap(notesFor);
const reciteCount = notes.filter((n) => n.tags.includes("背诵")).length;
const appreciateCount = notes.length - reciteCount;

const dataFile = `// tang300/index.js —— 唐诗三百首数据（由 scripts/build_tang300.mjs 生成）
// 源：Project Gutenberg #52323《唐诗三百首》（公有领域）→ src/data/tang300/raw.txt
// 每首诗 2 条：背诵（首句→全诗，牌组按诗分）+ 赏析（全诗→题解，按体裁分组）；
// 共 ${poems.length} 首 / ${notes.length} 条（背诵 ${reciteCount} + 赏析 ${appreciateCount}）。
// 手工修订请直接改本文件；重跑生成执行 node scripts/build_tang300.mjs。

export const TANG300_NOTES = ${JSON.stringify(notes, null, 2)};

export const TANG300_META = {
  source: "《唐诗三百首》（蘅塘退士编）",
  sourceUrl: "https://www.gutenberg.org/ebooks/52323",
  sourceCommit: "gutenberg-52323",
  generatedAt: "2026-10-17",
  poemCount: ${poems.length},
  noteCount: ${notes.length},
  reciteCount: ${reciteCount},
  appreciateCount: ${appreciateCount},
  notes: "繁体原文（Gutenberg 版）；每首诗 2 条：背诵条（上句=首句、下句=全诗、原文留空→只出背诵卡，牌组=唐诗三百首::背诵::序号 诗名）与赏析条（原文=全诗→理解卡，牌组按体裁分组）；赏析=作者+体裁+句数题解，可后续在 Anki 内补充赏析正文",
};

export const TANG300_POEMS = ${JSON.stringify(poems.map((p) => ({ no: p.no, title: p.title, author: p.author, genre: p.genre, lineCount: p.lines.length })), null, 2)};
`;

mkdirSync(dirname(outData), { recursive: true });
writeFileSync(outData, dataFile);

const SQL = await initSqlJs();
const deckPaths = [...new Set(notes.map((n) => n.deckPath))];
const decks = [
  { path: "唐诗三百首" },
  { path: "唐诗三百首::背诵" },
  ...deckPaths.map((p) => ({ path: p })),
].filter((d, i, a) => a.findIndex((x) => x.path === d.path) === i);
const { bytes, noteCount, cardCount, deckCount } = await buildApkg({
  SQL,
  JSZip,
  model: GUWEN_MODEL,
  notes,
  decks,
  media: {},
  meta: {
    source: "《唐诗三百首》（蘅塘退士编，Project Gutenberg #52323）",
    sourceUrl: "https://www.gutenberg.org/ebooks/52323",
    sourceCommit: "gutenberg-52323",
    generatedAt: "2026-10-17",
  },
  options: { now: new Date("2026-10-17T00:00:00").getTime() },
});
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.from(bytes));

const byGenre = {};
for (const p of poems) byGenre[p.genre] = (byGenre[p.genre] ?? 0) + 1;
console.log(`解析：${poems.length} 首 → ${reciteCount} 背诵 + ${appreciateCount} 赏析 = ${notes.length} 条 / ${cardCount} 卡 / ${deckCount} 牌组 (${bytes.length} bytes)`);
console.log("体裁分布:", JSON.stringify(byGenre));
console.log(`数据已落盘 ${outData}`);
console.log(`apkg 已生成 ${outPath}`);
