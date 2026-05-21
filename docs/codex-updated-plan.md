# Codex Updated Plan

This plan replaces the earlier ordering with the actual current repository state. The safety loop remains: plan, small change, test/build/lint, manual check, commit.

## Completed Phases

- Baseline safety checks and minimal Vitest setup.
- Helper tests without changing helper behavior.
- Safe lint cleanup batches.
- GAS sync documentation in `docs/gas-sync-spec.md`.
- GAS payload extraction, contract tests, builder split, status contract fix, performance cleanup, and JSDoc cleanup.
- Week shift Firestore read extraction into `useWeekShifts`.
- `useWeekShifts` robustness follow-ups.
- Staff fetching and initial staff bootstrap extraction into `useStaffs`.

## Current Phase

- Create progress tracking documents:
  - `docs/codex-progress.md`
  - `docs/codex-next-step.md`
  - `docs/codex-session-log.md`
  - `docs/codex-updated-plan.md`

## Next Safe Order

1. Commit these progress docs.
2. Extract `dashboardData` calculation from `src/App.jsx`.
3. Extract week navigation logic from `src/App.jsx`.
4. Extract auth state handling from `src/App.jsx`.
5. Extract remaining shift creation logic in small steps.
6. Create `docs/test-plan.md`.
7. Add a CI workflow for `npm test -- --run`, `npm run build`, and `npm run lint`.
8. Run a final PR review and merge-readiness check.

## Later Phases

- Consider a small Firestore service layer only after hooks are stable.
- Add focused tests for extracted pure calculations where the test setup stays lightweight.
- Consider manual browser regression with a safe non-production Firebase/GAS setup when available.

## Deferred Decisions

- Do not change Firestore collection names.
- Do not change Firestore document shapes.
- Do not change GAS payload shape.
- Do not change Apps Script receiver behavior.
- Do not change UI design as part of architecture cleanup.
- Do not run real GAS sync without explicit approval.

## Difference From The Original Plan

The original plan expected more `App.jsx` cleanup before the GAS work and before Firestore read hook extraction. The actual safe order completed substantial GAS sync hardening first, then extracted week shift and staff read hooks. This updated plan follows the repository as it exists now rather than trying to force the older sequence back into place.

## Safety Principles

- Keep each PR small and reversible.
- Preserve production scheduling behavior first.
- Prefer straight code moves before behavior improvements.
- Run automated checks after every code change.
- Pair automated checks with manual checks for login, staff management, shift editing, dragging, weekly navigation, copy week, read-only viewer, edit lock, language switching, and GAS sync entry points.
