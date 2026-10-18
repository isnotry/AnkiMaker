// schema.js —— Anki schema v11 建表 DDL 与默认配置（conf / dconf / 空 models/decks/tags）
//
// 标准 Anki 2.1.x 集合结构：
// col / notes / cards / revlog / graves，schema ver = 11。

export const SCHEMA_VER = 11;

export const DDL = `
CREATE TABLE col (
  id INTEGER PRIMARY KEY,
  crt INTEGER NOT NULL,
  mod INTEGER NOT NULL,
  scm INTEGER NOT NULL,
  ver INTEGER NOT NULL,
  dty INTEGER NOT NULL,
  usn INTEGER NOT NULL,
  ls INTEGER NOT NULL,
  conf TEXT NOT NULL,
  models TEXT NOT NULL,
  decks TEXT NOT NULL,
  dconf TEXT NOT NULL,
  tags TEXT NOT NULL
);
CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  guid TEXT NOT NULL,
  mid INTEGER NOT NULL,
  mod INTEGER NOT NULL,
  usn INTEGER NOT NULL,
  tags TEXT NOT NULL,
  flds TEXT NOT NULL,
  sfld INTEGER NOT NULL,
  csum INTEGER NOT NULL,
  flags INTEGER NOT NULL,
  data TEXT NOT NULL
);
CREATE TABLE cards (
  id INTEGER PRIMARY KEY,
  nid INTEGER NOT NULL,
  did INTEGER NOT NULL,
  ord INTEGER NOT NULL,
  mod INTEGER NOT NULL,
  usn INTEGER NOT NULL,
  type INTEGER NOT NULL,
  queue INTEGER NOT NULL,
  due INTEGER NOT NULL,
  ivl INTEGER NOT NULL,
  factor INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  lapses INTEGER NOT NULL,
  left INTEGER NOT NULL,
  odue INTEGER NOT NULL,
  odid INTEGER NOT NULL,
  flags INTEGER NOT NULL,
  data TEXT NOT NULL
);
CREATE TABLE revlog (
  id INTEGER PRIMARY KEY,
  cid INTEGER NOT NULL,
  usn INTEGER NOT NULL,
  ease INTEGER NOT NULL,
  ivl INTEGER NOT NULL,
  lastIvl INTEGER NOT NULL,
  factor INTEGER NOT NULL,
  time INTEGER NOT NULL,
  type INTEGER NOT NULL
);
CREATE TABLE graves (
  id INTEGER PRIMARY KEY,
  usn INTEGER NOT NULL,
  oid INTEGER NOT NULL,
  type INTEGER NOT NULL
);
`;

/** 默认 collection 配置（Anki 2.1.x 最小可用集） */
export function defaultConf(nowMs) {
  return {
    activeCols: "noteFlds,note,cardDue,deck,noteTags,nCardMod,noteLapses",
    addToCur: true,
    collapseTime: 1200,
    curDeck: 1,
    curModel: 0,
    dayLearnFirst: false,
    dueCounts: true,
    estTimes: true,
    newCardInsertion: "random",
    newSpread: 0,
    nextPos: 1,
    creationOffset: 0,
    sortBackwards: false,
    sortType: "noteFlds",
    schedVer: 2,
    timeLim: 0,
    useCurrent: true,
    editDegradesPosition: false,
  };
}

/** 默认牌组配置（dconf，id=1 默认配置）
 *
 * Anki 26（schema v18）导入 v11 apkg 时，用 rslib/src/deckconfig/schema11.rs
 * 的 DeckConfSchema11 解码 col.dconf JSON——顶层必填键为 new / rev / lapse
 * （不是 2.1.28+ 的 reviews/lapses）。缺任一键即报：
 *   JsonError { info: "decoding deck config: missing field `new`/`rev`/`lapse`" }
 * 子对象键名：new 期望 snake_case（initial_factor/per_day），rev/lapse 为 camelCase；
 * 此处 snake/camel 双写，兼容 Anki 2.1.x 老结构与 Anki 26 新解码器（多余键被 flatten 吸收）。
 * 已用 Rust + 与官方同款 serde 结构离线实测：本 JSON 可被 Anki 26 解码。
 */
export function defaultDconf() {
  return {
    1: {
      id: 1,
      mod: 0,
      name: "Default",
      usn: -1,
      maxTaken: 60,
      autoplay: true,
      timer: 0,
      replayq: true,
      dyn: false,
      new: {
        bury: true,
        delays: [1, 10],
        initial_factor: 2500,
        initialFactor: 2500,
        ints: [1, 4, 7],
        order: 1,
        per_day: 20,
        perDay: 20,
        separate: true,
        ease4: 1.3,
      },
      rev: {
        bury: false,
        ease4: 1.3,
        ivl_fct: 1.0,
        ivlFct: 1.0,
        max_ivl: 36500,
        maxIvl: 36500,
        per_day: 200,
        perDay: 200,
        hard_factor: 1.2,
        hardFactor: 1.2,
        fuzz: 0.05,
        minSpace: 1,
        hardMin: 0,
        newMix: 0,
        interdayLearning: 0,
      },
      lapse: {
        delays: [10],
        leech_action: 1,
        leechAction: 1,
        leech_fails: 8,
        leechFails: 8,
        min_int: 1,
        minInt: 1,
        mult: 0,
        ints: [1, 4, 7],
      },
    },
  };
}
