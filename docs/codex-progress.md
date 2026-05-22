# Codex Progress

Last updated: 2026-05-22

## Repository State

- Architecture cleanup was merged into `main` through PR #34.
- Production smoke check did not reveal a blocking issue.
- `codex/architecture-cleanup` is being kept temporarily as a safety reference.
- New post-main work should branch from `main`.
- Current planning branch: `codex/post-main-roadmap-docs`.

## Completed Work

- Added minimal Vitest setup and helper tests.
- Completed safe lint cleanup batches.
- Documented current GAS sync behavior in `docs/gas-sync-spec.md`.
- Extracted `buildGASPayload` in `src/services/gasService.js`.
- Added GAS payload contract tests in `src/services/gasService.test.js`.
- Split GAS payload building into internal builders.
- Fixed the dashboard OVER status contract so GAS receives `⚠️ OVER`.
- Optimized dashboard row total calculation with a `Map`.
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
- Extracted StaffManagementModal basic add/deactivate/reorder Firestore write logic into `src/hooks/useStaffManagementBasicActions.js`.
- Extracted StaffManagementModal update and staff-name/color cascade Firestore write logic into `src/hooks/useStaffUpdateActions.js`.
- Extracted GAS sync orchestration from `src/App.jsx` into `src/hooks/useGasSync.js`.
- Added `docs/test-plan.md`.
- Added `.github/workflows/ci.yml`.
- Added `docs/architecture-audit.md`.
- Added `docs/post-main-roadmap.md` to define the next post-main sequence.

## Pending Work

Follow `docs/post-main-roadmap.md`.

Recommended order:

1. Staff update failure user-facing alert.
2. Staff cascade batch limit guard design.
3. Non-production GAS sync verification environment.
4. Manuscript / new feature updates.
5. Optional project re-audit.
6. Keep drag behavior deferred unless a concrete bug appears.

## Verification History

Known completed implementation steps were verified with:

```bash
npm test -- --run
npm run build
npm run lint
```

Build has consistently shown only the existing Vite chunk size warning.

## Risk Notes

- This is a production-used scheduling app. PRs must remain small and reviewable.
- Do not change Firestore collection names: `staffs`, `shifts`, `shiftTemplates`.
- Do not change Google Apps Script payload shape.
- Preserve read-only viewer behavior, edit lock behavior, drag behavior, and Japanese/English switching.
- Initial staff auto-create behavior is business-sensitive and currently lives in `useStaffs`.
- GAS sync uses `mode: 'no-cors'`, so frontend success does not confirm receiver-side success.
- Staff update cascade still needs a separate batch-limit safety design.
