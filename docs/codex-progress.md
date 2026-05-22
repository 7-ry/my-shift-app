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
- Extracted copy week logic into `src/hooks/useCopyWeek.js`.
- Extracted Header clear-week Firestore write logic into `src/hooks/useClearWeek.js`.
- Extracted CopyWeekModal template fetch/apply/delete logic into `src/hooks/useCopyWeekTemplates.js`.
- Extracted EditShiftModal save/delete Firestore write logic into `src/hooks/useEditShiftActions.js`.
- Added `docs/test-plan.md`.
- Added `.github/workflows/ci.yml` for pull request and `codex/architecture-cleanup` checks.
- Added `docs/architecture-audit.md` to reassess the actual current architecture and remaining merge plan.

## Partially Completed Work

- Firestore read logic has started moving out of `src/App.jsx`.
- `src/App.jsx` still owns GAS sync orchestration.
- Copy week modal UI state and rendering remain in `src/components/CopyWeekModal.jsx`.
- Some Firestore write behavior remains in components, including StaffManagementModal.

## Pending Work

- Complete the remaining required refactors before merging `codex/architecture-cleanup` into `main`.
- Next PR: extract StaffManagementModal write logic in small safe batches.
- Later required refactors: GAS sync orchestration.
- Confirm CI and complete `docs/test-plan.md` manual regression after the required refactors.
- Perform final PR review and merge-readiness check only after the required refactors are complete.

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
- The project owner decided main merge is deferred until remaining necessary refactors reduce risky embedded write logic.
