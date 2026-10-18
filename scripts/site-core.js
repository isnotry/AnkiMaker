// site-core.js —— 浏览器版生成核心入口（被 esbuild 打包为 IIFE：window.AnkiCore）
// 与 Node 侧共用 src/anki/* 与 src/model/guwen.js 同一份源码。

export { buildApkg, downloadApkg } from "../src/anki/index.js";
export { GUWEN_MODEL } from "../src/model/guwen.js";
