# 技能平台 — 會議紀要與決策

> 來源：技能平台架構模組規劃會議。
> 用途：Workshop 教學 + 後續實作的單一真相來源（與 RESEARCH.md、ROADMAP.md 並列）。
> 最後更新：2026-06-20。

## 1. 背景與定位

把 myPDA 從「CLI 抽象」升級為**具備技能管理能力的平台**。技能（skill）以 zip
封裝，可上傳 / 下載，並顯示於**左側面板**或**右下角呼叫區**。本次規劃重視**教學性**，
讓使用者能從基本技能延伸做 extension 與修改。river 將擔任 Workshop 講師。

## 2. 觀念分層（教學前必須先講清楚）

兩者共用 SKILL.md 格式與概念，但屬於不同層，務必區分：

- `.agents/skills/`（repo 現有）＝ 給「coding agent」用的技能（Vercel `skills` CLI
  生態，含 `skills-lock.json` 與 `computedHash`）。這是現成的**參考實作 / 教材彈藥**。
- 本次要做的 **Skill Platform** ＝ 給「終端使用者」在 myPDA 聊天介面用的產品功能，
  由 DB 撐腰、UI 驅動，是新建的一層。

## 3. 模組範圍

| 模組 | 範圍 | 一句話 |
|---|---|---|
| M1 技能排程與基本操作 | 上傳 / 下載、新增 / 移除、grouping | 技能 CRUD + 分組 |
| M2 技能上傳與更新 | 新技能 upload、既有技能 update | 安裝與升級 |
| M3 技能修改與版本控管 | enhancement、rename、版本管理 | 站內編輯 + semver |
| M4 標準技能組打包 | 多個 zip → 一個 package（約 5 個基本技能），一次 upload | bundle / pack |

## 4. 決策紀錄（ADR）

本次規劃會後拍板，作為實作主線：

- **ADR-1 執行語意 = 提示注入（prompt injection）only。**
  「呼叫技能」＝把 SKILL.md 內文當 instructions 注入 system prompt，複用既有
  agent.instructions / MCP 客製機制。理由：最快可 demo，貼近 Anthropic Agent Skills
  的 progressive disclosure。可執行腳本 / 綁 MCP 工具列為 demo 後的後續擴充。
- **ADR-2 儲存 = Postgres 表 + S3 zip。**
  metadata 進 Postgres（鏡像 `mcp_server` 表），zip 本體放現有 `src/lib/file-storage`
  （S3）。理由：雲端 / Vercel 友善，複用最多現成程式；不寫入 `.agents/skills/`
  檔案系統（serverless 不友善）。
- **ADR-3 文件落地 = `docs/skill-platform/`。**
  拆成 MEETING-NOTES / RESEARCH / ROADMAP 三份，作為教材與實作依據。

## 5. 待確認

- **Demo 死線日期**：會議寫 2026-06-19（下週五），但今天已是 2026-06-20。請確認真正
  死線是 2026-06-26（下週五）或其他日期，以校準 ROADMAP 的鬆緊。

## 6. 結論

以模組化方式逐步建構平台，目標於死線前完成「基本殼 + 可 demo」，demo 走完
M1→M4 四個模組（見 ROADMAP.md 的 demo 故事線）。
