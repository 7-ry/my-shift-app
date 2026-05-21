# Codex Session Log

This log reconstructs the current project state from local git history and known Codex session outcomes.

## Timeline

- Phase 0 to Phase 2: Added minimal Vitest setup and helper tests before changing helper behavior.
- Lint cleanup phase: Removed safe unused imports/props and fixed duplicate keys without touching business behavior.
- PR #4: Added `docs/gas-sync-spec.md` to document BOH schedule GAS sync behavior.
- PR #5: Extracted `buildGASPayload` and added GAS payload contract tests.
- PR #6: Split GAS payload building into internal builder functions.
- PR #7: Fixed dashboard OVER status contract for the Apps Script receiver.
- PR #8: Optimized dashboard row total calculation with a `Map`.
- PR #9: Added `GAS_STATUS_OVER` cleanup and documentation clarification.
- PR #10: Extracted week-specific shift reads into `useWeekShifts`.
- PR #11: Hardened `useWeekShifts` with stale-response guard and Firestore error logging.
- PR #12: Cleared shifts when the user is missing.
- PR #13: Extracted staff fetching and initial staff bootstrap into `useStaffs`.
- Current decision: create tracking docs and an updated plan before further `App.jsx` refactors.

## GAS Sync Work Summary

- The production sync target is the BOH schedule spreadsheet.
- `docs/gas-sync-spec.md` documents the current frontend payload and spreadsheet mapping.
- `src/services/gasService.js` now builds payloads through focused internal builders.
- Payload keys remain:
  - `weekId`
  - `weekLabel`
  - `scheduleCommands`
  - `dashboardRows`
  - `shiftDataRows`
- `syncToGAS` still uses the same signature and `mode: 'no-cors'`.
- GAS receiver compatibility was protected by tests, including the stable `⚠️ OVER` dashboard status.

## Firestore Hook Extraction Summary

- `src/hooks/useWeekShifts.js` owns week shift reads from the `shifts` collection.
- `useWeekShifts` preserves the original query and mapping.
- It now prevents stale async responses from overwriting current state.
- It clears shifts when `user` is missing.
- `src/hooks/useStaffs.js` owns staff reads and initial staff bootstrap from the `staffs` collection.
- `useStaffs` preserves read-only behavior, `hasInitialized` behavior, initial staff data, ordering, active filtering, and selected staff initialization.

## Current State

- Current branch at inspection: `codex/add-progress-tracking-docs`
- HEAD at inspection: `406e999`
- Working tree before creating these docs: clean
- Existing hooks: `useShiftDrag`, `useWeekShifts`, `useStaffs`
- Existing docs before this update: `docs/gas-sync-spec.md`

## Decision

Before further code extraction, keep a written checkpoint so a future Codex session can resume safely from the actual repository state rather than the older original plan.
