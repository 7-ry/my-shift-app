# Codex Next Step

## Safest Next Implementation Step

After GAS sync orchestration extraction, the required before-main refactors are complete. The safest next step is final regression and merge-readiness review before any merge to `main`.

## Target Files

Likely files to inspect:

- `docs/test-plan.md`
- `docs/architecture-audit.md`
- GitHub Actions checks for `codex/architecture-cleanup`
- Final PR diff

## Exact Constraints

- Do not change rendered UI.
- Do not change Firestore collection names or document shapes.
- Do not change Google Apps Script payload shape.
- Do not perform new refactors during final review unless a blocking issue is found.
- Preserve read-only behavior, edit-lock semantics, drag behavior, weekly navigation, copy week, template behavior, staff management, and GAS sync entry point.
- Do not run real production GAS sync unless explicitly approved.

## Verification Commands

Run or confirm before merge-readiness:

```bash
npm test -- --run
npm run build
npm run lint
```

## Manual Checks

For final regression, manually verify:

- Login/logout.
- Read-only viewer restrictions.
- Edit lock restrictions.
- Staff management add/edit/deactivate/reorder.
- Shift create/edit/delete/drag.
- Weekly navigation and jump to today.
- Copy week and template save/apply/delete.
- GAS sync entry point, including read-only blocking and missing `VITE_GAS_URL`.
- Do not run real production GAS sync unless explicitly approved.

## Recommendation

Complete final regression and merge-readiness review next. Defer `main` merge until the project owner accepts the final automated and manual regression results.
