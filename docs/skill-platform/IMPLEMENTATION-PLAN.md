# 技能平台 — 實作藍圖（怎麼做）

> 用途：把概念落到「實際要寫哪些檔案、用什麼順序」。建立在 Phase 0 地基（skill /
> skill_version / skill_bundle 表 + repositories + SkillManifestSchema）之上。依 ADR：
> 提示注入 + Postgres + S3 + agentskills.io 開放標準。最後更新：2026-06-20。

## 1. 一句話策略

先用 tracer-bullet 打通一條最小垂直線（upload → parse → store → list → invoke），
證明整條管線會動；再把這條線加厚成 M1–M4。不要先把單一模組做到完美。

## 2. 資料流（端到端）

上傳 zip → 解析 + 驗證 frontmatter（SkillManifestSchema）→ 算 contentHash → zip 存 S3、
metadata 存 Postgres（skill + skill_version）→ `/skills` 列表（依 category 分組）→ 在聊天
以 @mention 或右下角呼叫區觸發 → 載入 SKILL.md 本文，經 mergeSystemPrompt 注入該回合
system prompt。

## 3. 要新增的三層（對應既有架構）

### 3.1 Service 層 — `src/lib/skills/`
- `skill-package.ts`（pure-helper，可單測）：解 zip → 找 `<name>/SKILL.md` → 解 YAML
  frontmatter → `SkillManifestSchema.parse` → 算 sha256(zip) → 安全檢查（強制資料夾在
  zip 根、擋 path traversal / zip bomb）。回傳 `{ manifest, body, files, hash }`。
- `skill-service.ts`（thin-wrapper，I/O）：
  - `install(zip, userId)`：parse → S3 put → `skillRepository.save` + `skillVersionRepository.insert`。
  - `update(id, zip)`：parse → 比對版本（semver 必須遞增）→ S3 put → save + version.insert。
  - `exportZip(id)`：repo → S3 get → 串流 zip 下載。
  - `bundleZip(skillIds)`：取各 skill zip → 併成一個 bundle zip（含 manifest 清單）→
    `skillBundleRepository.save`（lock 釘死版本+hash）。
  - `loadForInjection(id)`：取 SKILL.md 本文供 chat 注入。
  - S3 走既有 `src/lib/file-storage`。

### 3.2 API 層 — `src/app/api/skills/`
- `route.ts`：GET（列出 user 可見）/ POST（上傳 zip → install）。
- `[id]/route.ts`：GET（detail）/ PATCH（rename、category、visibility、enabled）/ DELETE。
- `[id]/download/route.ts`：GET（export zip）。
- `[id]/versions/route.ts`：GET（版本史，M3）。
- `bundles/route.ts`：GET / POST（建 bundle，M4）；`bundles/[id]/download/route.ts`。
- `actions.ts`：server actions，沿用既有 mcp/memory 的 action 慣例。

### 3.3 UI 層 — `src/app/(chat)/skills/` + `src/components/skill/`
- `/skills/page.tsx`：列表，依 category 分組（複用 mcp-dashboard / app-sidebar-mcp 的分組
  UI），含上傳 dropzone、下載、刪除、群組改名。
- 側欄入口：在 `app-sidebar-mcp.tsx` 的 `SERVER_PANELS` 風格加一個 Skills 面板，或新一區。
- `skill-card.tsx`、`skill-upload.tsx`、`skill-editor.tsx`（M3 站內編輯 SKILL.md）、
  `skill-launcher.tsx`（右下角呼叫區）。

### 3.4 Chat 整合（執行時）— `src/app/api/chat/`
- L1：把 enabled skills 的 `name + description` 註冊進 system prompt（讓模型知道存在）。
- L2：使用者 @mention 或 launcher 觸發 → `loadForInjection` 取本文 → 經
  `shared.chat.ts` 的 `mergeSystemPrompt` 注入該回合。
- 與既有 agent.instructions / MCP 客製同一條注入路徑，不另造機制。

## 4. 需要新增的依賴（official-first，不手刻）
- zip 處理：`jszip`（或 `adm-zip`）—— 解壓/打包。
- frontmatter：`gray-matter`（或用既有 `yaml` 解析 `---` 區塊）。
- 兩者都是常見庫；不手寫 >30 行去模擬。

## 5. 建構順序（tracer-bullet → 加厚）

- **Slice 0 — walking skeleton（先做）**：`skill-package.ts`（含單測）+ `skill-service.install`
  + `POST /api/skills`（上傳）+ `/skills` 最小列表 + 一個 launcher 把某 skill 注入 chat。
  一條垂直線打通，端到端可 demo。
- **M1**：分組（category，複用 MCP）、移除、下載 zip。
- **M2**：update 既有 skill（semver 遞增）。
- **M3**：版本史 + rename + 站內編輯 SKILL.md（enhancement）。
- **M4**：勾選多個 → bundle zip + 一鍵安裝（展開註冊）。
- **收尾**：右下角呼叫區打磨 + 5 個標準種子技能（可拿 .agents/skills 既有的當種子）。

## 6. 先決事項（Phase 1 開頭就處理）
- 對齊 `SkillManifestSchema` 到官方規格（見 ROADMAP §7）。
- 安全：上傳驗證在執行前完成；強制資料夾在 zip 根。
- i18n：新字串走 messages/zh-TW.json。

## 7. 教學切入（Workshop）
每個 slice 對一個業界類比：upload=`.vsix`/`.difypkg`、version=semver、bundle=Extension
Pack/`.difybndl`、跨工具通用=agentskills.io 開放標準。現場 demo「改一個 SKILL.md → 升版 →
打包成標準組」走完 M3+M4。
