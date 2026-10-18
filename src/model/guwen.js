// guwen.js —— 「古籍条目」笔记类型（古诗文卡）
//
// 9 字段：篇目 / 标题 / 上句 / 下句 / 原文 / 译文 / 注释 / 赏析 / 链接（标题为排序字段）
// 2 模板：
//   背诵卡（ord 0）req=[0,"any",[2]] —— 上句非空即出卡
//   赏析卡（ord 1，旧名理解卡）req=[1,"any",[4]] —— 原文非空即出卡
// 「原文留空」的背诵条目只出背诵卡；「无上句」的整章条目只出赏析卡——两条线互不串扰。
// CSS 为卡片排版基线：系统字体栈 / 18px / 1.7 /
// max-width 40em 居中左对齐 / 日间 #213547 夜间 #1b1b1f / 链接 #3451b2。

export const GUWEN_MODEL = {
  id: "1759900000002",
  name: "古籍条目（古诗文卡）",
  type: 0,
  mod: 0,
  usn: -1,
  sortf: 1, // 标题
  did: 1,
  tmpls: [
    {
      name: "背诵卡",
      ord: 0,
      qfmt: `<div class="meta">{{篇目}}</div>
<div class="prompt">{{上句}}</div>`,
      afmt: `<div class="meta">{{篇目}}</div>
<div class="answer">{{下句}}</div>
{{#原文}}<div class="label">全文</div><div class="poem">{{原文}}</div>{{/原文}}
{{#译文}}<div class="label">译文</div><div class="poem">{{译文}}</div>{{/译文}}
{{#注释}}<div class="label">注释</div><div class="notes">{{注释}}</div>{{/注释}}`,
      bqfmt: "",
      bafmt: "",
      did: null,
      req: [0, "any", [2]], // 上句非空
    },
    {
      name: "赏析卡",
      ord: 1,
      qfmt: `<div class="meta">{{篇目}}</div>
<div class="poem">{{原文}}</div>`,
      afmt: `<div class="meta">{{篇目}}</div>
{{#译文}}<div class="label">译文</div><div class="poem">{{译文}}</div>{{/译文}}
{{#注释}}<div class="label">注释</div><div class="notes">{{注释}}</div>{{/注释}}
{{#赏析}}<div class="label">赏析</div><div class="notes">{{赏析}}</div>{{/赏析}}
{{#链接}}<div class="label">链接</div><div class="notes"><a href="{{链接}}">{{链接}}</a></div>{{/链接}}`,
      bqfmt: "",
      bafmt: "",
      did: null,
      req: [1, "any", [4]], // 原文非空
    },
  ],
  flds: ["篇目", "标题", "上句", "下句", "原文", "译文", "注释", "赏析", "链接"].map((name, ord) => ({
    name,
    ord,
    sticky: false,
    rtl: false,
    font: "Noto Sans CJK SC",
    size: 20,
    media: [],
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

/* 夜间主题：兼容 nightMode（新）与 night_mode（旧）两种类名 */
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
    [1, "any", [4]],
  ],
};
