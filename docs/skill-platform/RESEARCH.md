# 技能平台 — 業界對標研究

> 用途：為「技能上傳 / 更新 / 版本 / 打包」平台萃取可重用的設計原語，並作為 Workshop
> 對照教材。所有事實附來源；引用採改寫（非逐字）。最後更新：2026-06-20。

## 1. 三類對標生態

- A 類：AI agent 技能 / 外掛 —— Claude Agent Skills、MCP Registry、（OpenAI GPTs/Apps）。
- B 類：低程式碼 agent 平台 —— Dify、Coze、n8n、Flowise / Langflow。
- C 類：編輯器外掛市集 + 套件管理 —— VS Code（VSIX / Extension Pack）、Obsidian、
  semver + lockfile。

## 2. 五維度對照表

| 生態 | 封裝格式 | 上傳 / 安裝 | 版本 | 分組 / 發現 | 打包（對應 M4） |
|---|---|---|---|---|---|
| Claude Agent Skills | 資料夾（SKILL.md + 資源）→ zip（根含資料夾本身） | claude.ai Settings > Features 上傳 zip；或 API / Code | frontmatter + 引用檔；progressive disclosure | 靠 `description` 觸發 | 本身無 bundle |
| MCP Registry（官方） | server 設定（非 zip） | registry.modelcontextprotocol.io（2025-09 預覽、社群共管） | registry spec（v0.1 凍結） | public / private 子登錄 | — |
| Dify（v1.0, 2025-02） | `.difypkg` | Marketplace 或本地檔安裝 | semver | 分類 / 類型 | `.difybndl`（多外掛一包） |
| n8n community node | npm 套件（名稱須 `n8n-nodes-*`） | Settings > Community Nodes 輸入 npm 名 | npm semver + dist-tag | nodes 面板 | — |
| VS Code | `.vsix`（OPC，本質是 zip） | Marketplace 或 install vsix | semver、最高版勝、自動更新 | categories / keywords | Extension Pack（`extensionPack: [id...]`） |
| Obsidian | 資料夾（manifest.json + main.js） | GitHub Releases + 中央 registry | `version` + `minAppVersion` 相容性閘 | — | — |

## 3. 六個設計原語（平台骨架 + 教學主線）

1. **Manifest（宣告式清單）**：每技能用 SKILL.md frontmatter 宣告
   `id/name/version/description/tags/權限`。平台只讀清單即可驗證與索引，**不必執行程式**
   （VSIX、Chrome manifest、OCI、SKILL.md 同一套）。
2. **Version = semver**：`MAJOR.MINOR.PATCH` 本身是「升級是否安全」的契約，驅動更新
   偵測與「最高版勝」。
3. **Lockfile + 內容雜湊**：repo 已有 `skills-lock.json`（`computedHash`）。bundle 要釘死
   成員的確切版本 + 雜湊，使「標準技能組」跨使用者可複現、可驗篡改。
4. **Grouping / tags**：分類驅動搜尋與面板分組（myPDA 的 MCP `category` 已是此模式）。
5. **Bundle / Pack**：M4 的兩個直接先例 —— VS Code Extension Pack（清單就是成員 id
   陣列、成員間零功能耦合）與 Dify `.difybndl`。打包是「資料」，不是「程式」。
6. **Validation-on-upload**：收 zip → 讀 manifest → 驗 schema / 版本 / 權限 → 掃描 →
   顯示安全評分，全部在能執行之前。搭配「預設關閉 + 明確同意」（Obsidian Restricted
   Mode）。

## 4. 兩個值得直接偷的跨界經驗

- **只託管 metadata、不託管程式碼**（Obsidian 中央 registry 只指向作者自管的 GitHub
  release）—— 與 myPDA「MCP 範本：平台只當 client」哲學一致，平台保持輕量。
- **Pack 與成員零功能耦合**（VS Code 規定 Extension Pack 不得對成員有功能相依）——
  這是標準技能組能自由混搭又安全的關鍵；另保留一個 hard-dependency 欄位給真正相依
  的技能。

## 5. 來源

- Claude Agent Skills：
  - https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
  - https://github.com/anthropics/skills
- MCP Registry：
  - https://blog.modelcontextprotocol.io/posts/2025-09-08-mcp-registry-preview/
  - https://github.com/modelcontextprotocol/registry
- Dify plugins / bundle：
  - https://docs.dify.ai/en/develop-plugin/publishing/marketplace-listing/release-overview
  - https://marketplace.dify.ai/
- n8n community nodes：
  - https://docs.n8n.io/integrations/community-nodes/installation/verified-install/
  - https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/
- VS Code VSIX / Extension Pack：
  - https://code.visualstudio.com/api/working-with-extensions/publishing-extension
  - https://code.visualstudio.com/api/references/extension-manifest
- Obsidian：
  - https://docs.obsidian.md/Reference/Manifest
  - https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
- Semver / lockfiles：
  - https://semver.org/
  - https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json
