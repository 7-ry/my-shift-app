# Architecture Audit

Last updated: 2026-05-21

## 1. Purpose

This audit records the actual current architecture of the production-used restaurant shift scheduling app and the remaining refactor roadmap before `codex/architecture-cleanup` can merge into `main`.

The goal of the architecture-cleanup phase is not to redesign the app. The goal is to make the code safer, clearer, easier to maintain, and easier to verify while preserving production behavior.

## 2. Current Branch Strategy

Facts found from project docs and current workflow:

- `main` is connected to Firebase production deployment.
- `codex/architecture-cleanup` is the integration branch for this cleanup phase.
- Small PRs should merge into `codex/architecture-cleanup`.
- The project owner decided not to merge `codex/architecture-cleanup` into `main` yet.
- `codex/architecture-cleanup` should merge into `main` only after the remaining required refactors, final automated checks, and manual regression.
- `.github/workflows/ci.yml` runs on pull requests and pushes to `codex/architecture-cleanup`.

Safety rule:

- Do not change Firestore collection names.
- Do not change Google Apps Script payload shape.
- Do not casually change read-only mode, edit lock, drag behavior, or production GAS sync behavior.

## 3. Current App Architecture Overview

Facts found in code:

- `src/App.jsx` is now mostly the top-level composition layer.
- Shared app state still lives in `App.jsx`, including staff list, selected staff, shifts, modal state, processing state, selected shift, and edit lock state.
- Firestore read logic is partly extracted into hooks.
- Several user actions with Firestore writes are now extracted into hooks.
- Business-sensitive Firestore write logic has been extracted into focused hooks.
- GAS sync payload generation lives in `src/services/gasService.js`.
- GAS sync orchestration now lives in `src/hooks/useGasSync.js`.
- Pure calculations live in `src/utils`.
- Constants and translations live in `src/constants/config.js`.
- CI runs test, build, and lint with Node.js 22.

High-level flow:

- Login state comes from Firebase Auth through `useAuthUser`.
- Staffs load through `useStaffs`.
- Week navigation comes from `useWeekNavigation`.
- Week shifts load through `useWeekShifts`.
- Dashboard rows are calculated by `buildDashboardData`.
- Shift creation uses `useShiftCreation`.
- Shift dragging uses `useShiftDrag`.
- Template save uses `useShiftTemplates`.
- Copying past weeks uses `useCopyWeek`.
- GAS sync is orchestrated by `useGasSync` and executed by `syncToGAS`.

## 4. Current App.jsx Responsibilities

Facts found in `src/App.jsx`:

- Owns top-level app state:
  - language,
  - staff list,
  - selected staff,
  - shifts,
  - editing shift,
  - copy modal visibility,
  - staff modal visibility,
  - processing overlay,
  - viewing staff detail,
  - login password input,
  - selected shift id,
  - edit lock state.
- Calls extracted hooks:
  - `useAuthUser`,
  - `useWeekNavigation`,
  - `useStaffs`,
  - `useWeekShifts`,
  - `useShiftDrag`,
  - `useShiftCreation`,
  - `useShiftTemplates`.
- Persists selected language to `localStorage`.
- Owns logout confirmation and `signOut(auth)`.
- Calls `useGasSync` and passes `handleSyncToGAS` to `Header`.
- Builds `dashboardData` by calling `buildDashboardData(staffs, shifts)`.
- Renders loading, login, and main app branches.
- Wires props into `Header`, `Dashboard`, `ShiftTable`, `StaffDetailModal`, `StaffManagementModal`, `EditShiftModal`, and `CopyWeekModal`.
- Contains global inline style overrides for scrollbars/table sticky behavior.

Recommendation:

- `App.jsx` is now acceptable as the integration shell for this cleanup phase.
- Further extraction should focus on remaining risky embedded write logic before merging to `main`.

## 5. Extracted Hooks and Their Responsibilities

Facts found in `src/hooks`:

- `useAuthUser`
  - Subscribes to Firebase Auth with `onAuthStateChanged`.
  - Provides `user`, `loading`, and `isReadOnly`.
  - Preserves viewer email behavior with `VITE_FB_VIEWER_EMAIL`.
- `useWeekNavigation`
  - Owns `weekId`.
  - Initializes from `localStorage.getItem('lastViewedWeek') || getCurrentWeekId()`.
  - Provides `setWeekId`, `changeWeek`, and `jumpToToday`.
