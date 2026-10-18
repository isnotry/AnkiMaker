// fojing/notes.js —— 《心经》《金刚经》笔记数组（build_fojing.mjs 与 bundle_site.mjs 共用）
//
// 心经：赏析 1 条（原文=全文→题解）+ 背诵 8 条（上句=段首提示→下句=全段）
// 金刚经：赏析 32 条（原文=全品→「分则八字提要+品旨」）+ 背诵按品拆句对（沿用 split_daodejing 配对规则）
import { XINJING_SECTIONS, XINJING_FULL, XINJING_META, JINGANGJING_PARTS, JINGANGJING_META } from "./index.js";

// 心经背诵提示（段首句）
const XINJING_PROMPTS = [
  "觀自在菩薩",
  "色不異空，空不異色",
  "是諸法空相，不生不滅",
  "空中無色，無受想行識",
  "菩提薩埵，依般若波羅蜜多故",
  "三世諸佛，依般若波羅蜜多故",
  "般若波羅蜜多，是大神咒",
  "揭諦 揭諦 波羅揭諦",
];

const XINJING_APPRECIATION =
  "《般若波羅蜜多心經》，唐三藏法師玄奘譯，全文約 260 字，為六百卷《大般若經》之精要。首句「照見五蘊皆空，度一切苦厄」總攝全經；中明「色不異空，空不異色」之色空不二，次破十二處、十八界、十二因緣、四諦皆無所得；末以般若大神咒作結，旨歸「心無罣礙，遠離顛倒夢想」。";

const PART_APPRECIATIONS = {
  1: "佛在舍衛國祇樹給孤獨園，與大比丘眾千二百五十人俱，食時乞食、敷座而坐——說法之緣起。",
  2: "長老須菩提啟請：善男子善女人發菩提心者，應云何住、云何降伏其心？",
  3: "佛答降心之法：滅度一切眾生而實無眾生得滅度者；若菩薩有我、人、眾生、壽者相，即非菩薩。",
  4: "菩薩於法應無所住而行布施，不住於相，其福德不可思量。",
  5: "凡所有相皆是虛妄；若見諸相非相，即見如來。",
  6: "不應取法，亦不應取非法；如來說法如筏喻者，法尚應捨，何況非法。",
  7: "無有定法名阿耨多羅三藐三菩提，亦無有定法如來可說；一切賢聖皆以無為法而有差別。",
  8: "受持四句偈為他人說，其福勝於以三千大千世界七寶布施；一切諸佛及佛法皆從此經出。",
  9: "須陀洹、斯陀含、阿那含、阿羅漢皆不著得果之念；實無有法名阿羅漢。",
  10: "應如是生清淨心，應無所住而生其心；莊嚴佛土者，即非莊嚴，是名莊嚴。",
  11: "受持四句偈為他人說之福，勝於以恆河沙數三千大千世界七寶布施。",
  12: "隨說是經之處，一切世間天、人、阿修羅皆應供養，如佛塔廟。",
  13: "此經名為金剛般若波羅蜜；佛說般若波羅蜜，即非般若波羅蜜，是名般若波羅蜜。",
  14: "離一切諸相則名諸佛；應生無所住心，若心有住則為非住。",
  15: "聞此經典信心不逆，其福勝於無量劫以身布施；是經功德不可稱量。",
  16: "受持讀誦此經若為人輕賤，先世罪業即為消滅，當得阿耨多羅三藐三菩提。",
  17: "實無有法發菩提心者；如來於燃燈佛所實無所得；一切法無我、無人、無眾生、無壽者。",
  18: "如來有肉眼、天眼、慧眼、法眼、佛眼；過去心不可得，現在心不可得，未來心不可得。",
  19: "以福德無故，如來說得福德多。",
  20: "如來不應以具足色身、具足諸相見；如來說具足即非具足。",
  21: "說法者無法可說，是名說法；如來說眾生即非眾生，是名眾生。",
  22: "我於阿耨多羅三藐三菩提乃至無有少法可得，是名阿耨多羅三藐三菩提。",
  23: "是法平等無有高下；以無我、無人、無眾生、無壽者修一切善法，則得菩提。",
  24: "受持讀誦此經四句偈之福，於布施七寶聚之福百分不及一。",
  25: "實無有眾生如來度者；凡夫者，如來說則非凡夫，是名凡夫。",
  26: "若以色見我，以音聲求我，是人行邪道，不能見如來。",
  27: "發菩提心者，於法不說斷滅相。",
  28: "菩薩不受福德；菩薩所作福德，不應貪著。",
  29: "如來者，無所從來，亦無所去，故名如來。",
  30: "三千大千世界碎為微塵，微塵眾即非微塵眾；一合相者不可說，但凡夫之人貪著其事。",
  31: "發菩提心者於一切法應如是知、如是見、如是信解，不生法相。",
  32: "一切有為法，如夢幻泡影，如露亦如電，應作如是觀；佛說是經已，聞者皆大歡喜，信受奉行。",
};

