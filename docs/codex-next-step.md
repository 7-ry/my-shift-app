# Codex Next Step

## Safest Next Implementation Step

After Header clear-week logic extraction, do not proceed to final main merge yet. The safest next PR is CopyWeekModal template fetch/apply/delete extraction, because template behavior still contains Firestore reads/writes inside the modal component.

## Target Files

Likely files to inspect:

- `src/App.jsx`
- `src/components/CopyWeekModal.jsx`
- `src/hooks`
- `docs/architecture-audit.md`

## Exact Constraints

- Do not change rendered UI.
- Do not change Firestore collection names or document shapes.
- Do not change Google Apps Script payload shape.
- Preserve CopyWeekModal props unless a tiny wiring change is strictly necessary.
- Preserve template fetch, apply, delete, alert/confirmation, modal close, selected week, and `setShifts` behavior.
- Preserve read-only behavior and edit-lock semantics.
- Do not change GAS sync, drag, week navigation, auth, Header clear-week, or past-week copy behavior.

## Verification Commands

Run after the next refactor:

```bash
npm test -- --run
npm run build
npm run lint
```

## Manual Checks

For the CopyWeekModal template PR, manually verify:

- The copy modal still opens/closes.
- Existing templates still load.
- Applying a template still writes shifts to the current week and updates visible shifts.
- Deleting a template still removes it from the template list.
- Read-only users still cannot access edit/template actions.
- Past-week copy behavior still works through the existing `useCopyWeek` path.

## Recommendation

Implement CopyWeekModal template extraction next, then continue the remaining required refactor roadmap in `docs/architecture-audit.md`. Defer main merge until those required refactors and final regression are complete.
