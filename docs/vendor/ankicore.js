var AnkiCore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // scripts/site-core.js
  var site_core_exports = {};
  __export(site_core_exports, {
    GUWEN_MODEL: () => GUWEN_MODEL,
    buildApkg: () => buildApkg,
    downloadApkg: () => downloadApkg
  });

  // src/anki/schema.js
  var SCHEMA_VER = 11;
  var DDL = `
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
  function defaultConf(nowMs) {
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
      editDegradesPosition: false
    };
  }
  function defaultDconf() {
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
          ease4: 1.3
        },
        rev: {
          bury: false,
          ease4: 1.3,
          ivl_fct: 1,
          ivlFct: 1,
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
          interdayLearning: 0
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
          ints: [1, 4, 7]
        }
      }
    };
  }

  // src/anki/ids.js
  var ALPHABET = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{};:'",.<>/?\\|~`;
  function fnv1a64(str) {
    const PRIME = 0x100000001b3n;
    const OFFSET = 0xcbf29ce484222325n;
    let h = OFFSET;
    const bytes = new TextEncoder().encode(str);
    for (const b of bytes) {
      h ^= BigInt(b);
      h = h * PRIME & 0xffffffffffffffffn;
    }
    return h;
  }
  function base91Guid(hash) {
    let n = hash;
    let out = "";
    for (let i = 0; i < 8; i++) {
      out = ALPHABET[Number(n % 91n)] + out;
      n /= 91n;
    }
    return out;
  }
  function stableGuid(seed) {
    return base91Guid(fnv1a64(seed));
  }
  function stableDeckId(name) {
    const h = fnv1a64(name) & 0xffffffffffffn;
    return Number(h % 100000000000000n);
  }
  function sha1(str) {
    const bytes = new TextEncoder().encode(str);
    const ml = bytes.length * 8;
    const msg = new Uint8Array((bytes.length + 8 >> 6) + 1 << 6);
    msg.set(bytes);
    msg[bytes.length] = 128;
    const dv = new DataView(msg.buffer);
    dv.setUint32(msg.length - 4, Math.floor(ml / 4294967296), false);
    dv.setUint32(msg.length - 8, ml >>> 0, false);
    let h0 = 1732584193, h1 = 4023233417, h2 = 2562383102, h3 = 271733878, h4 = 3285377520;
    const w = new Uint32Array(80);
    for (let i = 0; i < msg.length; i += 64) {
      for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4, false);
      for (let j = 16; j < 80; j++) {
        w[j] = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
        w[j] = w[j] << 1 | w[j] >>> 31;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4;
      for (let j = 0; j < 80; j++) {
        let f, k;
        if (j < 20) {
          f = b & c | ~b & d;
          k = 1518500249;
        } else if (j < 40) {
          f = b ^ c ^ d;
          k = 1859775393;
        } else if (j < 60) {
          f = b & c | b & d | c & d;
          k = 2400959708;
        } else {
          f = b ^ c ^ d;
          k = 3395469782;
        }
        const tmp = (a << 5 | a >>> 27) + f + e + k + w[j] >>> 0;
        e = d;
        d = c;
        c = b << 30 | b >>> 2;
        b = a;
        a = tmp;
      }
      h0 = h0 + a >>> 0;
      h1 = h1 + b >>> 0;
      h2 = h2 + c >>> 0;
      h3 = h3 + d >>> 0;
      h4 = h4 + e >>> 0;
    }
    const hex = (n) => n.toString(16).padStart(8, "0");
    return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4);
  }
  function cardCsum(fieldValues) {
    const joined = fieldValues.join("").slice(0, 500);
    return parseInt(sha1(joined).slice(0, 8), 16);
  }

  // src/anki/db.js
  var USN = -1;
  function templateFires(tmpl, fieldValues) {
    const [, mode, idxs] = tmpl.req ?? [];
    if (!Array.isArray(idxs)) return false;
    if (mode === "any") return idxs.some((i) => fieldValues[i]?.trim());
    if (mode === "all") return idxs.every((i) => fieldValues[i]?.trim());
    return false;
  }
  function writeCol(db, { model, decks, tags, meta, options }) {
    const nowMs = options?.now ?? Date.now();
    const nowS = Math.floor(nowMs / 1e3);
    const sorted = [...decks].sort((a, b) => a.path.length - b.path.length);
    const deckMap = {};
    for (const d of sorted) {
      const id = stableDeckId(d.path);
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
        browserCollapsed: false
      };
    }
    for (const d of sorted) {
      const idx = d.path.lastIndexOf("::");
      if (idx > 0) {
        const parent = deckMap[String(stableDeckId(d.path.slice(0, idx)))];
        if (parent) deckMap[String(stableDeckId(d.path))].parentId = parent.id;
      }
    }
    const main = Object.values(deckMap).find((d) => d.name === (decks.find((x) => !x.path.includes("::"))?.path ?? d.name));
    if (main && meta) {
      const lines = [
        `\u751F\u6210\u65F6\u95F4\uFF1A${meta.generatedAt ?? new Date(nowMs).toISOString()}`,
        `\u6765\u6E90\uFF1A${meta.source ?? ""}`,
        meta.sourceUrl ? `\u539F\u6587\u94FE\u63A5\uFF1A${meta.sourceUrl}` : null,
        meta.sourceCommit ? `\u7248\u672C\uFF1A${meta.sourceCommit}` : null,
        "\u7531 AnkiMaker \u751F\u6210\uFF08\u6D4F\u89C8\u5668\u5185 sql.js + JSZip\uFF09"
      ].filter(Boolean);
      main.desc = lines.join("\n");
    }
    const conf = defaultConf(nowMs);
    conf.curModel = String(model.id);
    const topLevel = decks.find((x) => !x.path.includes("::")) ?? decks[0];
    const curDeck = topLevel ? deckMap[String(stableDeckId(topLevel.path))] : Object.values(deckMap)[0];
    if (curDeck) conf.curDeck = curDeck.id;
    db.run("BEGIN");
    db.run(DDL);
    db.run(
      "INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags) VALUES (1, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?)",
      [
        nowS,
        nowS,
        nowS,
        SCHEMA_VER,
        JSON.stringify(conf),
        JSON.stringify({ [model.id]: model }),
        JSON.stringify(deckMap),
        JSON.stringify(defaultDconf()),
        JSON.stringify(tags)
      ]
    );
    db.run("COMMIT");
    return deckMap;
  }
  function insertNote(db, note, model, seq, nowS) {
    const fldOrder = model.flds.map((f) => f.name);
    const values = fldOrder.map((name) => String(note.fields?.[name] ?? ""));
    const guid = stableGuid(note.guidSeed);
    const sfld = values[model.sortf] ?? "";
    const csum = cardCsum(values);
    const id = seq + 1;
    db.run(
      "INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '')",
      [id, guid, Number(model.id), nowS, USN, (note.tags ?? []).join(" "), values.join(""), sfld, csum]
    );
    const fires = /* @__PURE__ */ new Map();
    for (const t of model.tmpls) fires.set(t.ord, templateFires(t, values));
    return { id, guid, fires };
  }
  function insertCard(db, { cardId, nid, did, ord, nowS, due }) {
    db.run(
      "INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')",
      [cardId, nid, did, ord, nowS, USN, due]
    );
  }

  // src/anki/pack.js
  async function packApkg(anki2Bytes, media, JSZip) {
    const zip = new JSZip();
    zip.file("collection.anki2", anki2Bytes);
    if (media && Object.keys(media).length > 0) {
      const index = {};
      Object.keys(media).forEach((key, i) => {
        index[i] = key;
      });
      zip.file("media", JSON.stringify(index));
      for (const [key, bytes] of Object.entries(media)) zip.file(key, bytes);
    } else {
      zip.file("media", "{}");
    }
    return zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });
  }

  // src/anki/index.js
  async function buildApkg({ SQL, JSZip, model, notes, decks, media = {}, meta = {}, options = {} }) {
    const nowS = Math.floor((options.now ?? Date.now()) / 1e3);
    const db = new SQL.Database();
    const tags = {};
    for (const n of notes) for (const t of n.tags ?? []) tags[t] = 0;
    const deckMap = writeCol(db, { model, decks, tags, meta, options });
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
      decks: Object.values(deckMap).map((d) => d.name)
    };
  }
  function downloadApkg(bytes, filename = "cards.apkg") {
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e4);
  }

  // src/model/guwen.js
  var GUWEN_MODEL = {
    id: "1759900000002",
    name: "\u53E4\u7C4D\u6761\u76EE\uFF08\u53E4\u8BD7\u6587\u5361\uFF09",
    type: 0,
    mod: 0,
    usn: -1,
    sortf: 1,
    // 标题
    did: 1,
    tmpls: [
      {
        name: "\u80CC\u8BF5\u5361",
        ord: 0,
        qfmt: `<div class="meta">{{\u7BC7\u76EE}}</div>
<div class="prompt">{{\u4E0A\u53E5}}</div>`,
        afmt: `<div class="meta">{{\u7BC7\u76EE}}</div>
<div class="answer">{{\u4E0B\u53E5}}</div>
{{#\u539F\u6587}}<div class="label">\u5168\u6587</div><div class="poem">{{\u539F\u6587}}</div>{{/\u539F\u6587}}
{{#\u8BD1\u6587}}<div class="label">\u8BD1\u6587</div><div class="poem">{{\u8BD1\u6587}}</div>{{/\u8BD1\u6587}}
{{#\u6CE8\u91CA}}<div class="label">\u6CE8\u91CA</div><div class="notes">{{\u6CE8\u91CA}}</div>{{/\u6CE8\u91CA}}`,
        bqfmt: "",
        bafmt: "",
        did: null,
        req: [0, "any", [2]]
        // 上句非空
      },
      {
        name: "\u8D4F\u6790\u5361",
        ord: 1,
        qfmt: `<div class="meta">{{\u7BC7\u76EE}}</div>
<div class="poem">{{\u539F\u6587}}</div>`,
        afmt: `<div class="meta">{{\u7BC7\u76EE}}</div>
{{#\u8BD1\u6587}}<div class="label">\u8BD1\u6587</div><div class="poem">{{\u8BD1\u6587}}</div>{{/\u8BD1\u6587}}
{{#\u6CE8\u91CA}}<div class="label">\u6CE8\u91CA</div><div class="notes">{{\u6CE8\u91CA}}</div>{{/\u6CE8\u91CA}}
{{#\u8D4F\u6790}}<div class="label">\u8D4F\u6790</div><div class="notes">{{\u8D4F\u6790}}</div>{{/\u8D4F\u6790}}
{{#\u94FE\u63A5}}<div class="label">\u94FE\u63A5</div><div class="notes"><a href="{{\u94FE\u63A5}}">{{\u94FE\u63A5}}</a></div>{{/\u94FE\u63A5}}`,
        bqfmt: "",
        bafmt: "",
        did: null,
        req: [1, "any", [4]]
        // 原文非空
      }
    ],
    flds: ["\u7BC7\u76EE", "\u6807\u9898", "\u4E0A\u53E5", "\u4E0B\u53E5", "\u539F\u6587", "\u8BD1\u6587", "\u6CE8\u91CA", "\u8D4F\u6790", "\u94FE\u63A5"].map((name, ord) => ({
      name,
      ord,
      sticky: false,
      rtl: false,
      font: "Noto Sans CJK SC",
      size: 20,
      media: []
    })),
    css: `.card {
  font-family: "Segoe UI", -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
  font-size: 18px;
  line-height: 1.7;
  color: #213547;
  background: #fff;
  max-width: 40em;
  margin: 0 auto;
  padding: 1.2em;
  text-align: left;
}
.meta { color: #6b7a8c; font-size: 13px; margin-bottom: .6em; }
.prompt { font-size: 26px; font-weight: 600; }
.answer { font-size: 26px; font-weight: 600; color: #1d4f6e; }
.poem { white-space: pre-line; margin: .4em 0; color: #34495e; }
.notes { margin: .2em 0; }
.label { color: #6b7a8c; font-size: 13px; margin-top: .9em; border-bottom: 1px solid #e3e8ee; padding-bottom: 2px; }
a { color: #3451b2; text-decoration: none; }
a:hover { text-decoration: underline; }

/* \u591C\u95F4\u4E3B\u9898\uFF1A\u517C\u5BB9 nightMode\uFF08\u65B0\uFF09\u4E0E night_mode\uFF08\u65E7\uFF09\u4E24\u79CD\u7C7B\u540D */
.nightMode .card, .night_mode .card { color: #d8e0ea; background: #1b1b1f; }
.nightMode .meta, .night_mode .meta { color: #8fa0b3; }
.nightMode .prompt, .night_mode .prompt { color: #f0f4f8; }
.nightMode .answer, .night_mode .answer { color: #a8d8f0; }
.nightMode .poem, .night_mode .poem { color: #b9c4d0; }
.nightMode .label, .night_mode .label { color: #8fa0b3; border-bottom-color: #2a2d34; }
.nightMode a, .night_mode a { color: #a8b1ff; }`,
    latexPre: "\\documentclass[12pt]{article}\n\\usepackage[utf8]{inputenc}\n...",
    latexPost: "\\end{document}",
    latexsvg: false,
    req: [
      [0, "any", [2]],
      [1, "any", [4]]
    ]
  };
  return __toCommonJS(site_core_exports);
})();