// ---------- 句对拆分（沿用 scripts/split_daodejing.mjs 规则）----------
function splitSentences(text) {
  const parts = String(text).split(/([。！？])/).filter((s) => s && s.trim());
  const sentences = [];
  for (let i = 0; i < parts.length; i += 2) {
    const body = (parts[i] ?? "").trim();
    if (!body) continue;
    const tail = parts[i + 1] ?? "";
    const inner = body.split(/([，；])/).filter((s) => s && s.trim());
    const units = [];
    for (let j = 0; j < inner.length; j += 2) {
      const unit = (inner[j] ?? "").trim();
      if (!unit) continue;
      units.push({ unit, sep: inner[j + 1] ?? "" });
    }
    sentences.push({ units, tail });
  }
  return sentences;
}
function fullText(s) {
  return s.units.map((u) => u.unit + u.sep).join("") + s.tail;
}
/** 弱句：去除引号/标点后 ≤5 字（称呼「須菩提」「世尊」、短问「於意云何」「如是」等）——不独立成卡 */
function isWeak(text) {
  const core = String(text).replace(/[「」『』“”]/g, "").replace(/[，。！？；、：]/g, "");
  return core.length <= 5;
}
function recitePairs(text) {
  const sentences = splitSentences(text);
  const cards = [];
  const pending = []; // 强单句（可作上句）
  const weakBuf = []; // 无前序强句时的弱句（并入下一个上句前缀）
  let firstPair = true;
  const takePrefix = () => {
    if (!weakBuf.length) return "";
    const p = weakBuf.splice(0).join("，");
    return p + "，";
  };
  // 上句：去尾部引号，疑问句补「？」；下句：去头部引号
  const card = (up, down) => ({
    up: (up.replace(/[」]+$/g, "").trim().endsWith("不") ? up.replace(/[」]+$/g, "").trim() + "？" : up.replace(/[」]+$/g, "").trim()),
    down: down.replace(/^[「」]+/g, "").trim(),
  });
  for (const s of sentences) {
    if (s.units.length === 0) continue;
    if (s.units.length === 1) {
      const u = s.units[0].unit;
      if (isWeak(u)) {
        // 弱句归属：有前序强句→并入其末尾（如「須菩提言：「如是」+「如是」）；
        // 否则留作下一张卡的上句前缀（如句首称呼「佛言：「須菩提」）
        if (pending.length) {
          const last = pending[pending.length - 1];
          last.unit += "，" + u;
        } else {
          weakBuf.push(u);
        }
        continue;
      }
      pending.push({ unit: u, tail: s.tail });
      continue;
    }
    // 多单元强句：先消化 pending 强句（问答对：上=前一问句，下=本句）
    while (pending.length >= 2) {
      const a = pending.shift();
      const b = pending.shift();
      cards.push(card(takePrefix() + a.unit, b.unit + (b.tail || "。")));
      firstPair = false;
    }
    if (pending.length === 1) {
      const p = pending.shift();
      cards.push(card(takePrefix() + p.unit, fullText(s)));
      firstPair = false;
      continue;
    }
    // 剔除前导弱句（「爾時」「飯食訖」「「復次」「「不也」等），并入 up 前缀，避免孤立成卡
    let us = s.units.slice();
    while (us.length && isWeak(us[0].unit)) weakBuf.push(us.shift().unit);
    if (!us.length) continue;
    if (us.length === 1) {
      const u = us[0];
      if (isWeak(u.unit)) { weakBuf.push(u.unit); continue; }
      pending.push({ unit: u.unit, tail: s.tail });
      continue;
    }
    const lens = us.map((u) => u.unit.length);
    const uniform = us.length >= 3 && Math.max(...lens) - Math.min(...lens) <= 3;
    if (uniform) {
      for (let k = 0; k + 1 < us.length; k += 2) {
        const upText = (firstPair ? takePrefix() : "") + us[k].unit;
        cards.push(card(upText, us[k + 1].unit + (us[k + 1].sep || s.tail || "。")));
        firstPair = false;
      }
      if (us.length % 2 === 1) {
        const last = us[us.length - 1];
        const c = cards[cards.length - 1];
        c.down = c.down + "，" + last.unit + (last.sep || s.tail || "。");
      }
    } else {
      const rest = us.slice(1).map((u) => u.unit + u.sep).join("").trim();
      cards.push(card(takePrefix() + us[0].unit, rest + (s.tail || "。")));
      firstPair = false;
    }
  }
  // 收尾：强句残留并入上一卡末尾；弱句也并入
  while (pending.length) {
    const p = pending.shift();
    if (cards.length) {
      const c = cards[cards.length - 1];
      c.down = c.down + "，" + p.unit + (p.tail || "。");
    } else {
      cards.push(card(p.unit, p.tail || "。"));
    }
  }
  if (weakBuf.length && cards.length) {
    const c = cards[cards.length - 1];
    c.down = c.down + "，" + weakBuf.join("，");
  }
  return cards.filter((c) => c.down && c.down.trim() && c.up && c.up.trim());
}

