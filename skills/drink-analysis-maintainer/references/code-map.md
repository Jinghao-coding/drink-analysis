# drink-analysis code map

## Scope

- Main app file: `index.html` (single-page app, HTML+CSS+JS in one file)
- Project doc: `README.md`

## Architecture overview

- UI shell: navbar, calendar area, bottom tabs, popups/sheets.
- State: in-memory globals (`appData`, `USERS`, month/year selectors, temp edit buffers).
- Local persistence: `localStorage` for users + theme.
- Cloud persistence: JSONBin (`pull` and `push` with `BIN_ID` and `API_KEY`).
- Schema migration: legacy day structure to V2 object structure.

## Key data structures

- `USERS`: `[{ id, name, short, color, pos }]`
- `appData[month][day]` day record:
  - `u`: per-user status map (`userId -> 微醺|刚刚好|醉了`)
  - `photos`: base64 image list
  - `drinks`: `userId -> [{ type, amount }]`
  - `extra`: `userId -> { cost }`
  - `note`: optional day note
- `appData._meta`:
  - `schemaVersion`
  - `users`
  - `usersUpdatedAt`

## Runtime flow

1. `DOMContentLoaded`:
- init theme
- load/normalize users from localStorage
- `render()` and `renderReport()`
- `pull()` cloud data
- periodic pull + foreground pull

2. Day editing:
- open day sheet (`openEdit`)
- update temp state (`setOpt`, drinks ops, note/photo updates)
- `save()` writes day payload into `appData`
- `render()`, `renderReport()`, then `push()`

3. Sync:
- `pull()` downloads cloud record, reconciles users, runs migration, rerenders, optional push-back
- `push()` uploads full `appData` and updates sync badge

## High-risk change points

- User identity and mapping (`normalizeUsers`, `mergeUsers`, `reconcileUsersFromAppData`)
- Migration logic (`normalizeDayData`, `migrateAppDataToV2`)
- Sheet save pipeline (`save`)
- Sync pipeline (`pull`/`push`)
- Report and stats calculations (`StatsUtils`, `renderStatsOverview`, `renderReport`)

## Validation expectations after each change

- `index.html` exists and contains required sync and render functions.
- `README.md` reflects actual behavior (member count, features, deployment).
- Git working tree is clean after commit+push.
