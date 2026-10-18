// zhuangzi/index.js —— 庄子·逍遥游数据出口（7 段理解卡）

import { XIAOYAOYOU_NOTES } from "./xiaoyao-you.js";

export { XIAOYAOYOU_NOTES };
export const ZHUANGZI_NOTES = XIAOYAOYOU_NOTES;

export const XIAOYAOYOU_META = {
  source: "《庄子·内篇·逍遥游》",
  sourceUrl: "https://zh.wikisource.org/wiki/莊子/逍遙遊",
  sourceCommit: "wikisource-zhuangzi-xiaoyaoyou",
  noteCount: XIAOYAOYOU_NOTES.length,
  notes: "7 段理解卡（原文非空→理解卡）；无背诵卡",
};
