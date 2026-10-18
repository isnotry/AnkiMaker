// check_data.mjs —— 结构化数据自检（与生成路径独立的静态校验）
//
// 校验范围：src/data/ 下道德经（81 整章 + 473 背诵）+ 逍遥游 7 段 + 唐诗三百首（320 首背诵+赏析）+ 心经 + 金刚经（32 分）
//  - 整章卡：9 字段全有，标题/原文/篇目非空，译文/注释/赏析补齐
//  - 背诵卡：上句/下句非空且含汉字、原文必须为空（确保不出理解卡）、无重复标点
//  - guidSeed 全局唯一、deckPath 规范、道德经牌组 01–81 连续、唐诗首序连续且每首卡数匹配

import { DAODEJING_NOTES, DAODEJING_CHAPTER_NOTES, DAODEJING_RECITE_NOTES, DAODEJING_META } from "../src/data/daodejing/index.js";
import { ZHUANGZI_NOTES, XIAOYAOYOU_META } from "../src/data/zhuangzi/index.js";
import { TANG300_NOTES, TANG300_META, TANG300_POEMS } from "../src/data/tang300/index.js";
import { SONG300_NOTES, SONG300_META, SONG300_POEMS } from "../src/data/song300/index.js";
import { XINJING_NOTES, JINGANGJING_NOTES } from "../src/data/fojing/notes.js";
import { XINJING_SECTIONS, JINGANGJING_PARTS } from "../src/data/fojing/index.js";

const GENRES = ["五言古诗", "七言古诗", "杂言古诗", "五言律诗", "七言律诗", "五言绝句", "七言绝句"];
const REQUIRED_NONEMPTY = ["篇目", "标题", "原文"];
const problems = [];
let okCount = 0;

function checkChapterNotes(notes, label, expectedCount) {
  if (notes.length !== expectedCount) {
    problems.push(`${label}: 期望 ${expectedCount} 条整章卡，实际 ${notes.length} 条`);
  }
  for (const [i, n] of notes.entries()) {
    const where = `${label}[${i}] (${n.guidSeed ?? "无guidSeed"})`;
    for (const f of REQUIRED_NONEMPTY) {
      if (!n.fields?.[f] || !String(n.fields[f]).trim()) problems.push(`${where}: 必填字段「${f}」缺失或为空`);
    }
    if (!/[\u4e00-\u9fff]/.test(n.fields?.原文 ?? "")) problems.push(`${where}: 「原文」不含汉字`);
    for (const f of ["译文", "注释", "赏析"]) {
      if (!n.fields?.[f] || !String(n.fields[f]).trim()) problems.push(`${where}: 可选字段「${f}」缺失（应补齐）`);
    }
    _common(n, where);
  }
}

function checkReciteNotes(notes, label, expectedCount) {
  if (notes.length !== expectedCount) {
    problems.push(`${label}: 期望 ${expectedCount} 条背诵卡，实际 ${notes.length} 条`);
  }
  for (const [i, n] of notes.entries()) {
    const where = `${label}[${i}] (${n.guidSeed ?? "无guidSeed"})`;
    for (const f of ["上句", "下句"]) {
      const v = n.fields?.[f];
      if (!v || !String(v).trim()) problems.push(`${where}: 背诵字段「${f}」为空`);
      else if (!/[\u4e00-\u9fff]/.test(String(v))) problems.push(`${where}: 「${f}」不含汉字`);
    }
    if (String(n.fields?.原文 ?? "").trim()) problems.push(`${where}: 背诵卡「原文」应为空（否则会多出理解卡）`);
    if (/[。！？]{2}$/.test(String(n.fields?.下句 ?? ""))) problems.push(`${where}: 下句结尾标点重复`);
    if (!String(n.fields?.标题 ?? "").includes("背句")) problems.push(`${where}: 背诵卡标题未标注「背句」`);
    _common(n, where);
  }
}

function _common(n, where) {
  if (!n.guidSeed) problems.push(`${where}: 缺 guidSeed`);
  else if (!/^[a-z0-9:_-]+$/.test(n.guidSeed)) problems.push(`${where}: guidSeed 含非法字符`);
  if (!n.deckPath || !n.deckPath.includes("::")) problems.push(`${where}: deckPath 不规范`);
  if (!n.tags || !Array.isArray(n.tags) || n.tags.length === 0) problems.push(`${where}: 缺少标签`);
  okCount++;
}

