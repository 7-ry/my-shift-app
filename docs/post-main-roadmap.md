# Post-Main Roadmap

Last updated: 2026-05-22

## Purpose

This document records the safest post-main direction after the architecture-cleanup branch was merged into `main`.

The goal is to avoid jumping straight into broad refactors or new features. The next phase should first stabilize production safety, document remaining risks, then resume feature work in small PRs.

## Current State

- `codex/architecture-cleanup` has been merged into `main`.
- Production smoke check did not reveal a blocking issue.
- The branch is intentionally kept for now as a safety reference.
- Architecture cleanup required before-main refactors are complete.
- New work should now branch from `main`.

## Guiding Principles

- Use `main` as the base for all post-main work.
- Create one small PR per concern.
- Prefer documentation and planning before changing production-sensitive logic.
- Do not change Firestore collection names: `staffs`, `shifts`, `shiftTemplates`.
- Do not change Firestore document shapes unless explicitly planned and migrated.
- Do not change GAS payload shape.
- Do not run real production GAS sync unless explicitly approved.
- Do not refactor drag behavior unless a concrete bug is found.
- Do not mix feature work with safety hardening.

## Recommended Order

### 1. Staff update failure user feedback

Recommended first implementation PR:

- Add a user-facing failure alert when staff update or staff name/color cascade fails.
- Preserve the existing `console.error` behavior.
- Preserve current Firestore batch behavior.
- Keep this PR limited to `useStaffUpdateActions` and translations only if needed.

Reason:

- This is small, safe, and directly addresses the remaining review feedback that users currently receive no clear failure signal.

### 2. Staff cascade batch limit safety design

Recommended second step:

- Do not immediately implement chunked writes.
- First design the safest behavior for cases where staff name/color cascade affects too many shift documents.
- Prefer a conservative guard that prevents partial or risky updates and shows clear user feedback.
- Treat chunked batch updates as a separate design because they reduce atomicity and need recovery behavior.

Preferred direction:

- Keep atomic behavior for normal-sized cascades.
- Detect or guard large cascade sets before committing.
- If the update cannot be performed safely, do not update staff or shifts and show a user-facing message.

Reason:

- The current cascade touches all historical shifts matching `staffName == oldStaff.name`.
- The risk is real, but rushing into chunking can create partial-update failure modes.

### 3. Non-production GAS sync verification environment

Recommended third step:

- Create or document a test GAS URL and test spreadsheet.
- Verify sync behavior against non-production targets only.
- Confirm `SCHEDULE`, `DASHBOARD`, and `SHIFT_DATA` mapping using safe test data.
- Keep `syncToGAS` signature, `mode: 'no-cors'`, and payload shape unchanged.

Reason:

- Production GAS sync affects real spreadsheet data.
- Because `no-cors` limits frontend response visibility, spreadsheet-side verification is required.

### 4. Manuscript / feature updates

Recommended after the safety items above:

- Resume feature work once production safety follow-ups are documented or completed.
- Keep feature PRs separate from refactors.
- Start with the smallest useful feature update rather than broad redesign.

Potential examples:

- Manuscript / draft feature improvements.
- Usability improvements for shift entry.
- Safer confirmation or preview flows for destructive actions.

### 5. Optional project re-audit

Recommended timing:

- Do not run another broad architecture audit immediately after the main merge.
- Re-audit after the post-main safety PRs or after some real production usage.

Reason:

- A broad audit right now is likely to produce many optional ideas and distract from targeted safety work.

### 6. Drag behavior remains deferred

Policy:

- Do not refactor drag behavior without a concrete bug.
- If drag issues appear, first perform a code-read audit with no code changes.
- Only then decide whether a small bugfix PR is justified.

Reason:

- Drag behavior is business-critical and easy to break.
- The architecture cleanup intentionally avoided changing drag logic.

## Suggested PR Sequence

1. `codex/staff-update-error-feedback`
   - Add user-facing alert for staff update/cascade failure.

2. `codex/staff-cascade-limit-guard-plan`
   - Either documentation-only design or a small guard implementation, depending on the agreed approach.

3. `codex/non-production-gas-sync-plan`
   - Document or configure a non-production GAS verification path.

4. Feature branch from `main`
   - Start manuscript/new feature work only after the safety follow-ups are stable.

## Do Not Do Yet

- Do not start broad service-layer refactors.
- Do not refactor `useShiftDrag`.
- Do not change the GAS payload shape.
- Do not run production GAS sync as part of routine testing.
- Do not combine safety follow-ups with new UI feature work.

## Completion Criteria For This Planning Phase

This planning phase is complete when:

- This roadmap exists in docs.
- `docs/codex-next-step.md` points to the first post-main safety PR.
- `docs/codex-updated-plan.md` reflects that the project is now post-main.
- Future Codex sessions can resume without re-deciding the high-level order.
