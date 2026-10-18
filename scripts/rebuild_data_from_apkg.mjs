// rebuild_data_from_apkg.mjs —— 从既有 .apkg 反向重建 src/data/*.js 数据文件
//
// 场景：生成产物已交付（apkg），但源数据文件丢失/换机后需要还原。
// 用法：
//   python3 scripts/extract_apkg_notes.py <apkg> --out /tmp/notes.json
//   node scripts/rebuild_data_from_apkg.mjs /tmp/notes.json
// 说明：重建采用本文件内固定的 guidSeed 规则（稳定、可重跑）；若旧库已导入过
//       早期版本 apkg，guid 可能与早期不同（首次导入无历史则无影响）。

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const notes = JSON.parse(readFileSync(process.argv[2], "utf8"));

const j = (x) => JSON.stringify(x, null, 2);
const pad = (n) => String(n).padStart(2, "0");

// ---------- 道德经 ----------
const ddChapters = notes
  .filter((n) => n.tags.includes("道德经") && !n.tags.includes("背诵"))
  .map((n) => {
    const m = n.deckPath.match(/第(\d+)章/);
    const no = Number(m?.[1]);
    return {
      fields: n.fields,
      tags: n.tags,
      deckPath: `道德经::第${pad(no)}章`,
      guidSeed: `daodejing:chapter:${pad(no)}`,
      _no: no,
    };
  })
  .sort((a, b) => a._no - b._no)
  .map(({ _no, ...n }) => n);

const dao = ddChapters.filter((n) => n.tags.includes("道经"));
const de = ddChapters.filter((n) => n.tags.includes("德经"));
const pDao = join(root, "src/data/daodejing/ch1-37.js");
const pDe = join(root, "src/data/daodejing/ch38-81.js");
mkdirSync(dirname(pDao), { recursive: true });
writeFileSync(pDao, `// ch1-37.js —— 道德经·道经 第 1–37 章整章条目（由 rebuild_data_from_apkg.mjs 重建）
export const DAODEJING_CHAPTER_DAOJING = ${j(dao)};
`);
writeFileSync(pDe, `// ch38-81.js —— 道德经·德经 第 38–81 章整章条目（由 rebuild_data_from_apkg.mjs 重建）
export const DAODEJING_CHAPTER_DEJING = ${j(de)};
`);
console.log(`道德经整章 ${ddChapters.length} 条（道经 ${dao.length} + 德经 ${de.length}）→ ch1-37.js / ch38-81.js`);

// ---------- 逍遥游 ----------
const zz = notes
  .filter((n) => n.tags.includes("庄子"))
  .map((n) => {
    const m = n.deckPath.match(/第(\d+)段/);
    const no = Number(m?.[1]);
    return { fields: n.fields, tags: n.tags, deckPath: `庄子::逍遥游::第${no}段`, guidSeed: `zhuangzi:xiaoyaoyou:${no}`, _no: no };
  })
  .sort((a, b) => a._no - b._no)
  .map(({ _no, ...n }) => n);
const pXy = join(root, "src/data/zhuangzi/xiaoyao-you.js");
mkdirSync(dirname(pXy), { recursive: true });
writeFileSync(pXy, `// xiaoyao-you.js —— 庄子·逍遥游 7 段理解卡（由 rebuild_data_from_apkg.mjs 重建）
export const XIAOYAOYOU_NOTES = ${j(zz)};
`);
console.log(`逍遥游 ${zz.length} 段 → xiaoyao-you.js`);
