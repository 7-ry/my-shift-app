# GAS Sync Spec

This document records the current frontend-to-Google Apps Script sync behavior before any changes to `src/services/gasService.js`.

## Purpose

The GAS sync sends the currently selected weekly restaurant shift schedule from the web app to the production Google Sheets target, the BOH schedule spreadsheet.

The frontend builds a JSON payload and posts it to the configured Google Apps Script web app URL from `VITE_GAS_URL`. The Google Apps Script side is expected to interpret the existing payload shape exactly as documented here.

## Source Files

- `src/App.jsx`
  - Reads `VITE_GAS_URL`.
  - Blocks sync for read-only viewer mode.
  - Confirms the selected week before sync.
  - Calls `syncToGAS`.
  - Passes helper functions and wraps `getSheetCellByRow(day, row, lane)` with the app `DAYS` constant.
- `src/services/gasService.js`
  - Builds `scheduleCommands`, `dashboardRows`, and `shiftDataRows`.
  - Sends the final payload using `fetch`.
- `src/utils/helpers.js`
  - Provides time parsing/formatting, week labels, and Google Sheets cell helpers.
- `src/constants/config.js`
  - Defines `DAYS`, `LANES`, time grid constants, and translated status labels.

## Sync Entry Point

The sync request is created by `syncToGAS` with these input values:

- `gasUrl`: Google Apps Script web app URL from `VITE_GAS_URL`.
- `shifts`: current week shift objects from app state.
- `staffs`: active staff objects from app state.
- `weekId`: selected week id, such as `2026-W19`.
- `lang`: current UI language, used for `weekLabel`.
- `t`: current translation object, used for dashboard status labels.
- `helpers`: time and sheet mapping helpers passed from `App.jsx`.

## Payload Shape

The frontend sends this top-level JSON object:

```json
{
  "weekId": "2026-W19",
  "weekLabel": "May 4 - May 10",
  "scheduleCommands": [],
  "dashboardRows": [],
  "shiftDataRows": []
}
```

Do not rename, remove, or restructure these keys without coordinating with the Google Apps Script receiver.

## weekId and weekLabel

- `weekId` is passed through unchanged from app state.
- `weekLabel` is computed with `getWeekDisplayVerbose(weekId, lang)`.
- English uses the `en-CA` locale.
- Japanese uses the `ja-JP` locale.
- Example:
  - `weekId`: `2026-W19`
  - English `weekLabel`: `May 4 - May 10`
  - Japanese `weekLabel`: `5月4日 - 5月10日`

## scheduleCommands

`scheduleCommands` is an array of objects used to draw visible schedule blocks in the BOH schedule sheet.

Each command has this shape:

```json
{
  "cell": "B5",
  "endCell": "B8",
  "value": "KANA\n9-11",
  "color": "#bae6fd"
}
```

Fields:

- `cell`: top-left sheet cell for the visible shift block.
- `endCell`: bottom cell for the visible shift block.
- `value`: multi-line label containing staff name, time label, and optional break label.
- `color`: shift color from the shift object.

### scheduleCommands Source Data

The service sorts a shallow copy of `shifts` by `startTime`, then groups by:

```text
{day}_{lane}
```

Example group keys:

- `MON_1`
- `FRI_3`
- `SUN_4`

## Day, Lane, and Time Cell Mapping

Current day order comes from `DAYS`:

```js
['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
```

Lane values are expected to be numeric lane indexes. Current lanes are:

```js
[1, 2, 3, 4]
```

### Row Mapping

Rows are calculated by `getSheetRowNum(timeStr)`:

```text
row = (hour - 9) * 2 + (minute >= 30 ? 1 : 0) + 5
```

Examples:

| Time | Row |
| --- | ---: |
| `09:00` | 5 |
| `09:30` | 6 |
| `10:00` | 7 |
| `23:30` | 34 |

### Column Mapping

Cells are calculated by `getSheetCellByRow(day, row, lane, DAYS)`.

```text
dayIdx = DAYS.indexOf(day)
baseCol = 2 + dayIdx * 5
col = baseCol + (lane - 1)
cell = columnLetter(col) + row
```

Spreadsheet columns are 1-based:

- `1` -> `A`
- `2` -> `B`
- `27` -> `AA`

Examples with current `DAYS`:

| Day | Lane | Row | Cell |
| --- | ---: | ---: | --- |
| `MON` | 1 | 5 | `B5` |
| `MON` | 4 | 5 | `E5` |
| `FRI` | 3 | 16 | `X16` |
| `SUN` | 4 | 29 | `AI29` |

## Weekday and Weekend Row Limits

The service calculates:

```text
sR = getSheetRowNum(startTime)
eR = getSheetRowNum(drawEndTime) - 1
```

Then it applies row limits.

### Weekdays

Weekdays are all days except `SAT` and `SUN`.

If `sR <= 16`:

- `eR = min(eR, 16)`

Otherwise:

- `sR = max(sR, 21)`
- `eR = min(eR, 29)`

This creates two allowed weekday schedule bands:

- Morning/lunch band ending at row `16`
- Later band starting at row `21` and ending by row `29`

### Weekends

Weekend days are `SAT` and `SUN`.

