// build_song300.mjs —— 《宋词三百首》→ 每首词 2 条笔记（背诵 + 赏析）apkg
//
// 流程：raw.txt → parseSong300 → 每首词生成：
//   - 背诵条目：上句=首句（提示，去句末标点）→ 下句=全词（答案）；原文留空 → 只出「背诵卡」；
//     deckPath = 宋词三百首::背诵::<NN> <标题>（每首词一个牌组，不混排）
//   - 赏析条目：原文=全词 → 出「理解卡」（正面全词、背面逐首赏析）；
//     deckPath = 宋词三百首::赏析::<NN> <标题>
//       → 落盘 src/data/song300/index.js → 打包 tests/out/song300.apkg
// 用法: node scripts/build_song300.mjs [输出路径]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import initSqlJs from "sql.js";
import JSZip from "jszip";

import { buildApkg } from "../src/anki/index.js";
import { GUWEN_MODEL } from "../src/model/guwen.js";
import { parseSong300 } from "../src/parser/song300.js";
import { APPRECIATIONS } from "../src/data/song300/appreciations.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const rawPath = join(root, "src", "data", "song300", "raw.txt");
const outData = join(root, "src", "data", "song300", "index.js");
const outPath = process.argv[2] ?? join(root, "tests", "out", "song300.apkg");

const raw = readFileSync(rawPath, "utf8");
const poems = parseSong300(raw);

// 清洗 wikisource 繁简转换标记，如 "-{万俟}-詠" → "万俟詠"
const cleanAuthor = (a) => a.replace(/-\{([^{}]*)\}-/g, "$1");
const stripPunct = (s) => s.replace(/[，。；？！、]+$/g, "");

/** 每首词 → [背诵条目, 赏析条目] */
function notesFor(poem) {
  const no = String(poem.no).padStart(3, "0");
  const fullText = poem.text; // 已去空白拼接
  const firstSentence = stripPunct(poem.firstSentence);
  const title = poem.subtitle || poem.cipai;
  const author = cleanAuthor(poem.author);
  const titleField = `宋词三百首 · ${poem.cipai} · ${author} · ${title}`;
  return [
    // 背诵：首句→全词；牌组按「词」为单位，一阕一牌组
    {
      fields: {
        篇目: titleField,
        标题: title,
        上句: firstSentence,
        下句: fullText, // 答案=整首词（原文留空，避免触发理解卡）
        原文: "",
        译文: "",
        注释: "",
        赏析: "",
        链接: "",
      },
      tags: ["宋词三百首", poem.cipai, author, "背诵"],
      deckPath: `宋词三百首::背诵::${no} ${title}`,
      guidSeed: `song300:${no}:recite`,
    },
    // 赏析：正面全词 → 背面逐首赏析（src/data/song300/appreciations.js）
    {
      fields: {
        篇目: titleField,
        标题: title,
        上句: "",
        下句: "",
        原文: fullText,
        译文: "",
        注释: "",
        赏析: APPRECIATIONS[poem.no] ?? `${author} 的 ${poem.cipai}，共 ${fullText.length} 字。`,
        链接: "",
      },
      tags: ["宋词三百首", poem.cipai, author, "赏析"],
      deckPath: `宋词三百首::赏析::${no} ${title}`,
      guidSeed: `song300:${no}:appreciate`,
    },
  ];
}

const notes = poems.flatMap(notesFor);
const reciteCount = notes.filter((n) => n.tags.includes("背诵")).length;
const appreciateCount = notes.length - reciteCount;

const dataFile = `// song300/index.js —— 宋词三百首数据（由 scripts/build_song300.mjs 生成）
// 源：Wikisource《宋詞三百首》（朱孝臧辑本，公有领域 PD-old-80-1923）→ src/data/song300/raw.txt
// 每首词 2 条：背诵（首句→全词，牌组按词分）+ 赏析（全词→逐首题解）；
// 共 ${poems.length} 首 / ${notes.length} 条（背诵 ${reciteCount} + 赏析 ${appreciateCount}）。
// 手工修订请直接改本文件；重跑生成执行 node scripts/build_song300.mjs。

export const SONG300_NOTES = ${JSON.stringify(notes, null, 2)};

export const SONG300_META = {
  source: "《宋词三百首》（朱孝臧编，1924 年刊）",
  sourceUrl: "https://zh.wikisource.org/wiki/宋詞三百首",
  sourceCommit: "wikisource-song300",
  generatedAt: "2026-10-18",
  poemCount: ${poems.length},
  noteCount: ${notes.length},
  reciteCount: ${reciteCount},
  appreciateCount: ${appreciateCount},
  notes: "繁体原文（Wikisource 朱孝臧辑本）；每首词 2 条：背诵条（上句=首句、下句=全词、原文留空→只出背诵卡，牌组=宋词三百首::背诵::序号 标题）与赏析条（原文=全词→理解卡，牌组=宋词三百首::赏析::序号 标题）；赏析为项目原创题解",
};

export const SONG300_POEMS = ${JSON.stringify(poems.map((p) => ({ no: p.no, title: p.subtitle || p.cipai, cipai: p.cipai, author: cleanAuthor(p.author), hasXiaoxu: !!p.xiaoxu, firstSentence: p.firstSentence })), null, 2)};
`;

mkdirSync(dirname(outData), { recursive: true });
writeFileSync(outData, dataFile);

const SQL = await initSqlJs();
const deckPaths = [...new Set(notes.map((n) => n.deckPath))];
const decks = [
  { path: "宋词三百首" },
  { path: "宋词三百首::背诵" },
  { path: "宋词三百首::赏析" },
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
    source: "《宋词三百首》（朱孝臧编，Wikisource）",
    sourceUrl: "https://zh.wikisource.org/wiki/宋詞三百首",
    sourceCommit: "wikisource-song300",
    generatedAt: "2026-10-18",
  },
  options: { now: new Date("2026-10-18T00:00:00").getTime() },
});
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.from(bytes));

const byCipai = {};
for (const p of poems) byCipai[p.cipai] = (byCipai[p.cipai] ?? 0) + 1;
const topCipai = Object.entries(byCipai).sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log(`解析：${poems.length} 首 → ${reciteCount} 背诵 + ${appreciateCount} 赏析 = ${notes.length} 条 / ${cardCount} 卡 / ${deckCount} 牌组 (${bytes.length} bytes)`);
console.log("词牌 top10:", JSON.stringify(topCipai));
console.log(`数据已落盘 ${outData}`);
console.log(`apkg 已生成 ${outPath}`);