checkChapterNotes(DAODEJING_CHAPTER_NOTES, "道德经·整章", 81);
checkReciteNotes(DAODEJING_RECITE_NOTES, "道德经·背诵", 473);
checkChapterNotes(ZHUANGZI_NOTES, "逍遥游", 7);

// 唐诗三百首：每首诗 2 条（背诵 + 赏析），分开校验
const tangRecite = TANG300_NOTES.filter((n) => n.tags.includes("背诵"));
const tangAppreciate = TANG300_NOTES.filter((n) => n.tags.includes("赏析"));
if (TANG300_NOTES.length !== TANG300_META.noteCount) {
  problems.push(`唐诗: 笔记数 ${TANG300_NOTES.length} 与 META ${TANG300_META.noteCount} 不一致`);
}
if (tangRecite.length !== TANG300_POEMS.length) {
  problems.push(`唐诗: 背诵条 ${tangRecite.length} 与首数 ${TANG300_POEMS.length} 不一致`);
}
if (tangAppreciate.length !== TANG300_POEMS.length) {
  problems.push(`唐诗: 赏析条 ${tangAppreciate.length} 与首数 ${TANG300_POEMS.length} 不一致`);
}
// 唐诗专项：首数/体裁/牌组
if (TANG300_POEMS.length !== TANG300_META.poemCount) {
  problems.push(`唐诗: 解析首数 ${TANG300_POEMS.length} 与 META ${TANG300_META.poemCount} 不一致`);
}
const nos = TANG300_POEMS.map((p) => p.no).sort((a, b) => a - b);
for (let i = 1; i <= TANG300_POEMS.length; i++) {
  if (nos[i - 1] !== i) problems.push(`唐诗序号不连续: 第 ${i} 位应为 ${i}，实际 ${nos[i - 1]}`);
}
const poemByNo = new Map(TANG300_POEMS.map((p) => [p.no, p]));
for (const n of tangRecite) {
  const where = `唐诗·背诵[${n.guidSeed}]`;
  const m = n.guidSeed?.match(/^tang300:(\d{3}):recite$/);
  if (!m) { problems.push(`${where}: guidSeed 不规范`); continue; }
  const no = Number(m[1]);
  const p = poemByNo.get(no);
  if (!p) { problems.push(`${where}: 指向不存在的序号 ${no}`); continue; }
  if (String(n.fields?.原文 ?? "").trim()) problems.push(`${where}: 原文应为空（否则会多出理解卡）`);
  const full = String(n.fields?.下句 ?? "");
  const firstLine = (full.split("\n")[0] ?? "").replace(/[，。；？！、]+$/g, "");
  if (!full.trim()) {
    problems.push(`${where}: 下句（全诗）为空`);
  } else if (full.split("\n").length !== p.lineCount) {
    problems.push(`${where}: 全诗行数 ${full.split("\n").length} 与解析 ${p.lineCount} 不一致`);
  }
  if (!n.fields.上句 || String(n.fields.上句).trim() !== firstLine) {
    problems.push(`${where}: 上句应为首句「${firstLine}」`);
  }
  if (n.deckPath !== `唐诗三百首::背诵::${String(no).padStart(3, "0")} ${p.title}`) {
    problems.push(`${where}: deckPath「${n.deckPath}」应按诗分牌组`);
  }
  if (!p.genre || !GENRES.includes(p.genre)) problems.push(`唐诗 #${no}: 体裁「${p.genre}」非法`);
  if (!n.fields.篇目.includes(p.title) || !n.fields.篇目.includes(p.genre)) {
    problems.push(`${where}: 篇目「${n.fields.篇目}」与诗信息不符`);
  }
}
for (const n of tangAppreciate) {
  const where = `唐诗·赏析[${n.guidSeed}]`;
  const m = n.guidSeed?.match(/^tang300:(\d{3}):appreciate$/);
  if (!m) { problems.push(`${where}: guidSeed 不规范`); continue; }
  const no = Number(m[1]);
  const p = poemByNo.get(no);
  if (!p) { problems.push(`${where}: 指向不存在的序号 ${no}`); continue; }
  const recite = tangRecite.find((r) => r.guidSeed === `tang300:${String(no).padStart(3, "0")}:recite`);
  if (String(n.fields?.原文 ?? "") !== String(recite?.fields?.下句 ?? "")) {
    problems.push(`${where}: 原文应为全诗（与背诵条下句一致）`);
  }
  if (!String(n.fields?.赏析 ?? "").trim()) problems.push(`${where}: 赏析正文缺失`);
  if (n.deckPath !== `唐诗三百首::赏析::${String(no).padStart(3, "0")} ${p.title}`) {
    problems.push(`${where}: deckPath「${n.deckPath}」应按诗分牌组`);
  }
  if (String(n.fields?.上句 ?? "").trim() || String(n.fields?.下句 ?? "").trim()) {
    problems.push(`${where}: 赏析条上句/下句应为空（避免出背诵卡）`);
  }
}

