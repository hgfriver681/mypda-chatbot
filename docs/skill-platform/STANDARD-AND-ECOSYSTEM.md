# 技能平台 — Agent Skills 開放標準與生態調查

> 用途：把「Anthropic Skills 是什麼、業界慣例、檔案結構、Projects 概念、GitAgent
> 參考架構」的調查落地，作為 Workshop 教材與 Phase 1 設計依據。所有事實附第一手來源；
> 引用採改寫。最後更新：2026-06-20。

## 1. Skills = agentskills.io 開放標準（這就是「大家的慣例」）

一個 skill 是**一個資料夾，含一個 `SKILL.md`**（YAML frontmatter 的 `name` + `description`
必填，後接 markdown 指令本文）。此格式最初由 Anthropic 提出，**已釋出為開放標準**
（agentskills.io），並被廣泛採用：Cursor、Gemini CLI、GitHub Copilot、VS Code、OpenAI
Codex、OpenCode、OpenHands、Goose、Roo Code、Letta、Factory、Kiro、Amp、Snowflake Cortex
Code 等 40+ agent 工具。

產品意涵：平台應**直接採用此開放標準**，使用者上傳的 skill 即可跨工具通用（「一次寫好、
跨 40+ agent 通用」是最強賣點），不要自創格式。

## 2. 運作機制：progressive disclosure（三層載入）

- L1 Discovery：啟動時只載入每個 skill 的 `name` + `description`（約 100 tokens/skill），永遠在。
- L2 Activation：任務符合 description 時，才把 `SKILL.md` 本文讀進 context（<5k tokens）。
- L3 Execution：需要時才讀 bundled 腳本/參考檔（透過 bash；腳本只回傳輸出，程式碼不進
  context，等於無上限）。

這對應平台 ADR-1（提示注入）：只把 name + description 常駐，本文按需注入。

## 3. 官方 SKILL.md frontmatter 規格（權威）

- `name`：≤ 64 字元；只能小寫字母、數字、連字號；不可含 XML tag；不可含保留字
  "anthropic" / "claude"。
- `description`：非空；≤ 1024 字元；需同時寫「做什麼 + 何時用」；不可含 XML tag。

Claude Code 額外擴充（非標準必需）：invocation control（誰來觸發）、subagent execution、
dynamic context injection；自訂指令（`.claude/commands/*.md`）已併入 skills。

## 4. 檔案結構（canonical）

```
my-skill/
├── SKILL.md       # 必須：metadata（frontmatter）+ 指令本文
├── scripts/       # 選用：可執行程式碼（bash 跑，只回輸出）
├── references/    # 選用：詳細文件（REFERENCE.md、FORMS.md…），需要才載入
├── assets/        # 選用：模板、靜態資源
└── examples/ schemas/ …
```

三種內容、三種強項：instructions（md，彈性）/ code（腳本，可靠）/ resources（查表，事實）。

## 5. 散布與各介面（重點：不跨介面同步）

- claude.ai：`Settings > Features` 上傳 **zip**；硬規則「**zip 根目錄要含資料夾本身**」；
  per-user、不支援組織集中管理。
- Claude API：`/v1/skills` 端點；workspace-wide 共享；需 beta headers；跑在 code-exec
  容器（無外網）。
- Claude Code：filesystem 式，個人 `~/.claude/skills/` 或專案 `.claude/skills/`（隨 git
  分享）＋ plugins。
- 跨介面**不自動同步**，需各自上傳管理。

## 6. 「Projects / 專案」的兩個意思（別混淆）

- claude.ai **Projects**：一個**工作區容器**（自訂指令 + 知識檔 + 一組對話）。與 Skills
  正交：Skill = 可攜「能力」；Project = 「情境工作區」；兩者可組合。
- Claude Code **project skills**：`.claude/skills/`（隨 repo/git 分享），相對個人
  `~/.claude/skills/`。慣例是「範圍越 specific 越優先」（project 蓋過 personal）。

平台啟示：現有 `visibility`（public/private）+ `category` 已覆蓋「個人 vs 共享」「分組」。
未來「專案」= 在 category 之上再加一層 workspace/project 容器（綁 skills + MCP + memory），
呼應 claude.ai Projects。M1 階段先用 category。

## 7. GitAgent 參考架構（github.com/open-gitagent/gitagent）

核心理念「**Agent 就是一個 git repo**」：身分、規則、記憶、工具、技能全是版控檔案。
Tagline：「A universal git-native multimodal always learning AI Agent (TinyHuman)」（約
555 stars）。

- 資料夾：`agents/`、`skills/`、`memory/`、`tools/`、`plugins/`、`hooks/`、`config/`、
  `docs/`、`examples/`、`src/`、`test/`
- 關鍵檔：`agent.yaml`（模型/工具/runtime）、`SOUL.md`（人格）、`RULES.md`（行為約束）、
  `SKILL.md`（同開放標準）、`plugin.yaml`

啟發：(a) 它用的就是 `skills/<name>/SKILL.md`，可當 demo 種子；(b) 它把版本控管做在 git
本身——與本平台 M3 同源。教學可對比兩種哲學：**GitAgent = git 即資料庫** vs **本平台 =
Postgres + S3 + lockfile**。

## 8. 對平台的可行動結論

1. **採用 agentskills.io 開放標準**當技能格式（跨工具通用）。
2. **Phase 1 把驗證器對齊官方規格**（見 ROADMAP §7）。
3. **安全稽核**：官方明確警告 skill 可挾帶惡意腳本，須「當成安裝軟體」看待——上傳要驗
   frontmatter、強制資料夾在 zip 根、掃描可疑外連/檔案存取，預設關閉、明確同意。
4. **Projects** 之後做成 category 之上的 workspace 層。

## 9. 來源

- https://agentskills.io
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- https://code.claude.com/docs/en/skills
- https://github.com/anthropics/skills
- https://github.com/open-gitagent/gitagent
