# Codex Next Step

## Safest Next Implementation Step

After CopyWeekModal template extraction, do not proceed to final main merge yet. The safest next PR is EditShiftModal save/delete extraction, because shift edit/delete Firestore writes still live inside a UI modal.

## Target Files

Likely files to inspect:

- `src/App.jsx`
- `src/components/EditShiftModal.jsx`
- `src/hooks`

## Exact Constraints

- Do not change rendered UI.
- Do not change Firestore collection names or document shapes.
- Do not change Google Apps Script payload shape.
- Preserve EditShiftModal props unless a tiny wiring change is strictly necessary.
- Preserve shift save, delete, total hour recalculation, alert/error behavior, modal close, and `setShifts` behavior.
- Preserve read-only behavior and edit-lock semantics.
- Do not change GAS sync, drag, week navigation, auth, Header clear-week, copy week, or template behavior.

## Verification Commands

Run after the next refactor:

```bash
npm test -- --run
npm run build
npm run lint
```

## Manual Checks

For the EditShiftModal PR, manually verify:

- The edit modal still opens/closes for an existing shift.
- Saving a shift still updates Firestore and local shift state.
- Deleting a shift still removes it from Firestore and local shift state.
- Total hours still recalculate exactly as before.
- Read-only users still cannot edit or delete.
- Dashboard totals and visible schedule blocks still update after save/delete.

## Recommendation

Implement EditShiftModal save/delete extraction next, then continue the remaining required refactor roadmap in `docs/architecture-audit.md`. Defer main merge until those required refactors and final regression are complete.