// 宋词三百首：每首词 2 条（背诵 + 赏析），与唐诗同构（牌组按「词」分）
const songRecite = SONG300_NOTES.filter((n) => n.tags.includes("背诵"));
const songAppreciate = SONG300_NOTES.filter((n) => n.tags.includes("赏析"));
if (SONG300_NOTES.length !== SONG300_META.noteCount) {
  problems.push(`宋词: 笔记数 ${SONG300_NOTES.length} 与 META ${SONG300_META.noteCount} 不一致`);
}
if (SONG300_POEMS.length !== SONG300_META.poemCount) {
  problems.push(`宋词: 解析首数 ${SONG300_POEMS.length} 与 META ${SONG300_META.poemCount} 不一致`);
}
if (songRecite.length !== SONG300_POEMS.length) {
  problems.push(`宋词: 背诵条 ${songRecite.length} 与首数 ${SONG300_POEMS.length} 不一致`);
}
if (songAppreciate.length !== SONG300_POEMS.length) {
  problems.push(`宋词: 赏析条 ${songAppreciate.length} 与首数 ${SONG300_POEMS.length} 不一致`);
}
const songNos = SONG300_POEMS.map((p) => p.no).sort((a, b) => a - b);
for (let i = 1; i <= SONG300_POEMS.length; i++) {
  if (songNos[i - 1] !== i) problems.push(`宋词序号不连续: 第 ${i} 位应为 ${i}，实际 ${songNos[i - 1]}`);
}
const songByNo = new Map(SONG300_POEMS.map((p) => [p.no, p]));
const stripPunct = (s) => s.replace(/[，。；？！、]+$/g, "");
for (const n of songRecite) {
  const where = `宋词·背诵[${n.guidSeed}]`;
  const m = n.guidSeed?.match(/^song300:(\d{3}):recite$/);
  if (!m) { problems.push(`${where}: guidSeed 不规范`); continue; }
  const no = Number(m[1]);
  const p = songByNo.get(no);
  if (!p) { problems.push(`${where}: 指向不存在的序号 ${no}`); continue; }
  if (String(n.fields?.原文 ?? "").trim()) problems.push(`${where}: 原文应为空（否则会多出理解卡）`);
  const full = String(n.fields?.下句 ?? "");
  if (!full.trim() || full !== p.firstSentence && !full.includes(p.firstSentence)) {
    problems.push(`${where}: 下句（全词）应包含首句「${p.firstSentence}」`);
  }
  if (String(n.fields?.上句 ?? "").trim() !== stripPunct(p.firstSentence)) {
    problems.push(`${where}: 上句应为首句去标点「${stripPunct(p.firstSentence)}」`);
  }
  if (n.deckPath !== `宋词三百首::背诵::${String(no).padStart(3, "0")} ${p.title}`) {
    problems.push(`${where}: deckPath「${n.deckPath}」应按词分牌组`);
  }
  if (!p.cipai || !n.fields.篇目.includes(p.cipai) || !n.fields.篇目.includes(p.author)) {
    problems.push(`${where}: 篇目「${n.fields.篇目}」与词信息不符`);
  }
}
for (const n of songAppreciate) {
  const where = `宋词·赏析[${n.guidSeed}]`;
  const m = n.guidSeed?.match(/^song300:(\d{3}):appreciate$/);
  if (!m) { problems.push(`${where}: guidSeed 不规范`); continue; }
  const no = Number(m[1]);
  const p = songByNo.get(no);
  if (!p) { problems.push(`${where}: 指向不存在的序号 ${no}`); continue; }
  const recite = songRecite.find((r) => r.guidSeed === `song300:${String(no).padStart(3, "0")}:recite`);
  if (String(n.fields?.原文 ?? "") !== String(recite?.fields?.下句 ?? "")) {
    problems.push(`${where}: 原文应为全词（与背诵条下句一致）`);
  }
  if (!String(n.fields?.赏析 ?? "").trim()) problems.push(`${where}: 赏析正文缺失`);
  if (n.deckPath !== `宋词三百首::赏析::${String(no).padStart(3, "0")} ${p.title}`) {
    problems.push(`${where}: deckPath「${n.deckPath}」应按词分牌组`);
  }
  if (String(n.fields?.上句 ?? "").trim() || String(n.fields?.下句 ?? "").trim()) {
    problems.push(`${where}: 赏析条上句/下句应为空（避免出背诵卡）`);
  }
}

