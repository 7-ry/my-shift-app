# Codex Next Step

## Safest Next Implementation Step

Commit these progress documents first. After that, the safest code change is to extract the `dashboardData` calculation from `src/App.jsx` without changing its output shape or the `Dashboard` component API.

## Target Files

Likely files for the next implementation PR:

- `src/App.jsx`
- New pure utility file, likely `src/utils/dashboardData.js`
- Optional focused test file if the extracted calculation is made easy to test

## Exact Constraints

- Do not change UI design.
- Do not change Firestore collection names or document shapes.
- Do not change Google Apps Script payload shape.
- Do not change `Dashboard` props in the first extraction.
- Do not change staff order.
- Do not change shift filtering by `staffName`.
- Preserve current total hour rounding behavior.
- Preserve current `remaining` calculation behavior.
- Preserve current `progressPercent` calculation behavior.
- Keep the first implementation as a straight extraction.

## Verification Commands

Run after the next code change:

```bash
npm test -- --run
npm run build
npm run lint
```

For this documentation-only step, verify that only docs changed:

```bash
git status --short
```

## Manual Checks

After extracting dashboard data, manually verify:

- Dashboard staff cards still show the same current hours.
- Remaining hours match the previous behavior.
- Over-target staff still display correctly.
- Staff order matches the staff list order.
- Adding, editing, deleting, and dragging shifts updates dashboard totals.
- Read-only viewer and edit lock behavior are unchanged.
- Japanese/English switching still works.
