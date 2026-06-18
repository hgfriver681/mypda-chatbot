// Feature flags for hiding upstream better-chatbot UI we don't want in this
// deployment. `false` = hidden; flip to `true` to restore the feature.
// Keep this in sync with docs/DISABLED_FEATURES.md.
export const UI_FLAGS = {
  // Sidebar「工作流 / Workflow」link
  workflow: false,
  // Sidebar「封存 / 归档 / Archive」section
  archive: false,
  // Sidebar「智能體 / Agents」list + 「創建智能體 / Create an agent」card
  agents: false,
  // User menu「報告問題 / Report an issue」
  reportIssue: false,
  // User menu「加入社區 / Join community」
  joinCommunity: false,
  // Header「切換語音聊天 / Toggle voice chat」button
  voiceChat: false,
  // Header「切換臨時聊天 / Toggle temporary chat」button
  temporaryChat: false,
  // Chat idle animation (light rays + particles after ~60s of inactivity)
  idleParticles: false,
  // Tools dropdown「生成圖片 / Generate image」submenu
  imageGeneration: false,
  // Tools dropdown「預設 / Presets」submenu
  toolPresets: false,
  // Tools dropdown「網頁搜尋 / Web search」toggle
  webSearch: false,
  // Tools dropdown「Code Execution」toggle
  codeExecution: false,
} as const;
