# my-shift-app Codex Rules

This is a production-used restaurant shift scheduling web app.

## Tech Stack
- React 19
- Vite
- Firebase Auth
- Firestore
- Tailwind CSS
- Google Apps Script sync

## Critical Business Rules
- Do not break the existing shift creation workflow.
- Do not change Firestore collection names unless explicitly requested.
- Do not change Google Apps Script payload shape unless explicitly requested.
- Preserve Japanese and English language support.
- Preserve read-only viewer restrictions.
- Preserve edit lock behavior.
- Preserve drag-and-drop shift editing behavior.
- Preserve weekly navigation and copy-week behavior.

## File Responsibility Rules
- React UI components should stay in src/components.
- Firebase and Firestore logic should be isolated into services or hooks when refactoring.
- Pure calculation utilities should stay in src/utils.
- Constants and translations should stay in src/constants.
- Google Sheets sync logic should stay in src/services/gasService.js or a related service file.

## Safety Rules
- Before editing files, create a plan first.
- Prefer small, reviewable changes.
- Do not rewrite App.jsx all at once.
- Do not make unrelated design changes.
- Do not mix unrelated refactors with feature changes.
- After changes, run:
  - npm run lint
  - npm run build

## Done When
- The app builds successfully.
- Existing shift creation, editing, copying, and sync flows are preserved.
- Changed files are listed clearly.
- Any risky behavior change is explained.
