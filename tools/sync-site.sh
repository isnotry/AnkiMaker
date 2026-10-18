#!/usr/bin/env bash
# =========================================================
# sync-site —— 把 site/ 同步到 docs/（GitHub Pages 发布目录）
#
# 为什么要同步：Pages 用 legacy 模式从 main 分支的 /docs 目录发布，
# 而站点源码放在 site/（与 src/ scripts/ 分层清晰）。两份要保持一致。
#
# 用法:
#   bash tools/sync-site.sh          # 只在有变化时同步并提交
#   bash tools/sync-site.sh --check  # 只检查有无差异（CI/部署前用）
# =========================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/site"
DST="$ROOT/docs"

[ -d "$SRC" ] || { echo "找不到 site/ 目录" >&2; exit 1; }
[ -f "$SRC/index.html" ] || { echo "site/index.html 不存在，站点不完整" >&2; exit 1; }

# ---- 1. 记录同步前的状态 ----
BEFORE="$(shasum "$DST"/index.html "$DST"/app.js "$DST"/styles.css "$DST"/data.js "$DST"/og-image.png 2>/dev/null | shasum | cut -d' ' -f1 || true)"

# ---- 2. 同步（先清再拷，避免删掉的文件残留）----
mkdir -p "$DST"
# 站点产物：index.html / app.js / styles.css / data.js / og-image.png / vendor/
# 注意 docs/screenshot.png 是 README 配图，**不在同步范围内**
for f in index.html app.js styles.css data.js og-image.png; do
  cp "$SRC/$f" "$DST/$f"
done
rm -rf "$DST/vendor"
cp -R "$SRC/vendor" "$DST/vendor"

AFTER="$(shasum "$DST"/index.html "$DST"/app.js "$DST"/styles.css "$DST"/data.js "$DST"/og-image.png 2>/dev/null | shasum | cut -d' ' -f1)"

if [ "$BEFORE" = "$AFTER" ]; then
  echo "✓ docs/ 与 site/ 已一致，无需同步"
  exit 0
fi

echo "✓ 已同步 site/ → docs/"
du -sh "$DST" | awk '{print "  docs/ 体积: " $1}'

# ---- 3. --check 模式到此为止 ----
if [ "${1:-}" = "--check" ]; then
  echo "✗ docs/ 与 site/ 不一致（--check 模式不提交）"
  exit 1
fi

# ---- 4. 提交并推送 ----
cd "$ROOT"
git add docs/
if git diff --cached --quiet; then
  echo "  （内容无实质变化，跳过提交）"
  exit 0
fi
git -c user.name="isnotry" -c user.email="isnotry@users.noreply.github.com" \
    commit -q -m "ci: 同步 site/ → docs/（Pages 发布目录）

Pages 用 legacy 模式从 main 分支的 /docs 发布，site/ 是站点源码。
两处保持一致，改完站点跑一次 bash tools/sync-site.sh。"
git push origin main
echo "✓ 已提交并推送，Pages 约 1-2 分钟后重建"
