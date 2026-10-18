// src/parser/song300.js —— 《宋词三百首》解析器（Wikisource 朱孝臧 1924 年辑本）
//
// 输入：src/data/song300/raw.txt（zh.wikisource.org/wiki/宋詞三百首 的原始 wikitext）
// 格式：
//   =='''词牌·副题'''（[[Author:作者|作者]]）==     标题行
//   <poem>…</poem>                                 正文（空行分隔半阙）
//   正文行首的（小序）或（小序略）                   提取为小序（小序略丢弃）
// 特例：#179 青玉案·元夕 为 ==[[青玉案 (辛棄疾)]]== + {{:…}} transclude，
//       正文取自子页《青玉案 (辛棄疾)》（hardcode 于下）。
//
// 输出：SONG300_POEMS（序号/词牌/副题/作者/小序/正文全文/首句）

const CJK_TITLE = /^=='''(.+?)'''（\[\[Author:.+?\|(.+?)\]\]）==$/;
const TRANS_TITLE = /^==\[\[(.+?)\]\]==$/;

// #179 青玉案·元夕（transclude 子页正文，公共领域）
const QINGYUAN_TITLE = "青玉案 (辛棄疾)";
const QINGYUAN_SUB = "元夕";
const QINGYUAN_AUTHOR = "辛棄疾";
const QINGYUAN_TEXT = "東風夜放花千樹，更吹落、星如雨。寶馬雕車香滿路，鳳簫聲動，玉壺光轉，一夜魚龍舞。蛾兒雪柳黃金縷，笑語盈盈暗香去。眾裡尋他千百度；驀然回首，那人卻在，燈火闌珊處。";

export function parseSong300(rawText) {
  const poems = [];
  let cur = null;
  let inPoem = false;
  const lines = rawText.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const h = t.match(CJK_TITLE);
    if (h) {
      if (cur) poems.push(cur);
      const titlePart = h[1].trim();
      const author = h[2].trim();
      const dot = titlePart.indexOf("·");
      cur = {
        cipai: dot > 0 ? titlePart.slice(0, dot) : titlePart,
        subtitle: dot > 0 ? titlePart.slice(dot + 1) : "",
        author,
        xiaoxu: "",
        body: [],
      };
      inPoem = false;
      continue;
    }
    const th = t.match(TRANS_TITLE);
    if (th && th[1].trim() === QINGYUAN_TITLE) {
      if (cur) poems.push(cur);
      cur = { cipai: "青玉案", subtitle: QINGYUAN_SUB, author: QINGYUAN_AUTHOR, xiaoxu: "", body: [QINGYUAN_TEXT] };
      inPoem = false;
      continue;
    }
    if (t === "<poem>") { inPoem = true; continue; }
    if (t === "</poem>") { inPoem = false; continue; }
    // 小序：以（开头、以）结尾的整行（poem 内外皆可能）→ 进 xiaoxu（“小序略”为编者省略标记，丢弃）
    if (cur && !cur.xiaoxu && t.startsWith("（") && t.endsWith("）")) {
      if (!t.includes("小序略")) cur.xiaoxu = t;
      continue;
    }
    if (inPoem) {
      let s = t.replace(/　/g, "").trim();
      if (!s) continue;
      if (cur) cur.body.push(s);
    }
  }
  if (cur) poems.push(cur);
  // 序号与首句
  return poems.map((p, i) => {
    const text = p.body.join("").replace(/[　\s]+/g, "");
    const m = text.match(/^[^。！？；]*[。！？；]/);
    return {
      no: i + 1,
      cipai: p.cipai,
      subtitle: p.subtitle,
      author: p.author,
      xiaoxu: p.xiaoxu,
      text,
      firstSentence: m ? m[0].slice(0, -1) : text,
    };
  });
}
