# Codex Next Step

## Safest Next Implementation Step

After the owner decision, do not proceed to final main merge yet. The safest next PR is Header clear-week logic extraction, because it is a small isolated destructive Firestore write that can be moved behind a hook or helper while preserving current UI behavior.

## Target Files

Likely files to inspect:

- `src/App.jsx`
- `src/components/Header.jsx`
- `src/hooks`
- `docs/architecture-audit.md`
- `docs/architecture-audit.md`

## Exact Constraints

- Do not change rendered UI.
- Do not change Firestore collection names or document shapes.
- Do not change Google Apps Script payload shape.
- Preserve Header props unless a tiny wiring change is strictly necessary.
- Preserve clear-week confirmation, batch deletion, `setShifts([])`, and menu close behavior.
- Preserve read-only behavior and edit-lock semantics.
- Do not change GAS sync, drag, week navigation, auth, copy week, or template behavior.

## Verification Commands

Run after the next refactor:

```bash
npm test -- --run
npm run build
npm run lint
```

## Manual Checks

For the Header clear-week PR, manually verify:

- The menu still opens/closes.
- Clear week still asks `t.confirmClear`.
- Cancel leaves shifts untouched.
- Confirm deletes only current displayed shifts and then clears local `shifts`.
- Read-only users still cannot access the clear action.
- Other Header actions still work: sync entry point, copy modal, staff modal, logout, language switching, week navigation, edit lock.

## Recommendation

Implement Header clear-week extraction first, then continue the remaining required refactor roadmap in `docs/architecture-audit.md`. Defer main merge until those required refactors and final regression are complete.
