# Disabled / Hidden UI Features

This fork hides some of upstream better-chatbot's UI per product decisions.
**Nothing is deleted** — each feature is only hidden so it can be restored
later. This file is the registry: what is off, why, where it lives, and how to
bring it back.

Mechanism: a single flag set in `src/lib/ui-flags.ts` (a "feature flag" style
switch). Each entry point renders only when its flag is `true`, so restoring a
feature = **flip its flag back to `true`** in that file. The "Where it renders"
column points at the exact site each flag guards.

Status legend: `requested` = decided, not yet applied · `hidden (<date>)` =
currently gated off and not rendered in the UI.

Applied: 2026-06-18 — all five flags set to `false` in `src/lib/ui-flags.ts`.

## Registry

| # | Feature | Where it renders | Flag | Status |
|---|---------|------------------|------|--------|
| 1 | Sidebar「工作流 / Workflow」link | `src/components/layouts/app-sidebar-menus.tsx` — the `<SidebarMenu>` wrapping `<Link href="/workflow">` (`t("Layout.workflow")`) | `workflow` | hidden (2026-06-18) |
| 2 | Sidebar「封存 / 归档 / Archive」section | `src/components/layouts/app-sidebar-menus.tsx` — the `<SidebarMenu className="group/archive">` block (`t("Archive.title")`) and its `<ArchiveDialog>` | `archive` | hidden (2026-06-18) |
| 3 | Sidebar「智能體 / Agents」list + 「創建智能體 / Create an agent」card | the whole `<AppSidebarAgents/>` component, mounted in `src/components/layouts/app-sidebar.tsx` (`<AppSidebarAgents userRole={userRole} />`) | `agents` | hidden (2026-06-18) |
| 4 | User menu「報告問題 / Report an issue」 | `src/components/layouts/app-sidebar-user.tsx` — the `reportAnIssue` dropdown item (opens GitHub issues) | `reportIssue` | hidden (2026-06-18) |
| 5 | User menu「加入社區 / Join community」 | `src/components/layouts/app-sidebar-user.tsx` — the `joinCommunity` dropdown item (opens Discord) | `joinCommunity` | hidden (2026-06-18) |

## Details & restore notes

1. **Workflow link** — entry point to `/workflow`. Hiding only removes the
   sidebar link; the `/workflow` route still works if visited directly.
2. **Archive section** — the collapsible "Archive" group plus its add-archive
   dialog. Archive routes (`/archive/:id`) remain functional.
3. **Agents + Create an agent** — `<AppSidebarAgents/>` renders both the
   "Agents" list and the "Create an agent" card; hiding the component removes
   both. `/agents` and `/agent/new` routes remain functional.
4. **Report an issue** — links to the upstream GitHub issues page; not relevant
   for this private deployment.
5. **Join community** — links to the upstream Discord; not relevant here.

## Important

- These are **UI-only** hides. Backend routes and APIs are untouched, so the
  features still work if a URL is visited directly. Only the entry points are
  hidden.
- To restore: flip the flag in `src/lib/ui-flags.ts` (once added), or
  un-hide the block at the Location above.
- Keep this table in sync with `src/lib/ui-flags.ts` whenever a feature is
  hidden or restored.

Last updated: 2026-06-18
