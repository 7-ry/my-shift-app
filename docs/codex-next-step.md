# Codex Next Step

## Safest Next Implementation Step

After EditShiftModal save/delete extraction, do not proceed to final main merge yet. The safest next PR is StaffManagementModal write logic extraction in small batches, because staff writes and staff-name/color cascade behavior are business-sensitive.

## Target Files

Likely files to inspect:

- `src/App.jsx`
- `src/components/StaffManagementModal.jsx`
- `src/hooks`

## Exact Constraints

- Do not change rendered UI.
- Do not change Firestore collection names or document shapes.
- Do not change Google Apps Script payload shape.
- Preserve StaffManagementModal props unless a tiny wiring change is strictly necessary.
- Preserve staff add, deactivate, reorder, update, inactive staff behavior, and staff-name/color cascade behavior.
- Preserve read-only behavior and edit-lock semantics.
- Do not change GAS sync, drag, week navigation, auth, Header clear-week, copy week, template behavior, or EditShiftModal behavior.

## Verification Commands

Run after the next refactor:

```bash
npm test -- --run
npm run build
npm run lint
```

## Manual Checks

For the StaffManagementModal PR, manually verify:

- The staff management modal still opens/closes.
- Adding staff still writes Firestore and updates local staff state.
- Editing staff still updates Firestore and local staff state.
- Deactivating staff still preserves current inactive-staff behavior.
- Reordering staff still preserves order behavior.
- Staff name/color cascade into matching shifts still behaves exactly as before.

## Recommendation

Implement StaffManagementModal write extraction next in small safe batches, then continue the remaining required refactor roadmap in `docs/architecture-audit.md`. Defer main merge until those required refactors and final regression are complete.
