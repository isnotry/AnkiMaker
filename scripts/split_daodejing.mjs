// split_daodejing.mjs —— 把道德经整章理解卡原文，拆成「上句/下句」背诵条目
//
// 规则（可复现，质量优先）：
//  1. 按 。！？ 切成「句」；句内按 ，； 切成最短语义单元。
//  2. 单单元句（如「天长地久。」）：与下一句合并成一卡（上=单句，下=下句全文）；
//     若为章末单句，则并入上一卡下句末尾。
//  3. 多单元句：若各单元长度均匀（排比/对偶，max-min≤3 且 ≥3 单元）→ 相邻两两配对；
//     否则按「话题—述题」：上=首单元，下=其余单元。
//  4. 背诵条目不含「原文」字段 → 自动只出背诵卡（req 上句非空），不干扰整章理解卡。
//
// 输出：src/data/daodejing/recite.js（export DAODEJING_RECITE_NOTES）
// 重跑：node scripts/split_daodejing.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { DAOJING } from "../src/data/daodejing/ch1-37.js";
import { DEJING } from "../src/data/daodejing/ch38-81.js";

const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(here, "..", "src", "data", "daodejing", "recite.js");

// 按 。！？ 切句；每句内按 ，； 切单元。返回 [{ units:[{unit,sep}], tail }]
function splitSentences(text) {
  const parts = String(text).split(/([。！？])/).filter((s) => s && s.trim());
  const sentences = [];
  for (let i = 0; i < parts.length; i += 2) {
    const body = (parts[i] ?? "").trim();
    if (!body) continue;
    const tail = parts[i + 1] ?? "";
    const inner = body.split(/([，；])/).filter((s) => s && s.trim());
    const units = [];
    for (let j = 0; j < inner.length; j += 2) {
      const unit = (inner[j] ?? "").trim();
      if (!unit) continue;
      units.push({ unit, sep: inner[j + 1] ?? "" });
    }
    sentences.push({ units, tail });
  }
  return sentences;
}

function fullText(s) {
  return s.units.map((u) => u.unit + u.sep).join("") + s.tail;
}

function buildRecite(chapterNote) {
  const chapter = chapterNote.deckPath.split("::")[1]; // 第01章
  const no = chapterNote.guidSeed.split(":")[1]; // 01
  const isDaoJing = chapterNote.tags.includes("道经");
  const baseTags = isDaoJing ? ["道德经", "道经"] : ["道德经", "德经"];

  const sentences = splitSentences(chapterNote.fields.原文);
  const cards = []; // { up:{unit}, down:{unit, sep} }
  const pending = []; // 待配对的单单元句

  for (const s of sentences) {
    if (s.units.length === 0) continue;

    // 单单元句：先攒着，与后续句子合并
    if (s.units.length === 1) {
      pending.push({ unit: s.units[0].unit, tail: s.tail });
      continue;
    }

    // 先把攒下的单句两两配对
    while (pending.length >= 2) {
      const a = pending.shift();
      const b = pending.shift();
      cards.push({ up: { unit: a.unit }, down: { unit: b.unit, sep: b.tail } });
    }

    // 剩一个单句 → 与当前多单元句合成一卡：上=单句，下=整句
    if (pending.length === 1) {
      const p = pending.shift();
      cards.push({ up: { unit: p.unit }, down: { unit: fullText(s), sep: "" } });
      continue;
    }

    const us = s.units;
    const lens = us.map((u) => u.unit.length);
    const uniform = us.length >= 3 && Math.max(...lens) - Math.min(...lens) <= 3;

    if (uniform) {
      // 排比/对偶：相邻两两配对
      for (let k = 0; k + 1 < us.length; k += 2) {
        cards.push({ up: us[k], down: { unit: us[k + 1].unit, sep: us[k + 1].sep || s.tail } });
      }
      if (us.length % 2 === 1) {
        // 末单元并入上一卡下句末尾
        const last = us[us.length - 1];
        const c = cards[cards.length - 1];
        c.down.unit = c.down.unit + (c.down.sep || "，") + last.unit;
        c.down.sep = last.sep || s.tail;
      }
    } else {
      // 话题—述题：上=首单元，下=其余单元
      const rest = us.slice(1).map((u) => u.unit + u.sep).join("").trim();
      cards.push({ up: us[0], down: { unit: rest, sep: s.tail } });
    }
  }

  // 章末残留单句：并入上一卡下句末尾
  while (pending.length) {
    const p = pending.shift();
    if (cards.length) {
      const c = cards[cards.length - 1];
      c.down.unit = c.down.unit + (c.down.sep || "，") + p.unit;
      c.down.sep = p.tail || "。";
    } else {
      cards.push({ up: { unit: p.unit }, down: { unit: "", sep: p.tail || "。" } });
    }
  }

  return cards
    .map((c, idx) => {
      const { up, down } = c;
      const m = String(idx + 1).padStart(2, "0");
      // 下句末尾补标点；已以 。！？ 结尾则不重复追加
      const downText = /[。！？]$/.test(down.unit) ? down.unit : down.unit + (down.sep || "。");
      return {
        fields: {
          篇目: `道德经 · ${chapter} · 背句 ${m}`,
          标题: `${chapter} · 背句 ${m}`,
          上句: up.unit,
          下句: downText,
          // 原文/译文/注释/赏析/链接 留空：背诵条目只出背诵卡（req 上句非空），原文不触发理解卡
        },
        tags: [...baseTags, "背诵"],
        deckPath: chapterNote.deckPath,
        guidSeed: `daodejing:${no}:recite:${m}`,
      };
    })
    .filter((n) => n.fields.下句.trim());
}

const all = [...DAOJING, ...DEJING];
const recite = all.flatMap(buildRecite);

const header = `// recite.js —— 道德经「上句/下句」背诵卡数据（由 scripts/split_daodejing.mjs 生成）
//
// 规则：按 。！？ 分句 → 排比句相邻配对 / 叙述句「话题—述题」配对 / 单句并入下句；
// 背诵条目不含「原文」→ 模板 req 只出背诵卡。手工修订请直接改本文件。

export const DAODEJING_RECITE_NOTES = ${JSON.stringify(recite, null, 2)};
`;

writeFileSync(outFile, header);
console.log(`已生成 ${outFile}`);
console.log(`背诵卡条目：${recite.length} 条（81 章整章理解卡保持不变）`);
const perChapter = new Map();
for (const r of recite) {
  const k = r.deckPath;
  perChapter.set(k, (perChapter.get(k) ?? 0) + 1);
}
const max = Math.max(...perChapter.values());
const min = Math.min(...perChapter.values());
console.log(`每章背句数：最少 ${min}，最多 ${max}`);
