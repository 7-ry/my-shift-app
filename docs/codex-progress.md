# Codex Progress

Last updated: 2026-05-21

## Repository State

- Current branch at inspection: `codex/extract-template-logic`
- Working tree before this CI update: clean except existing untracked `.tmp.driveupload/`
- Latest known HEAD: `406e999` `Merge pull request #13 from 7-ry/codex/plan-staffs-read-hook`
- Existing docs before this update: `docs/gas-sync-spec.md`
- Existing hooks: `useShiftDrag.js`, `useStaffs.js`, `useWeekShifts.js`
- Package scripts: `dev`, `build`, `lint`, `preview`, `test`
- Test script: `vitest`

## Completed Work

- Added minimal Vitest setup and helper tests.
- Completed safe lint cleanup batches.
- Documented current GAS sync behavior in `docs/gas-sync-spec.md`.
- Extracted `buildGASPayload` in `src/services/gasService.js`.
- Added GAS payload contract tests in `src/services/gasService.test.js`.
- Split GAS payload building into internal builders:
  - `buildShiftDataRows`
  - `buildDashboardRows`
  - `buildScheduleCommands`
- Fixed the dashboard OVER status contract so GAS receives `⚠️ OVER`.
- Optimized dashboard row total calculation with a `Map`.
- Added `GAS_STATUS_OVER` cleanup and JSDoc clarification.
- Extracted week shift reads into `src/hooks/useWeekShifts.js`.
- Hardened `useWeekShifts` with stale-response protection and Firestore error logging.
- Cleared shifts when `user` is missing in `useWeekShifts`.
- Extracted staff fetching and initial staff bootstrap into `src/hooks/useStaffs.js`.
- Extracted dashboard data calculation into `src/utils/dashboardData.js`.
- Extracted week navigation into `src/hooks/useWeekNavigation.js`.
- Extracted Firebase Auth state handling into `src/hooks/useAuthUser.js`.
- Extracted shift creation into `src/hooks/useShiftCreation.js`.
- Extracted shift template save logic into `src/hooks/useShiftTemplates.js`.
- Added `docs/test-plan.md`.
- Added `.github/workflows/ci.yml` for pull request and `codex/architecture-cleanup` checks.

## Partially Completed Work

- Firestore read logic has started moving out of `src/App.jsx`.
- `src/App.jsx` still owns GAS sync orchestration.
- Template apply/delete behavior currently remains in `src/components/CopyWeekModal.jsx`.
- Firestore write behavior remains mostly in `src/App.jsx` and components.

## Pending Work

- Perform final PR review and merge-readiness check.

## Verification History

Known completed implementation steps were verified with:

```bash
npm test -- --run
npm run build
npm run lint
```

The latest staff hook extraction passed all three commands. Build has consistently shown only the existing Vite chunk size warning.

The architecture cleanup follow-ups also passed these commands locally after each implementation step. The CI workflow now runs the same commands on pull requests and pushes to `codex/architecture-cleanup`.

## Risk Notes

- This is a production-used scheduling app. Refactors must remain small and reviewable.
- Do not change Firestore collection names: `staffs`, `shifts`, `shiftTemplates`.
- Do not change Google Apps Script payload shape.
- Preserve read-only viewer behavior, edit lock behavior, drag behavior, and Japanese/English switching.
- Initial staff auto-create behavior is business-sensitive and currently lives in `useStaffs`.
- GAS sync uses `mode: 'no-cors'`, so frontend success does not confirm receiver-side success.
