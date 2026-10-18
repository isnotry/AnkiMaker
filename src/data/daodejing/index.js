// daodejing/index.js —— 道德经数据总出口
// 整章 81（ch1-37 道经 + ch38-81 德经）+ 背诵 473（recite.js）= 554 条

import { DAODEJING_CHAPTER_DAOJING } from "./ch1-37.js";
import { DAODEJING_CHAPTER_DEJING } from "./ch38-81.js";
import { DAODEJING_RECITE_NOTES } from "./recite.js";

export const DAODEJING_CHAPTER_NOTES = [...DAODEJING_CHAPTER_DAOJING, ...DAODEJING_CHAPTER_DEJING];
export { DAODEJING_RECITE_NOTES };
export const DAODEJING_NOTES = [...DAODEJING_CHAPTER_NOTES, ...DAODEJING_RECITE_NOTES];

export const DAODEJING_META = {
  source: "《道德经》（王弼本通行文字，参考维基文库汇校本核对）",
  sourceUrl: "https://zh.wikisource.org/wiki/老子_(匯校版)",
  sourceCommit: "wikisource-laozihuijiaoben",
  noteCount: DAODEJING_NOTES.length,
  chapterCount: DAODEJING_CHAPTER_NOTES.length,
  reciteCount: DAODEJING_RECITE_NOTES.length,
  notes: "整章卡（原文非空→理解卡）+ 背诵卡（上句非空、原文留空→背诵卡），两条线互不触发对方模板",
};
