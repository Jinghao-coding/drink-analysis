---
name: drink-analysis-maintainer
description: Maintain and ship the drink tracking app in this repository. Use when tasks involve understanding or editing index.html/src/main.ts/src/styles.css/README.md, validating behavior after changes, and publishing updates to GitHub Pages via git commit/push.
---

# Drink Analysis Maintainer

Follow this workflow whenever the user asks to modify the drink calendar project.

## Workflow

1. Read `index.html`, `src/main.ts`, and `src/styles.css` and map impacted areas before editing.
2. Implement requested changes with minimal diff.
3. Run local verification using `scripts/verify_project.sh`.
4. Update `README.md` if behavior, UI, data format, deployment, or usage changed.
5. Commit and push using `scripts/commit_and_push.sh "<message>"` after checks pass.

## Code Understanding Checklist

Read these sections in `src/main.ts` before editing:

- Config and schema constants: `BIN_ID`, `API_KEY`, `APP_SCHEMA_VERSION`, `POSITIONS`, `USERS_STORAGE_KEY`.
- User model and reconciliation: `normalizeUsers`, `reconcileUsersFromAppData`, `mergeUsers`.
- Day data migration and normalization: `normalizeDayData`, `migrateAppDataToV2`.
- Main interaction path: `openEdit` -> `setOpt` / drinks inputs / note -> `save` -> `push`.
- Rendering path: `render`, `renderStatsOverview`, `renderReport`.
- Cloud sync path: `pull`, `push`, `updSync`.

Load [references/code-map.md](references/code-map.md) when you need a deeper map of modules and data flow.

## Editing Rules

- Keep `index.html` as the HTML shell and `src/main.ts` as the primary logic entry unless the user asks for further refactor.
- Preserve backward compatibility for day data (`u`, `photos`, `drinks`, `extra`, legacy slots).
- Keep user identity stable via `user.id`; do not bind historical data to display name.
- Avoid breaking JSONBin sync calls and status badges.
- Keep mobile behavior and modal/sheet flows intact.

## Verification Rules

Run:

```bash
skills/drink-analysis-maintainer/scripts/verify_project.sh
```

Treat failures as blockers. If verification cannot run, explain why and stop before push.

## Publish Rules

Use:

```bash
skills/drink-analysis-maintainer/scripts/commit_and_push.sh "feat: ..."
```

The publish script:

- runs verification first,
- stages tracked and untracked changes,
- commits with the provided message,
- pushes current branch to `origin`.

If `git push` fails, surface the exact failure and do not claim publish success.

If push fails with network errors (for example timeout to github.com:443), load proxy settings from `~/.zshrc` and retry.
This repository's environment defines `proxy_on` and `PROXY_ADDR` in `~/.zshrc`.
