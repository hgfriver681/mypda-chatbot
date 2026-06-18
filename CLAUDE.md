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
6. 語音聊天 / Voice chat（header 按鈕 + 聊天輸入框按鈕）
7. Header「切換臨時聊天 / Toggle temporary chat」
8. 全平台 ambient 動畫（light rays + particles；在 LightRays/Particles 元件本身關閉，涵蓋聊天閒置、/mcp、archive、auth-error、export 預覽）
9. Tools 下拉選單：工作流、智慧體（沿用 1、3 的旗標）、生成圖片、預設、網頁搜尋、Code Execution、HTTP Request

> 未來要復原某項功能或變動 UI 時，先讀 `docs/DISABLED_FEATURES.md` 確認它是被
> 「刻意隱藏」而非不存在；改動後務必同步更新該檔與旗標的 status。

## 自訂功能（與上游不同處）

- Memory（myPDA MCP 併入）、Files UI、聊天存進 Memory、search_memory 動畫等，
  詳見專案外部記憶筆記。
- Sidebar 結構（Plan B：以 MCP server 為主軸 + 使用者可編輯分組 + 收合）：
  - `src/components/layouts/app-sidebar-mcp.tsx`：頂層只有「新聊天 / MCP 伺服器 / Admin」；
    其餘一律是 MCP server 的面板。server 依使用者自訂 `category` 分組（單層、自由命名，
    `未分組` 排最後），**群組可收合、server 也可收合**。`SERVER_PANELS`（依 server name）
    把 Files 掛在 `datapilot-pdf`、Memories/Requests/API Keys 掛在 `mypda-memory`；
    沒有面板的 server 直接連到 `/mcp/test/<id>`。（舊的 `app-sidebar-memory.tsx` 已移除。）
  - 分組資料：`mcp_server` 新增 `category text`（nullable，migration `0017_*`，已 push
    Supabase）。型別見 `app-types/mcp`（MCPServerInfo/Select/Insert 的 `category`）。
    **`save()` 不碰 category**；改用 `updateMcpCategoryAction` / `mcpRepository.updateCategory`
    單獨更新（避免存 config 時誤清空）。
  - 編輯入口：每張 MCP 卡片名稱旁的「群組」按鈕（`mcp-card.tsx` 的 `CategoryEditor`，
    popover + datalist 建議現有群組，owner 限定）。i18n：`MCP.group/ungrouped/groupPlaceholder`、
    `Layout.mcpServers`。
- 列表分頁：`src/components/memory/list-pager.tsx`（`usePagination` hook + `ListPager`
  元件，client-side 切片，每頁 10/25/50/100 可選），用於 Memories 與 Requests；
  筆數 ≤10 時自動隱藏分頁列。
- 品牌：左上角改為 `public/myPDA-logo.png` + 「myPDA」字樣（取代 "better-chatbot"），
  見 `src/components/layouts/app-sidebar.tsx` 的 `SidebarHeaderShared title`。
- i18n：新增 `messages/zh-TW.json`（繁體中文，由 `messages/zh.json` 經 opencc
  `s2twp` 轉換）。`SUPPORTED_LOCALES` 已移除所有國旗 emoji；平台預設語系
  `DEFAULT_LOCALE = "zh-TW"`（見 `src/lib/const.ts`）。`getLocaleAction` 改為
  cookie 優先、否則回 `DEFAULT_LOCALE`，**不再用瀏覽器 Accept-Language 自動偵測**，
  讓預設語系確定是繁中。
- MCP 範本與下載（部署模型 demo）：平台只當 MCP **client**，不託管客戶程式碼；
  客戶下載範本 →自己 host →回 UI 填 URL+Key →連線測試。
  - 範本原始碼在 `mcp-templates/{typescript,python}/`（各自獨立專案，含 Dockerfile +
    docker-compose + `.env.example` + README + CLAUDE.md，4 個 demo 工具
    ping/echo/server_time/add，Streamable HTTP 走 `POST /mcp`、stateless、Bearer
    `MCP_API_KEY` 預設 `demo-key`、port 8787）。兩包都已實機啟動驗證過。
  - 打包下載檔在 `public/mcp-templates/mypda-mcp-{typescript,python}.zip`，由
    `scripts/build-mcp-templates.sh` 從上述原始碼重生（改範本後要重跑）。
  - `/mcp` 頁右上「下載 MCP 範本」下拉（`mcp-dashboard.tsx`，i18n key
    `MCP.downloadTemplate`）連到那兩個 zip；推薦清單（`mcp-overview.tsx`
    `RECOMMENDED_MCPS`）多了「myPDA 範本」一鍵帶入 `localhost:8787/mcp` + demo-key。
  - 適用：UI 與 MCP 同側（都內網／都外網）即開箱即用；雲端 UI 打內網 MCP 不支援
    （請客戶自己開 tunnel）。
  - 工具測試頁（`src/app/(chat)/mcp/test/[id]/page.tsx`）：移除「用 AI 建立輸入」，
    改為**從 inputSchema 自動帶入可運行範例**（純前端、零 AI）。優先序
    `examples[0] → default → const → enum[0] → 型別佔位`；有作者範例就用真值、否則
    給可填型別模板並標示「依型別產生」提示，永不留空白框。附「帶入範例 / 清空」兩鈕。
    範本工具用 `Field(examples=[...])`（Python）把可運行範例帶進 schema。
  - 註記：`mcp-templates/` 已從 `tsconfig.json` 與 `biome.json` 排除（各為獨立子專案，
    不納入主 app 的 typecheck/lint；改範本後用 `scripts/build-mcp-templates.sh` 重打包）。

最後更新：2026-06-18
