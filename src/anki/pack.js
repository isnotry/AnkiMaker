// pack.js —— JSZip 打包：collection.anki2 + media → .apkg 字节
//
// Anki 2.1.x .apkg = zip（collection.anki2 + media[ + meta.json]）。

/**
 * @param {Uint8Array} anki2Bytes  sql.js 导出的数据库字节
 * @param {Record<string, Uint8Array>} media  媒体映射 {文件名: 内容}
 * @param {JSZip} JSZip  jszip 构造器（依赖注入，浏览器/Node 通用）
 */
export async function packApkg(anki2Bytes, media, JSZip) {
  const zip = new JSZip();
  zip.file("collection.anki2", anki2Bytes);
  // media 文件：文件名必须是 media 映射中的键（如 "0"），并附带 JSON 索引
  if (media && Object.keys(media).length > 0) {
    const index = {};
    Object.keys(media).forEach((key, i) => { index[i] = key; });
    zip.file("media", JSON.stringify(index));
    for (const [key, bytes] of Object.entries(media)) zip.file(key, bytes);
  } else {
    zip.file("media", "{}");
  }
  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
