# Codex Next Step

## Safest Next Implementation Step

After the CI workflow is added, the safest next step is a final PR review and merge-readiness check for `codex/architecture-cleanup`.

## Target Files

Likely files to inspect:

- `.github/workflows/ci.yml`
- `docs/test-plan.md`
- `src/App.jsx`
- `src/hooks`
- `src/utils`
- `src/services/gasService.js`
- `src/components/CopyWeekModal.jsx`
- `src/hooks/useCopyWeek.js`

## Exact Constraints

- Do not change application behavior during merge-readiness review.
- Do not change Firestore collection names or document shapes.
- Do not change Google Apps Script payload shape.
- Do not run real production GAS sync without explicit approval.
- Use `docs/test-plan.md` for manual regression coverage.

## Verification Commands

Run before merge:

```bash
npm test -- --run
npm run build
npm run lint
```

## Manual Checks

Use `docs/test-plan.md`. Prioritize:

- Login/logout and read-only viewer mode.
- Edit lock behavior.
- Staff loading and staff management.
- Shift creation, edit, delete, and drag.
- Save, apply, and delete shift templates.
- Weekly navigation, jump to today, and reload behavior.
- Dashboard totals.
- Copy week and save shift template.
- GAS sync entry point without real production sync.
- Read-only viewer and edit lock behavior are unchanged.
- Japanese/English switching still works.
