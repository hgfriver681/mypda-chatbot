# 技能平台 — 架構對應與實作 Roadmap

> 用途：把研究結論落到 myPDA 既有架構，排出到「基本殼 + demo」的路徑，並給 Workshop
> 教學階梯。依 MEETING-NOTES.md 的決策（提示注入 / Postgres + S3）。最後更新：2026-06-20。

## 1. 複用既有架構（研究 ↔ 程式碼）

| 模組 | 複用 myPDA 既有 | 對應檔案 |
|---|---|---|
| M1 分組 | MCP sidebar 的 `category` 分組（扁平、可改名） | migration `0017_lean_ultimatum.sql`；`mcpRepository.updateCategory/renameCategory`；`src/components/layouts/app-sidebar-mcp.tsx` |
| M2 zip 上傳 / 下載 | MCP 範本 zip 打包與下載流 + S3 file-storage | `scripts/build-mcp-templates.sh`；`public/mcp-templates/*.zip`；`src/lib/file-storage/` |
| M3 版本 | `skills-lock.json` 的 `computedHash` + repository pattern | `skills-lock.json`；`src/lib/db/pg/repositories/*` |
| M4 打包 | 「快照」思路 + 範本打包腳本 | `chat_export` 快照模式；`scripts/build-mcp-templates.sh` |
| 呼叫 / 執行 | system prompt 注入機制 | `mergeSystemPrompt`、`src/app/api/chat/shared.chat.ts`、`@mention` |

## 2. 資料模型（鏡像 `mcp_server`）

新增三張表（皆走既有 Drizzle + repository pattern）：

- `skill` — `id, name, description, version (semver text), category (nullable),
  manifest (jsonb), storage_key (S3 的 zip 鍵), content_hash, enabled, user_id,
  visibility, created_at, updated_at`。
- `skill_version` — `id, skill_id, version, storage_key, content_hash, changelog,
  created_at`（版本史；對應 M3）。
- `skill_bundle` — `id, name, description, member_skill_ids (jsonb 陣列), lock
  (jsonb：成員的確切版本 + 雜湊), user_id, created_at`（對應 M4；仿 extensionPack /
  .difybndl，成員間零功能耦合）。

zip 本體放 S3（`file-storage`），metadata 放 Postgres。`save()` 不碰 category（沿用
MCP 表的教訓，用獨立 `updateCategory` 更新，避免存其他欄位時誤清空）。

## 3. 執行語意（ADR-1：提示注入）

- 註冊時只保存 `name + description`（永遠在 context，progressive disclosure 的第一層）。
- 使用者在聊天用 `@mention` 或右下角呼叫區觸發 → 載入該技能 SKILL.md 內文 → 經
  `mergeSystemPrompt` 注入該回合的 system prompt。
- 未觸發的技能只佔 name + description 的 token，內文與資源留在 S3 / DB 不載入。
- 後續擴充（demo 後）：允許技能含可執行腳本或綁 MCP 工具（ADR-1 標註為後續）。

## 4. 實作 Roadmap（約 5 個工作天，每階段都可展示）

- **Phase 0｜地基（0.5–1 天）**：`skill` / `skill_version` / `skill_bundle` migration；
  repository；S3 zip 存取；SKILL.md frontmatter 解析 + zod 驗證（Validation-on-upload）。
- **Phase 1｜M1 基本操作（1 天）**：`/skills` 頁 —— 列表、依 `category` 分組（複用 MCP
  UI）、新增 / 移除、下載 zip。左側面板掛入口。
- **Phase 2｜M2 上傳 / 更新（1 天）**：拖 zip 上傳 → 解析 → 驗證 → 入庫；同名更高版 = 升級。
- **Phase 3｜M3 版本 / 修改（1 天）**：semver 自動升版 + 版本史；rename；站內編輯
  SKILL.md（enhancement，教學感最強）。
- **Phase 4｜M4 標準技能組（0.5–1 天）**：勾選 N 個技能 → 產生 bundle zip（含成員 +
  manifest 清單）→「安裝技能組」一鍵展開註冊。
- **Phase 5｜呼叫 + 收尾（0.5 天）**：右下角呼叫區 / `@mention` 觸發 → 注入 chat；demo
  腳本 + 5 個標準基本技能種子。

## 5. Demo 故事線（上台用）

上傳一個技能 → 分組 → 在聊天 `@` 呼叫它生效 → 站內編輯強化（M3）→ 升版 → 把 5 個技能
打包成「標準組」一鍵安裝（M4）。剛好走完四個模組。

## 6. 教學階梯（四模組 ↔ 業界類比）

- M1（CRUD + 分組）↔ npm install / VS Code categories。
- M2（upload / update）↔ `.vsix` / `.difypkg` 安裝。
- M3（semver / 版本）↔ semver.org 的 MAJOR / MINOR / PATCH 契約。
- M4（bundle）↔ VS Code Extension Pack + Dify `.difybndl`（金句：pack 與成員零耦合）。

「讓使用者從基本技能延伸做 extension」的最佳載體 = M3 站內編輯 + M4 打包：現場改一個
SKILL.md、升版、再打包成自己的標準組。

## 7. 風險與待辦

- Demo 死線日期待確認（見 MEETING-NOTES.md §5）。
- 上傳安全：zip 解壓需防 path traversal / zip bomb；驗證在執行前完成。
- 權限模型：技能可見性（private / public）沿用 mcp_server visibility 慣例。
- i18n：新頁面字串走 messages/zh-TW.json，無裸字串。