export const XINJING_NOTES = [
  {
    fields: {
      篇目: "心經 · 般若波羅蜜多心經 · 玄奘譯",
      标题: "般若波羅蜜多心經",
      上句: "",
      下句: "",
      原文: XINJING_FULL,
      译文: "",
      注释: "",
      赏析: XINJING_APPRECIATION,
      链接: XINJING_META.sourceUrl,
    },
    tags: ["心經", "赏析"],
    deckPath: "心經::赏析",
    guidSeed: "xinjing:appreciate",
  },
  ...XINJING_SECTIONS.map((sec, i) => ({
    fields: {
      篇目: `心經 · 背句 ${String(i + 1).padStart(2, "0")}`,
      标题: `背句 ${String(i + 1).padStart(2, "0")}`,
      上句: XINJING_PROMPTS[i],
      下句: sec,
      原文: "",
      译文: "",
      注释: "",
      赏析: "",
      链接: "",
    },
    tags: ["心經", "背诵"],
    deckPath: "心經::背诵",
    guidSeed: `xinjing:recite:${String(i + 1).padStart(2, "0")}`,
  })),
];

export const JINGANGJING_NOTES = JINGANGJING_PARTS.flatMap((part) => {
  const no = String(part.no).padStart(2, "0");
  const base = {
    fields: {
      篇目: `金剛經 · ${part.name} · ${part.digest}`,
      标题: `${part.name}`,
      上句: "",
      下句: "",
      原文: part.text,
      译文: "",
      注释: "",
      赏析: `「${part.digest}」。${PART_APPRECIATIONS[part.no] ?? ""}`,
      链接: JINGANGJING_META.sourceUrl,
    },
    tags: ["金剛經", "赏析"],
    deckPath: `金剛經::赏析::${no} ${part.name}`,
    guidSeed: `jingangjing:${no}:appreciate`,
  };
  const recite = recitePairs(part.text).map((c, idx) => ({
    fields: {
      篇目: `金剛經 · ${part.name} · 背句 ${String(idx + 1).padStart(2, "0")}`,
      标题: `${part.name} · 背句 ${String(idx + 1).padStart(2, "0")}`,
      上句: c.up,
      下句: c.down,
      原文: "",
      译文: "",
      注释: "",
      赏析: "",
      链接: "",
    },
    tags: ["金剛經", "背诵"],
    deckPath: `金剛經::背诵::${no} ${part.name}`,
    guidSeed: `jingangjing:${no}:recite:${String(idx + 1).padStart(2, "0")}`,
  }));
  return [base, ...recite];
});

export const FOJING_NOTES = [...XINJING_NOTES, ...JINGANGJING_NOTES];
