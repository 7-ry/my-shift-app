# Codex Next Step

## Safest Next Implementation Step

After StaffManagementModal update/cascade extraction, do not proceed to final main merge yet. The safest next PR is GAS sync orchestration extraction from `App.jsx`, because sync is production-sensitive and should stay payload-preserving.

## Target Files

Likely files to inspect:

- `src/App.jsx`
- `src/hooks`
- `src/services/gasService.js`

## Exact Constraints

- Do not change rendered UI.
- Do not change Firestore collection names or document shapes.
- Do not change Google Apps Script payload shape.
- Preserve `syncToGAS` signature and `mode: 'no-cors'`.
- Preserve sync confirmation, success/error alerts, read-only blocking, and missing `VITE_GAS_URL` alert.
- Preserve read-only behavior and edit-lock semantics.
- Do not change drag, week navigation, auth, Header clear-week, copy week, template behavior, EditShiftModal behavior, or StaffManagementModal behavior.

## Verification Commands

Run after the next refactor:

```bash
npm test -- --run
npm run build
npm run lint
```

## Manual Checks

For the GAS sync orchestration PR, manually verify:

- Sync button remains unavailable or blocked for read-only users.
- Missing `VITE_GAS_URL` still shows the existing `.env Error: VITE_GAS_URL` alert.
- Editor sync still asks for confirmation with the selected week label.
- Success and error alerts remain unchanged.
- Do not run real production GAS sync unless explicitly approved.

## Recommendation

Implement GAS sync orchestration extraction next, then continue the remaining required refactor roadmap in `docs/architecture-audit.md`. Defer main merge until final regression is complete.
