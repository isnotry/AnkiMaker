/* app.js —— AnkiMaker 站点逻辑
 *
 * 依赖：vendor/sql-wasm.js（initSqlJs）、vendor/jszip.min.js（JSZip）、
 *       vendor/ankicore.js（AnkiCore.buildApkg / GUWEN_MODEL / downloadApkg）、
 *       data.js（window.ANKI_MAKER_DATA）
 *
 * 功能：选书+卡型 → 预览（模板渲染，日/夜）→ 浏览器内生成 .apkg 下载；
 *       模板编辑器（localStorage 持久化）；模板/数据 JSON 导入导出。
 */

(() => {
  "use strict";
  const D = window.ANKI_MAKER_DATA;
  const LS_MODEL = "ankimaker:model";

  /* ---------- 模板渲染（支持 {{字段}} 与 {{#字段}}…{{/字段}} 条件块） ---------- */
  function renderTemplate(tpl, fields) {
    let s = String(tpl ?? "");
    s = s.replace(/\{\{#([\u4e00-\u9fff\w]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, name, body) =>
      String(fields[name] ?? "").trim() ? renderTemplate(body, fields) : ""
    );
    s = s.replace(/\{\{([\u4e00-\u9fff\w]+)\}\}/g, (_, name) => String(fields[name] ?? ""));
    return s;
  }

  /* ---------- 模型（默认 + localStorage 编辑版） ---------- */
  function defaultModel() {
    return JSON.parse(JSON.stringify(AnkiCore.GUWEN_MODEL));
  }
  function loadModel() {
    try {
      const raw = localStorage.getItem(LS_MODEL);
      if (raw) {
        const m = JSON.parse(raw);
        if (m && m.tmpls && m.flds) return m;
      }
    } catch (e) { /* ignore */ }
    return defaultModel();
  }
  function saveModel(model) { localStorage.setItem(LS_MODEL, JSON.stringify(model)); }
  let MODEL = loadModel();

  /* ---------- 状态 ---------- */
  const books = D.books;
  const cardTypesOf = (bookId) =>
    D.notes[bookId].filter((n) => n.f[2]).length > 0 ? (D.notes[bookId].filter((n) => n.f[4]).length > 0 ? ["背诵", "理解"] : ["背诵"]) : ["理解"];
  // 每本书勾选的卡型（默认全部）
  const selection = {};
  for (const b of books) selection[b.id] = cardTypesOf(b.id).slice();

  /* ---------- 数据过滤 ---------- */
  // 卡型语义：背诵 = 笔记带「背诵」tag（上句→下句/全诗）；理解/赏析 = 非背诵且原文非空（原文→题解/译文/赏析）
  function filterNotes(bookId) {
    const types = selection[bookId] ?? [];
    return D.notes[bookId].filter((n) => {
      const tags = n.t ?? [];
      const isRecite = tags.includes("背诵");
      const isUnder = !!(n.f["原文"] && n.f["原文"].trim()) && !isRecite;
      if (types.includes("背诵") && types.includes("理解")) return true;
      if (types.includes("背诵")) return isRecite;
      if (types.includes("理解")) return isUnder;
      return false;
    });
  }
  function toNote(n) { return { fields: n.f, tags: n.t, deckPath: n.d, guidSeed: n.g }; }

  /* ---------- 书卡渲染 ---------- */
  const booksEl = document.getElementById("books");
  function renderBooks() {
    booksEl.innerHTML = "";
    for (const b of books) {
      const card = document.createElement("div");
      card.className = "book selected";
      const stats = Object.entries(b.stats).map(([k, v]) => `<span>${k} ${v}</span>`).join("");
      const types = cardTypesOf(b.id).map((t) =>
        `<label><input type="checkbox" data-book="${b.id}" data-type="${t}" ${selection[b.id].includes(t) ? "checked" : ""}> ${t === "理解" ? "赏析" : t}卡</label>`
      ).join("");
      card.innerHTML = `
        <h3>${b.name}</h3>
        <p class="sub">${b.subtitle}</p>
        <div class="stats">${stats}</div>
        <div class="types">${types}</div>`;
      card.addEventListener("click", (e) => {
        if (e.target.matches('input[type="checkbox"]')) return;
        const sel = !card.classList.contains("selected");
        card.classList.toggle("selected", sel);
        card.querySelectorAll('input[type="checkbox"]').forEach((c) => (c.checked = sel));
        if (sel) selection[b.id] = cardTypesOf(b.id).slice();
        else selection[b.id] = [];
      });
      card.querySelectorAll('input[type="checkbox"]').forEach((cb) =>
        cb.addEventListener("change", () => {
          const t = cb.dataset.type;
          if (cb.checked && !selection[b.id].includes(t)) selection[b.id].push(t);
          if (!cb.checked) selection[b.id] = selection[b.id].filter((x) => x !== t);
          card.classList.toggle("selected", selection[b.id].length > 0);
          refreshPreviewBookOptions();
        })
      );
      booksEl.appendChild(card);
    }
  }

  /* ---------- 预览 ---------- */
  const previewBook = document.getElementById("preview-book");
  const previewNote = document.getElementById("preview-note");
  function refreshPreviewBookOptions() {
    const cur = previewBook.value;
    previewBook.innerHTML = "";
    for (const b of books) {
      const opt = document.createElement("option");
      opt.value = b.id; opt.textContent = b.name;
      previewBook.appendChild(opt);
    }
    if ([...previewBook.options].some((o) => o.value === cur)) previewBook.value = cur;
    refreshPreviewNoteOptions();
  }
  function refreshPreviewNoteOptions() {
    const list = filterNotes(previewBook.value);
    const cur = previewNote.value;
    previewNote.innerHTML = "";
    list.forEach((n, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = n.f["标题"] || n.f["篇目"];
      previewNote.appendChild(opt);
    });
    if (list.length && [...previewNote.options].some((o) => o.value === cur)) previewNote.value = cur;
    renderPreview();
  }
  function renderPreview() {
    const list = filterNotes(previewBook.value);
    const n = list[Number(previewNote.value)] ?? list[0];
    const frontEl = document.getElementById("preview-front");
    const backEl = document.getElementById("preview-back");
    if (!n) { frontEl.innerHTML = "（无符合条件的笔记）"; backEl.innerHTML = ""; return; }
    const reciteTmpl = MODEL.tmpls.find((t) => t.ord === 0);
    const underTmpl = MODEL.tmpls.find((t) => t.ord === 1);
    const isRecite = n.f["上句"] && n.f["上句"].trim();
    const isUnder = n.f["原文"] && n.f["原文"].trim();
    const cards = [];
    if (isRecite) cards.push(reciteTmpl);
    if (isUnder) cards.push(underTmpl);
    if (!cards.length) cards.push(reciteTmpl);
    frontEl.innerHTML = renderTemplate(cards[0].qfmt, n.f);
    backEl.innerHTML = renderTemplate(cards[0].afmt, n.f);
  }
  previewBook.addEventListener("change", refreshPreviewNoteOptions);
  previewNote.addEventListener("change", renderPreview);
  document.getElementById("preview-night").addEventListener("change", (e) => {
    document.querySelectorAll(".anki-card").forEach((el) => el.classList.toggle("night", e.target.checked));
  });

  /* ---------- 生成 ---------- */
  const btnGen = document.getElementById("btn-generate");
  const genResult = document.getElementById("gen-result");
  btnGen.addEventListener("click", async () => {
    btnGen.disabled = true;
    btnGen.textContent = "正在生成…";
    genResult.hidden = true;
    try {
      const meta = { generatedAt: new Date().toISOString().slice(0, 10), source: "", sourceUrl: "" };
      const selectedBooks = books.filter((b) => (selection[b.id] ?? []).length > 0);
      if (!selectedBooks.length) { alert("请至少选择一本书"); return; }
      let notes = [];
      for (const b of selectedBooks) notes = notes.concat(filterNotes(b.id).map(toNote));
      const deckPaths = [...new Set(notes.map((n) => n.deckPath))];
      const decks = [];
      const tops = new Set(selectedBooks.map((b) => (b.id === "xiaoyaoyou" ? "庄子" : b.name)));
      for (const t of tops) decks.push({ path: t });
      if (selectedBooks.some((b) => b.id === "xiaoyaoyou")) decks.push({ path: "庄子::逍遥游" });
      for (const p of deckPaths) decks.push({ path: p });
      meta.source = selectedBooks.map((b) => b.name).join("、");
      meta.sourceUrl = selectedBooks.map((b) => b.sourceUrl).join("\n");

      const SQL = await window.initSqlJs({ locateFile: (f) => "vendor/" + f });
      const r = await AnkiCore.buildApkg({
        SQL, JSZip,
        model: MODEL,
        notes,
        decks,
        media: {},
        meta,
      });

      // 自检：回读刚生成的包，确认 dconf 为 Anki 2.1.x 嵌套结构（new/reviews/lapses）。
      // 若浏览器仍缓存旧版 ankicore.js，会生成扁平 dconf，导入 Anki 会报
      // "missing field `new`"——此时拒绝下载并提示硬刷新。
      let dconfOk = false;
      try {
        const zip = await JSZip.loadAsync(r.bytes);
        const anki2 = await zip.file("collection.anki2").async("uint8array");
        const db = new SQL.Database(anki2);
        const row = db.exec("SELECT dconf FROM col");
        const dconf = JSON.parse(row[0].values[0][0]);
        const cfg = dconf["1"];
        dconfOk = cfg && cfg.new && cfg.rev && cfg.lapse;
        db.close();
      } catch (e) { /* 自检失败按不通过处理 */ }
      if (!dconfOk) {
        genResult.hidden = false;
        genResult.innerHTML = `<span style="color:#a33">检测到浏览器缓存了旧版生成核心，下载的包无法被 Anki 导入。请按 Cmd+Shift+R 强制刷新本页后重试。</span>`;
        return;
      }

      const name = (document.getElementById("filename").value || "guwen-cards.apkg").trim();
      AnkiCore.downloadApkg(r.bytes, name.endsWith(".apkg") ? name : name + ".apkg");
      genResult.hidden = false;
      genResult.innerHTML = `已生成 <b>${r.noteCount}</b> 条笔记 / <b>${r.cardCount}</b> 张卡 / <b>${r.deckCount}</b> 个牌组（${(r.bytes.byteLength / 1024).toFixed(0)} KB），已开始下载 <code>${name}</code>。导入 Anki 后即可复习。`;
    } catch (err) {
      genResult.hidden = false;
      genResult.innerHTML = `<span style="color:#a33">生成失败：${err?.message ?? err}</span>`;
    } finally {
      btnGen.disabled = false;
      btnGen.textContent = "生成 .apkg 并下载";
    }
  });

  /* ---------- 模板编辑器 ---------- */
  const ed = {
    reciteQ: document.getElementById("ed-recite-q"),
    reciteA: document.getElementById("ed-recite-a"),
    underQ: document.getElementById("ed-under-q"),
    underA: document.getElementById("ed-under-a"),
    css: document.getElementById("ed-css"),
  };
  function fillEditor() {
    const recite = MODEL.tmpls.find((t) => t.ord === 0);
    const under = MODEL.tmpls.find((t) => t.ord === 1);
    ed.reciteQ.value = recite.qfmt;
    ed.reciteA.value = recite.afmt;
    ed.underQ.value = under.qfmt;
    ed.underA.value = under.afmt;
    ed.css.value = MODEL.css;
  }
  document.getElementById("btn-model-save").addEventListener("click", () => {
    const recite = MODEL.tmpls.find((t) => t.ord === 0);
    const under = MODEL.tmpls.find((t) => t.ord === 1);
    recite.qfmt = ed.reciteQ.value;
    recite.afmt = ed.reciteA.value;
    under.qfmt = ed.underQ.value;
    under.afmt = ed.underA.value;
    MODEL.css = ed.css.value;
    saveModel(MODEL);
    renderPreview();
    alert("模板已保存（生成时生效，存于本浏览器）。");
  });
  document.getElementById("btn-model-reset").addEventListener("click", () => {
    MODEL = defaultModel();
    saveModel(MODEL);
    fillEditor();
    renderPreview();
    alert("已恢复默认模板。");
  });
  fillEditor();

  /* ---------- 模板/数据 导入导出 ---------- */
  document.getElementById("btn-export").addEventListener("click", () => {
    const selectedBooks = books.filter((b) => (selection[b.id] ?? []).length > 0);
    const payload = {
      kind: "ankimaker-config",
      version: D.version,
      exportedAt: new Date().toISOString(),
      model: MODEL,
      books: selectedBooks.map((b) => b.id),
      notes: {},
    };
    for (const b of selectedBooks) payload.notes[b.id] = filterNotes(b.id).map(toNote);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ankimaker-config.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  });
  const importFile = document.getElementById("import-file");
  document.getElementById("btn-import").addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", async () => {
    const file = importFile.files[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload.kind !== "ankimaker-config" || !payload.model) throw new Error("不是有效的 AnkiMaker 配置文件");
      MODEL = payload.model;
      saveModel(MODEL);
      fillEditor();
      renderPreview();
      const cnt = Object.values(payload.notes ?? {}).reduce((a, b) => a + b.length, 0);
      alert(`已导入配置：模板 + ${cnt} 条笔记（选中书籍 ${(payload.books ?? []).join("、")}）。`);
    } catch (err) {
      alert(`导入失败：${err?.message ?? err}`);
    } finally {
      importFile.value = "";
    }
  });

  /* ---------- 启动 ---------- */
  renderBooks();
  refreshPreviewBookOptions();
})();
