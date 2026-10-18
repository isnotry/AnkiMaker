// index.js —— buildApkg 公开 API + 浏览器下载助手
//
// 用法（Node 与浏览器一致）：
//   const SQL = await initSqlJs();
//   const { bytes, noteCount, cardCount, deckCount } = await buildApkg({
//     SQL, JSZip, model: GUWEN_MODEL, notes, decks, media: {}, meta: {...},
//   });

import { writeCol, insertNote, insertCard } from "./db.js";
import { packApkg } from "./pack.js";

/**
 * 生成一个 .apkg
 * @param {object} p
 * @param {import("sql.js").SqlJsStatic} p.SQL   sql.js 实例（依赖注入）
 * @param {any} p.JSZip                          jszip 构造器（依赖注入）
 * @param {object} p.model                       笔记类型（src/model/guwen.js）
 * @param {Array<{fields:object, tags?:string[], deckPath:string, guidSeed:string}>} p.notes
 * @param {Array<{path:string, desc?:string}>} p.decks   牌组列表（含主牌组）
 * @param {Record<string, Uint8Array>} p.media
 * @param {{source?:string, sourceUrl?:string, sourceCommit?:string, generatedAt?:string}} p.meta
 * @param {{now?:number}} p.options             now 注入便于测试确定性
 */
export async function buildApkg({ SQL, JSZip, model, notes, decks, media = {}, meta = {}, options = {} }) {
  const nowS = Math.floor((options.now ?? Date.now()) / 1000);
  const db = new SQL.Database();

  const tags = {};
  for (const n of notes) for (const t of n.tags ?? []) tags[t] = 0;

  const deckMap = writeCol(db, { model, decks, tags, meta, options });
  // deckMap 的 key 是数字 ID；按牌组名建立 path->id 索引（卡片 did 必须指向对应牌组）
  const idByName = {};
  for (const d of Object.values(deckMap)) idByName[d.name] = d.id;
  const deckId = (path) => idByName[path] ?? Object.values(deckMap)[0].id;

  let noteCount = 0;
  let cardCount = 0;
  let cardSeq = 0;
  let due = 0;
  db.run("BEGIN");
  for (const n of notes) {
    const { id, fires } = insertNote(db, n, model, noteCount, nowS);
    noteCount++;
    for (const t of model.tmpls) {
      if (fires.get(t.ord)) {
        insertCard(db, { cardId: cardSeq + 1, nid: id, did: deckId(n.deckPath), ord: t.ord, nowS, due: due++ });
        cardCount++;
        cardSeq++;
      }
    }
  }
  db.run("COMMIT");

  const bytes = db.export();
  db.close();
  const packed = await packApkg(bytes, media, JSZip);
  return {
    bytes: packed,
    noteCount,
    cardCount,
    deckCount: Object.keys(deckMap).length,
    decks: Object.values(deckMap).map((d) => d.name),
  };
}

/** 浏览器端触发下载 */
export function downloadApkg(bytes, filename = "cards.apkg") {
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
