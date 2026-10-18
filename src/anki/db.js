// db.js —— sql.js 建库：col / notes / cards 写入
//
// 数据约定：
//   - notes.flds = 字段值按模型 flds 定义顺序以 \x1f 拼接
//   - notes.sfld = 排序字段值（模型 sortf 指向的字段名）
//   - notes.csum = cardCsum(字段值数组)
//   - 卡片仅对「req 条件满足」的模板生成（背诵卡 req 上句非空、理解卡 req 原文非空）

import { DDL, SCHEMA_VER, defaultConf, defaultDconf } from "./schema.js";
import { stableDeckId, stableGuid, cardCsum } from "./ids.js";

const USN = -1; // 未同步（Anki 新导入约定）

/** 模板 req 判定：形如 [ord, "any"|"all", [字段序号…]] */
function templateFires(tmpl, fieldValues) {
  const [, mode, idxs] = tmpl.req ?? [];
  if (!Array.isArray(idxs)) return false;
  if (mode === "any") return idxs.some((i) => fieldValues[i]?.trim());
  if (mode === "all") return idxs.every((i) => fieldValues[i]?.trim());
  return false;
}

/** 建表 + 写 col 行（models / decks / dconf / conf / tags 全部 JSON 化） */
export function writeCol(db, { model, decks, tags, meta, options }) {
  const nowMs = options?.now ?? Date.now();
  const nowS = Math.floor(nowMs / 1000);

  // 父级在前、子级在后（保证 parentId 先就绪）
  const sorted = [...decks].sort((a, b) => a.path.length - b.path.length);
  const deckMap = {};
  for (const d of sorted) {
    const id = stableDeckId(d.path);
    // 关键：JSON 对象 key 必须是数字 ID 字符串（Anki 26 用 HashMap<DeckId, …> 解码，
    // key 写牌组名会报 "expected key to be a number in quotes" → decoding decks: JsonError）
    deckMap[String(id)] = {
      id,
      name: d.path,
      mod: nowS,
      usn: 0,
      conf: 1,
      lrnToday: [nowS, 0],
      revToday: [nowS, 0],
      newToday: [nowS, 0],
      timeToday: [nowS, 0],
      collapsed: false,
      dyn: 0,
      desc: d.desc ?? "",
      extendNew: 0,
      extendRev: 0,
      newGatherPriority: 0,
      browserCollapsed: false,
    };
  }
  for (const d of sorted) {
    const idx = d.path.lastIndexOf("::");
    if (idx > 0) {
      const parent = deckMap[String(stableDeckId(d.path.slice(0, idx)))];
      if (parent) deckMap[String(stableDeckId(d.path))].parentId = parent.id;
    }
  }

  // 主牌组描述写入生成元信息（让来源可溯）——取传入顺序的第一个顶层牌组
  const main = Object.values(deckMap).find((d) => d.name === (decks.find((x) => !x.path.includes("::"))?.path ?? d.name));
  if (main && meta) {
    const lines = [
      `生成时间：${meta.generatedAt ?? new Date(nowMs).toISOString()}`,
      `来源：${meta.source ?? ""}`,
      meta.sourceUrl ? `原文链接：${meta.sourceUrl}` : null,
      meta.sourceCommit ? `版本：${meta.sourceCommit}` : null,
      "由 AnkiMaker 生成（浏览器内 sql.js + JSZip）",
    ].filter(Boolean);
    main.desc = lines.join("\n");
  }

  const conf = defaultConf(nowMs);
  conf.curModel = String(model.id);
  // curDeck 指向传入 decks 的第一个顶层牌组（如「道德经」），避免 Anki 打开后默认选中某个子牌组
  const topLevel = decks.find((x) => !x.path.includes("::")) ?? decks[0];
  const curDeck = topLevel ? deckMap[String(stableDeckId(topLevel.path))] : Object.values(deckMap)[0];
  if (curDeck) conf.curDeck = curDeck.id;

  db.run("BEGIN");
  db.run(DDL);
  db.run(
    "INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags) VALUES (1, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?)",
    [nowS, nowS, nowS, SCHEMA_VER,
      JSON.stringify(conf), JSON.stringify({ [model.id]: model }), JSON.stringify(deckMap),
      JSON.stringify(defaultDconf()), JSON.stringify(tags)]
  );
  db.run("COMMIT");
  return deckMap;
}

/** 写入一条笔记，返回 {id, guid, fires: Map<模板序号, 是否出卡>} */
export function insertNote(db, note, model, seq, nowS) {
  const fldOrder = model.flds.map((f) => f.name);
  const values = fldOrder.map((name) => String(note.fields?.[name] ?? ""));
  const guid = stableGuid(note.guidSeed);
  const sfld = values[model.sortf] ?? "";
  const csum = cardCsum(values);
  const id = seq + 1;
  db.run(
    "INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '')",
    [id, guid, Number(model.id), nowS, USN, (note.tags ?? []).join(" "), values.join("\x1f"), sfld, csum]
  );
  const fires = new Map();
  for (const t of model.tmpls) fires.set(t.ord, templateFires(t, values));
  return { id, guid, fires };
}

/** 写入一张新卡（type=0 新卡, queue=0, due 顺序） */
export function insertCard(db, { cardId, nid, did, ord, nowS, due }) {
  db.run(
    "INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')",
    [cardId, nid, did, ord, nowS, USN, due]
  );
}