// 心经校验：1 赏析（全文→题解）+ 8 背诵（上句=段首提示→下句=全段）
const xinjingRecite = XINJING_NOTES.filter((n) => n.tags.includes("背诵"));
const xinjingAppr = XINJING_NOTES.filter((n) => n.tags.includes("赏析"));
if (XINJING_NOTES.length !== XINJING_SECTIONS.length + 1) problems.push(`心经: 期望 ${XINJING_SECTIONS.length + 1} 条，实际 ${XINJING_NOTES.length}`);
if (xinjingRecite.length !== XINJING_SECTIONS.length) problems.push(`心经: 背诵条 ${xinjingRecite.length} 与段数 ${XINJING_SECTIONS.length} 不一致`);
if (xinjingAppr.length !== 1) problems.push(`心经: 赏析条应为 1，实际 ${xinjingAppr.length}`);
const xjAppr = xinjingAppr[0];
if (!xjAppr) problems.push("心经: 缺赏析条");
else {
  if (String(xjAppr.fields?.原文 ?? "") !== XINJING_SECTIONS.join("\n")) problems.push("心经·赏析: 原文应为全文");
  if (!String(xjAppr.fields?.赏析 ?? "").trim()) problems.push("心经·赏析: 题解缺失");
  if (xjAppr.deckPath !== "心經::赏析") problems.push(`心经·赏析: deckPath「${xjAppr.deckPath}」应为 心經::赏析`);
  if (String(xjAppr.fields?.上句 ?? "").trim() || String(xjAppr.fields?.下句 ?? "").trim()) problems.push("心经·赏析: 上句/下句应为空");
}
xinjingRecite.forEach((n, i) => {
  const where = `心经·背诵[${n.guidSeed}]`;
  if (n.guidSeed !== `xinjing:recite:${String(i + 1).padStart(2, "0")}`) problems.push(`${where}: guidSeed 序号错乱`);
  if (!String(n.fields?.下句 ?? "").trim()) problems.push(`${where}: 下句（全段）为空`);
  if (!String(n.fields?.上句 ?? "").trim()) problems.push(`${where}: 上句（段首提示）为空`);
  if (String(n.fields?.原文 ?? "").trim()) problems.push(`${where}: 原文应为空`);
  if (n.deckPath !== "心經::背诵") problems.push(`${where}: deckPath「${n.deckPath}」应为 心經::背诵`);
  if (!String(n.fields?.下句 ?? "").includes(String(n.fields?.上句 ?? "").replace(/[，。！？；、]+$/, "").split("，")[0])) {
    problems.push(`${where}: 下句应包含段首提示「${n.fields?.上句}」`);
  }
});

