# Codex Updated Plan

This plan reflects the project state after PR #34 merged the architecture-cleanup work into `main`.

## Completed Phases

- Baseline Vitest setup and helper tests.
- GAS sync documentation and payload contract tests.
- GAS payload builder extraction and dashboard OVER status contract cleanup.
- Week shift reads extracted into `useWeekShifts`.
- Staff reads and initial staff bootstrap extracted into `useStaffs`.
- Dashboard data calculation extracted into `buildDashboardData`.
- Week navigation, auth state, shift creation, template save, and copy week extracted into hooks.
- Header clear-week logic extracted into `useClearWeek`.
- CopyWeekModal template fetch/apply/delete extracted into `useCopyWeekTemplates`.
- EditShiftModal save/delete extracted into `useEditShiftActions`.
- StaffManagementModal basic actions extracted into `useStaffManagementBasicActions`.
- StaffManagementModal update/cascade extracted into `useStaffUpdateActions`.
- GAS sync orchestration extracted into `useGasSync`.
- `docs/test-plan.md`, `docs/architecture-audit.md`, and CI workflow added.
- Architecture cleanup merged into `main` through PR #34.

## Current Phase

- Post-main roadmap documentation and targeted follow-up planning.
- Use `docs/post-main-roadmap.md` as the source of truth for the next work sequence.

## Next Safe Order

1. Add user-facing feedback for staff update/cascade failure.
2. Design staff cascade batch-limit handling before implementation.
3. Plan a non-production GAS sync verification path.
4. Resume manuscript or new feature work after the safety follow-ups.
5. Re-audit only after targeted follow-ups or real production usage.
6. Keep drag behavior deferred unless a concrete bug appears.

## Immediate Next PR

- Branch from `main`: `codex/staff-update-error-feedback`.
- Scope: add user-facing failure alert for staff update/cascade failure.
- Do not solve batch-limit handling in the same PR.
- Do not touch GAS sync or drag logic.

## Later Phases

- Add focused tests where the setup stays lightweight.
- Consider a non-production Firebase/GAS verification setup.
- Consider a small Firestore service layer only if duplication becomes painful.
- Continue prop-drilling cleanup only if maintenance pressure justifies it.

## Deferred Decisions

- Do not change Firestore collection names.
- Do not change Firestore document shapes.
- Do not change GAS payload shape.
- Do not change Apps Script receiver behavior.
- Do not run real GAS sync without explicit approval.
- Do not refactor drag behavior without a confirmed bug.
- Do not combine safety follow-ups with feature work.

## Safety Principles

- Keep each PR small and reversible.
- Preserve production scheduling behavior first.
- Prefer documentation and narrow fixes before broad refactors.
- Run `npm test -- --run`, `npm run build`, and `npm run lint` after code changes.
- Pair automated checks with manual checks when touching business-critical flows.
