# Test Plan

This checklist is for validating changes before merging into main. The app is production-used for restaurant shift scheduling, so run the required checks before merge and use the manual sections for business-critical regression coverage.

## Automated Checks

Run from the repository root:

```bash
npm test -- --run
npm run build
npm run lint
```

Expected result:

- All Vitest tests pass.
- Vite production build completes.
- ESLint completes with no errors.
- The known Vite chunk size warning may appear during build.

## Manual Smoke Checks

- Login flow:
  - Log in with an editor account.
  - Confirm the loading screen disappears.
  - Confirm the main schedule UI appears.
- Logout flow:
  - Click logout.
  - Confirm `t.logoutConfirm` appears.
  - Confirm accepting logout returns to the Login screen.
- Language switching:
  - Switch between English and Japanese.
  - Confirm visible labels update without changing schedule data.
- Staff list loading:
  - Confirm active staff are shown in expected order.
  - Confirm inactive staff do not appear if available in test data.
- Selected staff initial value:
  - Confirm the first loaded staff is selected when no staff was previously selected.
- Weekly navigation:
  - Move to previous and next weeks.
  - Confirm the week label and displayed shifts update.
- Jump to today:
  - Click jump to today.
  - Confirm the selected week returns to the current week.
- Reload and `lastViewedWeek`:
  - Navigate to a non-current week.
  - Reload the page.
  - Confirm the same week is restored.

## Critical Regression Checks

- Read-only viewer mode:
  - Log in as the configured viewer email.
  - Confirm sync, staff changes, shift creation, and other edit actions are blocked.
  - Confirm no initial staff auto-create happens in read-only mode.
- Edit lock mode:
  - Confirm shift creation is blocked while edit lock is enabled.
  - Confirm drag/edit interactions are blocked while locked.
  - Unlock and confirm permitted editor actions work again.
- Staff management modal:
  - Open the staff management modal.
  - Confirm staff data displays correctly.
  - If using safe test data, verify add/edit/deactivate behavior without affecting production data.
- Shift creation:
  - Select a staff member.
  - Double-click an empty slot in `ShiftTable`.
  - Confirm a shift is created in the selected week/day/lane.
  - Confirm default duration remains two hours, capped at `23:30`.
  - Confirm `totalHours` uses the existing 15-minute rounding behavior.
- Off-day confirmation:
  - Choose a staff member with the target day in `offDays`.
  - Add a shift on that day.
  - Confirm the off-day warning appears.
  - Cancel and confirm no shift is created and processing state recovers.
  - Accept and confirm the shift is created.
- Shift editing:
  - Open an existing shift.
  - Change start/end/break values.
  - Confirm total hours and displayed schedule block update.
- Shift deletion:
  - Delete a shift from the edit flow.
  - Confirm it disappears from the schedule and dashboard totals update.
- Shift drag behavior:
  - Drag a shift within valid bounds.
  - Confirm optimistic UI movement works.
  - Confirm persisted shift time and total hours are correct after refresh.
  - Confirm drag is blocked in read-only or edit-lock mode.
- Dashboard totals:
  - Confirm current hours, remaining hours, and progress percentages match the visible shifts.
  - Confirm over-target staff display correctly.
  - Confirm totals update after create, edit, delete, and drag.
- Copy week flow:
  - Copy a previous week into the selected week using safe test data.
  - Confirm copied shifts appear in the destination week.
  - Confirm source week data remains unchanged.
- Save shift template flow:
  - Save a template from a week with shifts.
  - Confirm the success message appears.
  - Confirm saved template shifts exclude per-week IDs and retain recalculated total hours.
- GAS sync entry point:
  - Confirm sync button is unavailable or blocked for read-only users.
  - Confirm editor sync prompts for confirmation with the selected week label.
  - Confirm missing `VITE_GAS_URL` shows the existing `.env Error: VITE_GAS_URL` alert.
  - Do not run real production GAS sync unless explicitly approved.

## Optional Checks

- Mobile, tablet, or iPad visual sanity:
  - Open the app at phone width.
  - Open the app at tablet/iPad width.
  - Confirm header controls, dashboard, timetable grid, modals, and language switching remain usable.
- Browser refresh after writes:
  - After safe test create/edit/delete actions, refresh and confirm Firestore-backed state reloads as expected.
- GAS test environment:
  - If a non-production GAS URL and spreadsheet are explicitly provided, run a sync against that test target only.
  - Confirm the payload still maps to `SCHEDULE`, `DASHBOARD`, and `SHIFT_DATA` as documented in `docs/gas-sync-spec.md`.

## Safety Notes

- Do not use production Google Apps Script sync during routine regression testing without explicit approval.
- Prefer safe test data or a non-production Firebase project for destructive checks.
- Do not change Firestore collection names: `staffs`, `shifts`, `shiftTemplates`.
- Do not change the GAS payload shape during test-plan execution.
- Treat login, staff management, shift creation, drag behavior, read-only mode, edit lock, weekly navigation, copy week, template save, and GAS sync as business-critical flows.
