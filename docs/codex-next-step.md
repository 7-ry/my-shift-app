# Codex Next Step

## Safest Next Implementation Step

The architecture-cleanup branch has been merged into `main`. The project is now in the post-main safety follow-up phase.

Do not start broad refactors or new feature work yet. First, follow the ordered roadmap in `docs/post-main-roadmap.md`.

## Target Files

Read first:

- `docs/post-main-roadmap.md`
- `docs/test-plan.md`
- `docs/architecture-audit.md`
- `docs/gas-sync-spec.md`
- `src/hooks/useStaffUpdateActions.js`
- `src/hooks/useCopyWeek.js`
- `src/hooks/useGasSync.js`
- `src/hooks/useShiftDrag.js`

## Exact Constraints

- Branch from `main` for all new work.
- Keep each PR small and single-purpose.
- Do not change rendered UI unless the task explicitly requires it.
- Do not change Firestore collection names or document shapes.
- Do not change Google Apps Script payload shape.
- Do not run real production GAS sync unless explicitly approved.
- Do not refactor drag behavior unless a concrete bug is confirmed.
- Do not mix safety follow-ups with new feature work.

## Recommended Next PR

Create a small branch from `main`:

```bash
git checkout main
git pull origin main
git checkout -b codex/staff-update-error-feedback
```

Goal:

- Add user-facing failure feedback for staff update/cascade failures.
- Preserve `console.error`.
- Preserve the current Firestore batch/cascade behavior.
- Do not solve the batch limit issue in the same PR.

Suggested verification:

```bash
npm test -- --run
npm run build
npm run lint
```

## Next Roadmap After That

Follow this order:

1. Staff update failure user-facing alert.
2. Staff cascade batch limit guard design.
3. Non-production GAS sync verification environment.
4. Manuscript / new feature updates.
5. Optional project re-audit after safety follow-ups or real production usage.
6. Drag behavior remains deferred unless a concrete bug appears.

## Recommendation

Start with `codex/staff-update-error-feedback`. Do not start a broad audit or drag refactor yet.
