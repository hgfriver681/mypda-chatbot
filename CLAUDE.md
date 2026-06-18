# CLAUDE.md

Guidance for Claude Code when working in this repo (a fork of better-chatbot,
customized for river's private deployment).

## 注意事項

- 不要使用 emoji
- 建立新檔案前先詢問使用者
- 只在使用者明確要求時 commit；預設不 push

## 本機開發（dev server）

`.env.dev.local` 不是 Next 標準檔名，Next 不會自動載入，必須用 dotenv-cli 先灌進
process.env：

```bash
./node_modules/.bin/dotenv -e .env.dev.local -- ./node_modules/.bin/next dev -p 9402
```

直接 `pnpm dev`(= `next dev`) 只會讀 `.env` 的 placeholder → Postgres `auth_failed`。
資料庫指向 Supabase（Session pooler）；測試帳號 `river.test@local.dev`。

## 已關閉 / 隱藏的 UI 功能（重要）

本 fork 依產品決策**隱藏**了部分上游 UI（不是刪除，只是不顯示，可復原）。
完整清單、位置與復原方式見 **`docs/DISABLED_FEATURES.md`**，並預計用
`src/lib/ui-flags.ts` 的旗標集中控制（flip 回 `true` 即復原）。

目前清單（2026-06-18）：

1. Sidebar「工作流 / Workflow」連結
2. Sidebar「封存 / 归档 / Archive」區塊
3. Sidebar「智能體 / Agents」列表 + 「創建智能體 / Create an agent」卡片
4. User menu「報告問題 / Report an issue」
5. User menu「加入社區 / Join community」
6. Header「切換語音聊天 / Toggle voice chat」
7. Header「切換臨時聊天 / Toggle temporary chat」

> 未來要復原某項功能或變動 UI 時，先讀 `docs/DISABLED_FEATURES.md` 確認它是被
> 「刻意隱藏」而非不存在；改動後務必同步更新該檔與旗標的 status。

## 自訂功能（與上游不同處）

- Memory（myPDA MCP 併入）、Files UI、聊天存進 Memory、search_memory 動畫等，
  詳見專案外部記憶筆記。
- i18n：新增 `messages/zh-TW.json`（繁體中文，由 `messages/zh.json` 經 opencc
  `s2twp` 轉換）。`SUPPORTED_LOCALES` 已移除所有國旗 emoji；平台預設語系
  `DEFAULT_LOCALE = "zh-TW"`（見 `src/lib/const.ts`）。`getLocaleAction` 改為
  cookie 優先、否則回 `DEFAULT_LOCALE`，**不再用瀏覽器 Accept-Language 自動偵測**，
  讓預設語系確定是繁中。

最後更新：2026-06-18
