#!/usr/bin/env bash
# 從 mcp-templates/{typescript,python}/ 原始碼重新打包成可下載的 zip，
# 輸出到 public/mcp-templates/。改動範本後重跑此腳本即可更新下載檔。
# 會排除 build 產物與機密（node_modules / dist / .venv / __pycache__ / .env）。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/mcp-templates"
OUT="$ROOT/public/mcp-templates"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$OUT"

pack() {
  local lang="$1"          # typescript | python
  local pkg="mypda-mcp-$lang"
  rm -rf "$STAGE/$pkg"
  cp -r "$SRC/$lang" "$STAGE/$pkg"
  # 清掉 build 產物、虛擬環境、各種 cache 與機密（保留 .env.example）
  find "$STAGE/$pkg" \
    \( -name node_modules -o -name dist -o -name build \
       -o -name '.venv' -o -name 'venv' -o -name __pycache__ \
       -o -name '*.egg-info' -o -name '.uv*' -o -name '.pytest_cache' \
       -o -name '.mypy_cache' -o -name '.ruff_cache' \) \
    -prune -exec rm -rf {} + 2>/dev/null || true
  find "$STAGE/$pkg" -name '.env' -delete 2>/dev/null || true
  rm -f "$OUT/$pkg.zip"
  ( cd "$STAGE" && zip -rq "$OUT/$pkg.zip" "$pkg" )
  echo "packed: public/mcp-templates/$pkg.zip"
}

pack typescript
pack python
echo "done."
