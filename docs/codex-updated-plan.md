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
- Copy week hook extraction.
- Header clear-week hook extraction.
- CopyWeekModal template fetch/apply/delete hook extraction.
- EditShiftModal save/delete hook extraction.
- Test plan documentation in `docs/test-plan.md`.
- CI workflow for pull requests and pushes to `codex/architecture-cleanup`.
- Architecture audit documentation in `docs/architecture-audit.md`.

## Current Phase

- Complete remaining required refactors before merging `codex/architecture-cleanup` into `main`.

## Next Safe Order

1. Extract StaffManagementModal write logic in small safe batches.
2. Extract GAS sync orchestration from `App.jsx`.
3. Consider a small Firestore service layer only if it reduces duplication without changing behavior.
4. Confirm CI and local checks.
5. Use `docs/test-plan.md` for manual regression coverage.
6. Run final PR review and merge-readiness check.

## Later Phases

- Add focused tests for extracted pure calculations where the test setup stays lightweight.
- Consider manual browser regression with a safe non-production Firebase/GAS setup when available.
- Continue reducing prop drilling in `App.jsx` if maintenance pressure justifies it.

## Deferred Decisions

- Do not change Firestore collection names.
- Do not change Firestore document shapes.
- Do not change GAS payload shape.
- Do not change Apps Script receiver behavior.
- Do not change UI design as part of architecture cleanup.
- Do not run real GAS sync without explicit approval.
- Defer drag refactor unless a concrete bug exists.

## Difference From The Original Plan

The original plan expected more `App.jsx` cleanup before the GAS work and before Firestore read hook extraction. The actual safe order completed substantial GAS sync hardening first, then extracted week shift and staff read hooks. This updated plan follows the repository as it exists now rather than trying to force the older sequence back into place.

## Safety Principles

- Keep each PR small and reversible.
- Preserve production scheduling behavior first.
- Prefer straight code moves before behavior improvements.
- Run automated checks after every code change.
- Pair automated checks with manual checks for login, staff management, shift editing, dragging, weekly navigation, copy week, read-only viewer, edit lock, language switching, and GAS sync entry points.