- `useWeekShifts`
  - Reads `shifts` for the selected `weekId`.
  - Preserves the `collection(db, 'shifts')` and `where('weekId', '==', weekId)` query.
  - Updates `lastViewedWeek`.
  - Clears shifts when no user exists.
  - Guards against stale async responses.
- `useStaffs`
  - Reads active staff from `staffs` ordered by `order`.
  - Preserves initial staff bootstrap for writable users.
  - Preserves read-only behavior that avoids auto-creating staff.
  - Initializes selected staff if one is not already selected.
- `useShiftCreation`
  - Creates new shift documents in `shifts`.
  - Preserves off-day confirmation.
  - Preserves two-hour default duration capped at `23:30`.
  - Preserves current `totalHours` calculation.
- `useShiftDrag`
  - Owns drag state and pointer event handling.
  - Performs optimistic shift updates during drag.
  - Persists final dragged shift fields to Firestore.
  - This hook is behavior-sensitive.
- `useShiftTemplates`
  - Saves current week as a shift template in `shiftTemplates`.
  - Omits per-week fields from template shifts.
  - Recalculates template `totalHours`.
- `useCopyWeek`
  - Fetches available source weeks.
  - Copies a selected source week into the current week.
  - Clears current week shifts before writing copied shifts.
- `useGasSync`
  - Blocks sync for read-only users and in-progress operations.
  - Reads `VITE_GAS_URL`.
  - Confirms the selected week before sync.
  - Passes helpers to `syncToGAS`.
  - Shows success/error alerts.

Recommendation:

- These hooks are the main success of the cleanup phase.
- Avoid further changes to `useShiftDrag` before main unless a regression is found.

## 6. Components and Remaining Embedded Logic

Facts found in `src/components`:

- `Header`
  - Renders week controls, language switch, staff selector, edit lock, sync/menu buttons, logout.
  - Uses `useClearWeek` for clearing the current week.
- `Dashboard`
  - Renders staff dashboard cards from `dashboardData`.
- `ShiftTable`
  - Renders the schedule grid.
  - Computes visible cell shifts and off-day display state.
  - Starts shift creation, editing, selection, and drag interactions through props.
- `StaffDetailModal`
  - Renders one staff member's weekly shift details.
  - Sorts and filters shifts for display.
- `StaffManagementModal`
  - Renders staff add, deactivate, reorder, and update UI.
  - Uses `useStaffManagementBasicActions` for staff add, deactivate, and reorder Firestore writes.
  - Uses `useStaffUpdateActions` for staff update and staff name/color cascade Firestore writes.
  - This is business-sensitive because it affects historical/past shifts if those are included in the query.
- `EditShiftModal`
  - Renders shift edit/delete UI.
  - Uses `useEditShiftActions` for shift update and delete Firestore writes.
  - Recalculates total hours on save.
- `CopyWeekModal`
  - Renders copy/template UI.
  - Uses `useCopyWeekTemplates` for template fetch/apply/delete behavior.
  - Uses `useCopyWeek` for past-week copy.
- `Login`
  - Contains passcode-to-Firebase-credential logic and signs in with Firebase Auth.

Recommendation:

- Treat the extracted hooks as the behavior boundaries for final regression.
- Avoid further architecture changes before main unless final regression finds a blocking issue.

## 7. Services and Utils Responsibilities

Facts found in code:

- `src/services/gasService.js`
  - Builds GAS payload through internal builders.
  - Exports `buildGASPayload` for tests.
  - Preserves top-level payload keys: `weekId`, `weekLabel`, `scheduleCommands`, `dashboardRows`, `shiftDataRows`.
  - Preserves `mode: 'no-cors'`.
  - Uses stable GAS-compatible OVER status ⚠️ OVER.
- `src/utils/helpers.js`
  - Time parsing and formatting.
  - Total hour calculation.
  - weekId and weekLabel helpers.
  - Google Sheets row/cell helpers.
- `src/utils/dashboardData.js`
  - Pure dashboard calculation for current hours, remaining hours, and progress percent.
- `src/constants/config.js`
  - Translations.
  - `DAYS`, `LANES`, `TIMES`, `ROW_HEIGHT`, `DRAG_THRESHOLD`.
- `src/firebase.js`
  - Firebase app initialization.
  - Firestore export.
  - Auth export.
  - Analytics initialization.

Facts found in tests:

- Helper tests exist.
- GAS payload contract tests exist.
- Dashboard data tests exist.

## 8. Completed Architecture-Cleanup Work

