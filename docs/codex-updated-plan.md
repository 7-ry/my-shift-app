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
- Dashboard data calculation extraction.
- Week navigation extraction.
- Auth state handling extraction.
- Shift creation hook extraction.
- Shift template save hook extraction.
- Test plan documentation in `docs/test-plan.md`.
- CI workflow for pull requests and pushes to `codex/architecture-cleanup`.

## Current Phase

- Final PR review and merge-readiness check.

## Next Safe Order

1. Confirm CI passes on pull request.
2. Run local `npm test -- --run`, `npm run build`, and `npm run lint` if needed.
3. Use `docs/test-plan.md` for manual regression coverage.
4. Run a final PR review and merge-readiness check.

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