// 金刚经校验：32 分赏析（全品→分则提要+品旨）+ 每分背句（一品一牌组）
if (JINGANGJING_PARTS.length !== 32) problems.push(`金刚经: 品数应为 32，实际 ${JINGANGJING_PARTS.length}`);
const jgAppr = JINGANGJING_NOTES.filter((n) => n.tags.includes("赏析"));
const jgRecite = JINGANGJING_NOTES.filter((n) => n.tags.includes("背诵"));
if (jgAppr.length !== 32) problems.push(`金刚经: 赏析条应为 32，实际 ${jgAppr.length}`);
const partByName = new Map(JINGANGJING_PARTS.map((p) => [p.name, p]));
for (const n of jgAppr) {
  const where = `金刚经·赏析[${n.guidSeed}]`;
  const m = n.guidSeed?.match(/^jingangjing:(\d{2}):appreciate$/);
  if (!m) { problems.push(`${where}: guidSeed 不规范`); continue; }
  const no = Number(m[1]);
  const part = JINGANGJING_PARTS.find((p) => p.no === no);
  if (!part) { problems.push(`${where}: 指向不存在的分 ${no}`); continue; }
  if (String(n.fields?.原文 ?? "") !== part.text) problems.push(`${where}: 原文应为全品文本`);
  if (!String(n.fields?.赏析 ?? "").trim()) problems.push(`${where}: 题解缺失`);
  if (!n.fields?.赏析?.includes(part.digest)) problems.push(`${where}: 题解应含分则提要「${part.digest}」`);
  if (n.deckPath !== `金剛經::赏析::${String(no).padStart(2, "0")} ${part.name}`) problems.push(`${where}: deckPath「${n.deckPath}」应按品分牌组`);
  if (String(n.fields?.上句 ?? "").trim() || String(n.fields?.下句 ?? "").trim()) problems.push(`${where}: 上句/下句应为空`);
}
const reciteByDeck = new Map();
for (const n of jgRecite) {
  const where = `金刚经·背诵[${n.guidSeed}]`;
  const m = n.guidSeed?.match(/^jingangjing:(\d{2}):recite:(\d{2})$/);
  if (!m) { problems.push(`${where}: guidSeed 不规范`); continue; }
  const no = Number(m[1]);
  const part = JINGANGJING_PARTS.find((p) => p.no === no);
  if (!part) { problems.push(`${where}: 指向不存在的分 ${no}`); continue; }
  if (!String(n.fields?.上句 ?? "").trim() || !String(n.fields?.下句 ?? "").trim()) problems.push(`${where}: 上句/下句应非空`);
  if (String(n.fields?.原文 ?? "").trim()) problems.push(`${where}: 原文应为空`);
  const expectDeck = `金剛經::背诵::${String(no).padStart(2, "0")} ${part.name}`;
  if (n.deckPath !== expectDeck) problems.push(`${where}: deckPath「${n.deckPath}」应按品分牌组`);
  reciteByDeck.set(n.deckPath, (reciteByDeck.get(n.deckPath) ?? 0) + 1);
}
for (const part of JINGANGJING_PARTS) {
  const deck = `金剛經::背诵::${String(part.no).padStart(2, "0")} ${part.name}`;
  if (!reciteByDeck.has(deck)) problems.push(`金刚经: 第${part.no}分缺少背诵牌组 ${deck}`);
}

// guidSeed 全局唯一
// guidSeed 全局唯一
const seen = new Map();
for (const n of [...DAODEJING_NOTES, ...ZHUANGZI_NOTES, ...TANG300_NOTES, ...SONG300_NOTES, ...XINJING_NOTES, ...JINGANGJING_NOTES]) {
  if (seen.has(n.guidSeed)) problems.push(`guidSeed 重复: ${n.guidSeed} (${seen.get(n.guidSeed)} / ${n.fields.标题})`);
  seen.set(n.guidSeed, n.fields.标题);
}

// 道德经 deckPath 序号连续 01..81
const paths = DAODEJING_CHAPTER_NOTES.map((n) => n.deckPath);
for (let i = 1; i <= 81; i++) {
  const p = `道德经::第${String(i).padStart(2, "0")}章`;
  if (!paths.includes(p)) problems.push(`道德经缺少牌组: ${p}`);
}

console.log(`数据自检：道德经 整章 ${DAODEJING_CHAPTER_NOTES.length} + 背诵 ${DAODEJING_RECITE_NOTES.length} = ${DAODEJING_NOTES.length} 条 / 逍遥游 ${ZHUANGZI_NOTES.length} 条 / 唐诗三百首 ${TANG300_NOTES.length} 条（${TANG300_POEMS.length} 首）/ 宋词三百首 ${SONG300_NOTES.length} 条（${SONG300_POEMS.length} 首）/ 心经 ${XINJING_NOTES.length} 条 / 金刚经 ${JINGANGJING_NOTES.length} 条`);
console.log(`道德经来源: ${DAODEJING_META.source} | 逍遥游来源: ${XIAOYAOYOU_META.source} | 唐诗来源: ${TANG300_META.sourceUrl} | 宋词来源: ${SONG300_META.sourceUrl}`);
if (problems.length) {
  console.error(`\n发现 ${problems.length} 个问题:`);
  for (const p of problems) console.error(" - " + p);
  process.exit(1);
}
console.log("✓ 全部通过：整章卡/背诵卡字段正确、guidSeed 唯一、牌组连续、无重复标点、唐诗首序连续且卡数匹配");