Completed work, based on current code and docs:

- Added Vitest and baseline helper tests.
- Fixed safe lint issues.
- Documented GAS sync behavior.
- Extracted and tested GAS payload generation.
- Split GAS payload builders.
- Fixed GAS dashboard OVER status contract.
- Optimized dashboard payload row totals.
- Extracted week shift reads into `useWeekShifts`.
- Hardened `useWeekShifts`.
- Extracted staff reads and initial staff bootstrap into `useStaffs`.
- Extracted dashboard data calculation into `buildDashboardData`.
- Extracted week navigation into `useWeekNavigation`.
- Extracted Firebase Auth observer into `useAuthUser`.
- Extracted shift creation into `useShiftCreation`.
- Extracted shift template save into `useShiftTemplates`.
- Extracted past-week copy into `useCopyWeek`.
- Extracted Header clear-week write logic into `useClearWeek`.
- Extracted CopyWeekModal template fetch/apply/delete logic into `useCopyWeekTemplates`.
- Extracted EditShiftModal save/delete write logic into `useEditShiftActions`.
- Extracted StaffManagementModal basic add/deactivate/reorder write logic into `useStaffManagementBasicActions`.
- Extracted StaffManagementModal update and staff-name/color cascade logic into `useStaffUpdateActions`.
- Extracted GAS sync orchestration from `App.jsx` into `useGasSync`.
- Added `docs/test-plan.md`.
- Added GitHub Actions CI for test, build, and lint.

## 9. Remaining Work Classification

### Required Before Main

- Confirm CI passes for the integration PR.
- Run or confirm:
  - `npm test -- --run`
  - `npm run build`
  - `npm run lint`
- Complete the manual regression checklist in `docs/test-plan.md`.
- Do not run real production GAS sync unless explicitly approved.
- Review the final diff for unintended changes to:
  - Firestore collection names,
  - Firestore document shapes,
  - GAS payload shape,
  - read-only behavior,
  - edit lock behavior,
  - drag behavior,
  - language switching.

### Recommended Before Main

- Consider whether the extracted hooks/helpers are enough, or whether a very small Firestore service layer would reduce duplication without changing behavior.
- Manually verify staff name/color update behavior, including whether past shifts are intentionally updated.
- Manually verify copy week and template apply on safe test data.
- Confirm `.github/workflows/ci.yml` does not interfere with Firebase Hosting workflows.
- Do a final code-review pass focused on read-only mode, edit lock, drag behavior, and GAS payload safety.

### Optional After Main

- Add focused tests for future pure functions or service functions after extraction.
- Expand the Firestore service layer if the required extractions prove it is useful.
- Improve stale-response/error handling for other Firestore reads and writes where useful.
- Continue reducing prop drilling in `App.jsx` if maintenance pressure justifies it.

### Deferred / Do Not Touch Now

- Do not refactor drag behavior unless there is a concrete bug.
- Review drag behavior for risk, but defer drag refactor by default.
- Do not change GAS payload shape.
- Do not change Apps Script receiver behavior.
- Do not change Firestore collection names.
- Do not change production deployment behavior.
- Do not redesign the UI as part of this architecture cleanup.
- Do not run production GAS sync during routine verification without explicit approval.

## 10. Final Done Definition

This architecture-cleanup phase is done when:

- The remaining required refactors above are complete and merged into `codex/architecture-cleanup`.
- CI passes on the integration PR.
- Local `npm test -- --run`, `npm run build`, and `npm run lint` pass or are confirmed from CI.
- Manual checks in `docs/test-plan.md` are completed for the business-critical flows.
- No production behavior changes are found in login, staff management, shift creation/edit/delete/drag, weekly navigation, copy week, template save/apply/delete, read-only viewer, edit lock, language switching, or GAS sync entry point.
- The final review confirms Firestore collection names and GAS payload shape are unchanged.
- `codex/architecture-cleanup` is merged into `main` only after the project owner accepts the remaining-refactor result and final regression result.

## 11. Next Recommended PR

Next step should be final regression and merge-readiness review.

Recommended scope:

- Confirm all required before-main refactors are complete.
- Run or confirm CI and local automated checks.
- Complete the manual regression checklist in `docs/test-plan.md`.
- Review final diff for Firestore collection names, document shapes, GAS payload shape, read-only behavior, edit lock, drag behavior, and language switching.
- Run `npm test -- --run`, `npm run build`, and `npm run lint`.
- Do not run real production GAS sync unless explicitly approved.
