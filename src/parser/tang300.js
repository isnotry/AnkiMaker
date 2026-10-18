// tang300.js —— 《唐诗三百首》文本解析器
//
// 输入：Project Gutenberg #52323 纯文本正文（见 src/data/tang300/raw.txt）
// 格式（每行一句）：
//   001
//   感遇（四首之一）
//   作者：張九齡
//   孤鴻海上來，
//   池潢不敢顧；
//   ...
//
// 解析规则：
//   1. 3 位数字独占一行 → 新诗开始
//   2. "作者：X" 行 → 其之前的行拼接为题名（长题可跨行）
//   3. 作者行之后的非空行 → 诗句（每行一句，含标点）
//
// 体裁推断（句数 × 句长）：字长纯净（全 5 或全 7）才判绝句/律诗；
// 混合字长归古诗，含 6 字以下短句（3+3 句式，如《将进酒》《石鱼湖上醉歌》）判杂言古诗。

export function parseTang300(rawText) {
  // 提取 START/END 标记之间的正文
  const start = rawText.indexOf("*** START OF THE PROJECT GUTENBERG EBOOK 唐诗三百首 ***");
  const end = rawText.indexOf("*** END OF THE PROJECT GUTENBERG EBOOK");
  if (start < 0 || end < 0) throw new Error("parseTang300: 找不到 Gutenberg 正文标记");
  const body = rawText.slice(start, end < 0 ? undefined : end);
  const lines = body.split("\n").map((l) => l.replace(/\uFEFF/g, "").trim());

  const poems = [];
  let cur = null;

  for (const line of lines) {
    if (!line) continue;
    if (/^\d{3}$/.test(line)) {
      cur = { no: Number(line), titleLines: [], author: null, lines: [] };
      poems.push(cur);
      continue;
    }
    if (!cur) continue;
    const m = line.match(/^作者：(.+)$/);
    if (m) {
      cur.author = m[1].trim();
      cur.title = cur.titleLines.join("").trim();
      delete cur.titleLines;
      continue;
    }
    if (cur.author === null) {
      cur.titleLines.push(line);
    } else {
      cur.lines.push(line);
    }
  }

  return poems.map((p) => {
    const lens = p.lines.map((l) => l.replace(/[，。；？！、：]/g, "").length);
    const count = p.lines.length;
    const freq = new Map();
    for (const n of lens) freq.set(n, (freq.get(n) ?? 0) + 1);
    let mode = 0;
    let maxF = 0;
    for (const [n, f] of freq) if (f > maxF) { maxF = f; mode = n; }

    const set = new Set(lens);
    let genre;
    if (set.size === 1) {
      const n = lens[0];
      if (count === 4 && n === 5) genre = "五言绝句";
      else if (count === 4 && n === 7) genre = "七言绝句";
      else if (count === 8 && n === 5) genre = "五言律诗";
      else if (count === 8 && n === 7) genre = "七言律诗";
      else genre = n === 5 ? "五言古诗" : "七言古诗";
    } else {
      genre = Math.min(...lens) <= 6 ? "杂言古诗" : (mode === 5 ? "五言古诗" : "七言古诗");
    }

    return {
      no: p.no,
      title: p.title.replace(/[。！？]+$/g, ""),
      author: p.author,
      genre,
      lines: p.lines,
      fullText: p.lines.join("\n"),
    };
  });
}
