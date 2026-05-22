# Codex Next Step

## Safest Next Implementation Step

After StaffManagementModal basic action extraction, do not proceed to final main merge yet. The safest next PR is StaffManagementModal update and staff-name/color cascade extraction, because this remaining write path is business-sensitive.

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
- Preserve staff update, inactive staff behavior, and staff-name/color cascade behavior.
- Preserve the already-extracted staff add, deactivate, and reorder behavior.
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

For the StaffManagementModal update/cascade PR, manually verify:

- The staff management modal still opens/closes.
- Editing staff still updates Firestore and local staff state.
- Staff name/color cascade into matching shifts still behaves exactly as before.
- Adding, deactivating, and reordering staff still work after the basic-action extraction.

## Recommendation

Implement StaffManagementModal update/cascade extraction next, then continue the remaining required refactor roadmap in `docs/architecture-audit.md`. Defer main merge until those required refactors and final regression are complete.
