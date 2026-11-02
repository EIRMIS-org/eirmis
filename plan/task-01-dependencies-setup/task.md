# Task 01 — Dependencies Setup

| Field | Value |
|---|---|
| **Order** | 1st — root task, before anything else (~30 min) |
| **Owner** | Lead (Andrei) |
| **Lane** | Root of all lanes — nothing else starts until this is merged |
| **Branch** | `feat/m4-w1-deps` (or direct to the week branch if the team works trunk-based) |

---

## Scope

Install every dependency Week 1 needs in **one commit**, so no other task touches `package.json` again this week.

## Dependencies to install

### Runtime (`dependencies`)

| Package | Why | Used by task |
|---|---|---|
| `@tanstack/react-query` | Server-state cache; one hook per `operationId` | 05, 06–10 |
| `react-router-dom` | Client routing + role guards | 04, 06–10 |
| `react-hook-form` | Form state for all form-heavy screens | 07, 08, 10, 11 |
| `zod` | Schema validation mirroring contract types | 11, 07, 08, 10 |
| `@hookform/resolvers` | Glue between RHF and Zod | 11 |

### Dev (`devDependencies`)

| Package | Why | Used by task |
|---|---|---|
| `vitest` | Test runner (the `test` script already exists but vitest is not installed) | Week 2, install now to fix the broken script |
| `@testing-library/react` | Component tests | Week 2 |
| `@testing-library/user-event` | Interaction tests | Week 2 |
| `@testing-library/jest-dom` | DOM matchers | Week 2 |
| `jsdom` | DOM environment for vitest | Week 2 |

> **Why install test tooling now:** [`package.json`](../../package.json) already declares `"test": "vitest"` — the script is currently broken. Installing now means Week 2 starts green, and CI wiring (M4 CI job) can be added without a dependency churn mid-week.

## Steps

1. Run a single install command:
   ```bash
   npm i @tanstack/react-query react-router-dom react-hook-form zod @hookform/resolvers
   npm i -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
   ```
2. Verify versions resolved cleanly (`npm ls @tanstack/react-query react-router-dom`).
3. Confirm existing scripts still run: `npm run lint && npm run typecheck`.
4. Commit `package.json` + `package-lock.json` alone (no other files in the commit) so the diff is reviewable.

## Files touched

- [`package.json`](../../package.json) — modified
- `package-lock.json` — modified

## Out of scope

- No `vitest.config.ts` yet (that is Week 2, or a follow-up commit by the same owner if the team wants `npm test` runnable this week).
- No provider code, no router — tasks 02 and 04 own those.
