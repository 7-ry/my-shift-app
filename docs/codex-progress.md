# Codex Progress

Last updated: 2026-05-09

## Repository State

- Current branch at inspection: `codex/add-progress-tracking-docs`
- Working tree before creating these docs: clean
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

## Partially Completed Work

- Firestore read logic has started moving out of `src/App.jsx`.
- `src/App.jsx` still owns auth state handling, week navigation, dashboard data calculation, shift creation, template save, and GAS sync orchestration.
- Firestore write behavior remains mostly in `src/App.jsx` and components.

## Pending Work

- Commit these tracking docs.
- Extract `dashboardData` calculation from `src/App.jsx`.
- Extract week navigation logic from `src/App.jsx`.
- Extract auth state handling from `src/App.jsx`.
- Extract remaining shift creation logic in small steps.
- Create `docs/test-plan.md`.
- Add a CI workflow for test, build, and lint.
- Perform final PR review and merge-readiness check.

## Verification History

Known completed implementation steps were verified with:

```bash
npm test -- --run
npm run build
npm run lint
```

The latest staff hook extraction passed all three commands. Build has consistently shown only the existing Vite chunk size warning.

## Risk Notes

- This is a production-used scheduling app. Refactors must remain small and reviewable.
- Do not change Firestore collection names: `staffs`, `shifts`, `shiftTemplates`.
- Do not change Google Apps Script payload shape.
- Preserve read-only viewer behavior, edit lock behavior, drag behavior, and Japanese/English switching.
- Initial staff auto-create behavior is business-sensitive and currently lives in `useStaffs`.
- GAS sync uses `mode: 'no-cors'`, so frontend success does not confirm receiver-side success.