- `sR = max(sR, 5)`
- `eR = min(eR, 29)`

Weekend visible blocks are limited to rows `5` through `29`.

### Skipped Commands

A shift does not create a `scheduleCommands` entry if:

- `sR > 40`
- `sR < 5`
- `eR < sR`

## Overlap Handling with drawEndTime

Before creating `scheduleCommands`, shifts are grouped by day and lane.

Each grouped shift starts with:

```js
drawEndTime: s.endTime
```

For adjacent shifts in the same day/lane group, if the current shift overlaps the next shift:

```text
current.endTime > next.startTime
```

then the current shift's visible `drawEndTime` is shortened to the next shift's `startTime`.

Important behavior:

- `drawEndTime` affects the visible block range only.
- The displayed label still uses the original `endTime`.
- `shiftDataRows` still uses the original `endTime`.

## Time Label Formatting

Times are formatted by `formatTime12`.

Examples:

| Input | Output |
| --- | --- |
| `09:00` | `9` |
| `09:30` | `9:30` |
| `13:00` | `1` |
| `00:00` | `12` |

No AM/PM marker is included.

The schedule command time label starts as:

```text
startStr-endStr
```

If the full time string is long, it wraps across two lines:

```text
startStr-
endStr
```

Current wrap thresholds:

- If `extendedEndTime` is present and the full time string contains `(`: threshold is `10`.
- Otherwise: threshold is `9`.
- Wrapping happens when `fullTimeStr.length >= threshold`.

## extendedEndTime Formatting

If a shift has `extendedEndTime`, the formatted extended end is appended to the displayed end time in parentheses.

Example:

```text
9-5(6)
```

Only the display label is affected. The block row range uses `drawEndTime`, which starts from `endTime` and may be shortened by overlap handling.

## breakHours Display

`breakHours` adds an extra line to the schedule command label:

| breakHours | Label |
| ---: | --- |
| `0` | no break label |
| `0.5` | `30m` |
| `>= 1` | `{breakHours}h` |

Final value shape:

```text
staffName
timeLabel
breakLabel
```

Examples:

```text
KANA
9-5
30m
```

```text
RYUSHIN
11-
7(8)
1h
```

## dashboardRows

`dashboardRows` is an array of arrays, one row per staff member.

Shape:

```js
[
  staff.name,
  current,
  staff.target,
  '',
  rem,
  statusLabel
]
```

Fields:

| Index | Meaning |
| ---: | --- |
| 0 | Staff name |
| 1 | Current scheduled hours, rounded to 2 decimals |
| 2 | Target hours |
| 3 | Empty placeholder string |
| 4 | Remaining hours, rounded to 2 decimals |
| 5 | Status label |

`current` is calculated by summing `totalHours` for shifts where `s.staffName === staff.name`.

`rem` is:

```text
staff.target - current
```

Status labels:

- If `rem < 0`: `⚠️ ${t.over}`
- Else if `rem > 0`: `t.room`
- Else: `t.met`

## shiftDataRows

`shiftDataRows` is an array of arrays, one row per shift.

Shape:

```js
[
  s.day,
  s.staffName,
  s.startTime,
  s.endTime,
  s.lane,
  s.breakHours,
  s.totalHours
]
```

Field order is part of the current contract with the Google Apps Script receiver and should not be changed without updating the receiver.

## Fetch Behavior and no-cors Limitation

The frontend sends the payload with:

```js
fetch(gasUrl, {
  method: 'POST',
  mode: 'no-cors',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
```

Current limitation:

- `mode: 'no-cors'` returns an opaque response.
- The frontend cannot inspect the HTTP status code or response body.
- A resolved fetch does not prove that the Google Apps Script successfully processed the payload.
- The UI currently reports success after the fetch promise resolves.

## Known Risks and Edge Cases

- BOH schedule is the production sync target, so payload compatibility is business-critical.
- `scheduleCommands` row limits can skip shifts if the calculated visible range is outside allowed bands.
- Weekday shifts crossing the gap between row `16` and row `21` may be clipped according to current row-band rules.
- Overlap handling only compares adjacent shifts after sorting by `startTime` within the same day/lane group.
- `drawEndTime` affects the visible block size but not the displayed label or `shiftDataRows`.
- Time labels omit AM/PM, so spreadsheet context must make morning/evening clear.
- `extendedEndTime` is display-only in `scheduleCommands`.
- `breakHours` display has special handling for `0.5`; other values `>= 1` are displayed as hours.
- `dashboardRows` depends on `shift.totalHours` already being accurate in app state.
- `shiftDataRows` preserves shift order from the `shifts` array, not the sorted `processedShifts`.
- If `gasUrl` is missing, sync is blocked before calling `syncToGAS`.
- Read-only viewer mode blocks sync before calling `syncToGAS`.

## Change Control Notes

Before changing `src/services/gasService.js`, verify that the intended change preserves or deliberately migrates:

- top-level payload keys,
- `scheduleCommands` object fields,
- `dashboardRows` array order,
- `shiftDataRows` array order,
- day/lane/time to cell mapping,
- row clipping rules,
- overlap behavior,
- `no-cors` assumptions.

