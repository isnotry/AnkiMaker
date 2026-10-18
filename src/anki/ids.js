// ids.js —— 稳定标识：guid / 牌组 id / sha1 / csum
//
// 设计原则（ADR-3/4）：一切 id 只由「稳定身份」派生，不依赖译文/生成时间等可变内容，
// 重新生成时同一条目永远得到同一 guid / 牌组 id → 增量更新不丢复习记录。
// 浏览器与 Node 共用（不依赖 node:crypto）。

// Anki base91 字符集（libanki stdb64）
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{};:'\",.<>/?\\|~";

/** FNV-1a 64 位散列（BigInt） */
export function fnv1a64(str) {
  const PRIME = 0x100000001b3n;
  const OFFSET = 0xcbf29ce484222325n;
  let h = OFFSET;
  const bytes = new TextEncoder().encode(str);
  for (const b of bytes) {
    h ^= BigInt(b);
    h = (h * PRIME) & 0xffffffffffffffffn;
  }
  return h;
}

/** 64 位散列 → 8 字符 base91（Anki guid 惯例长度） */
export function base91Guid(hash) {
  let n = hash;
  let out = "";
  for (let i = 0; i < 8; i++) {
    out = ALPHABET[Number(n % 91n)] + out;
    n /= 91n;
  }
  return out;
}

/** 稳定 guid：stableGuid("daodejing:01:recite:01") → 8 字符，恒定不变 */
export function stableGuid(seed) {
  return base91Guid(fnv1a64(seed));
}

/** 稳定牌组 id（Anki deck id 为整数）：由牌组名派生，重复生成不产生重复牌组 */
export function stableDeckId(name) {
  // 取 64 位散列的低 48 位 → 14 位十进制，符号稳定为正数
  const h = fnv1a64(name) & 0xffffffffffffn;
  return Number(h % 100000000000000n);
}

/**
 * 标准 SHA-1（纯 JS，Node 与浏览器共用）。
 * 用于 Anki 卡片 csum：\x1f 拼接字段、截取前 500 字符、sha1 前 8 位 hex 转整数。
 */
export function sha1(str) {
  const bytes = new TextEncoder().encode(str);
  const ml = bytes.length * 8;
  // 补齐：0x80 + 0 填充 + 64 位长度
  const msg = new Uint8Array((((bytes.length + 8) >> 6) + 1) << 6);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  const dv = new DataView(msg.buffer);
  dv.setUint32(msg.length - 4, Math.floor(ml / 0x100000000), false);
  dv.setUint32(msg.length - 8, ml >>> 0, false);

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  for (let i = 0; i < msg.length; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4, false);
    for (let j = 16; j < 80; j++) {
      w[j] = (w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]);
      w[j] = (w[j] << 1) | (w[j] >>> 31);
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let j = 0; j < 80; j++) {
      let f, k;
      if (j < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (j < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const tmp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) >>> 0;
      e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = tmp;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  const hex = (n) => n.toString(16).padStart(8, "0");
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4);
}

/** Anki 笔记 csum：\x1f 拼字段截 500 字 → sha1 前 8 位 hex → 整数 */
export function cardCsum(fieldValues) {
  const joined = fieldValues.join("\x1f").slice(0, 500);
  return parseInt(sha1(joined).slice(0, 8), 16);
}
