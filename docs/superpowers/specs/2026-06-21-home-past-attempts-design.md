# Home "Past attempts" Screen — Design

Date: 2026-06-21
Status: Approved

## Goal

Add a "Past attempts" button to the home screen that opens a dedicated history
screen listing all previously completed quiz attempts, grouped by quiz, with a
Back button to return to the menu.

## Background

Attempts are persisted by `AttemptRepository`, which already exposes
`allByQuiz(): Record<string, Attempt[]>`. Each `Attempt` stores `quizId`,
`quizTitle`, `timestamp`, `pct`, etc. Combined quiz runs all save under the
synthetic `quizId: "combined"` but carry distinct `quizTitle` values (the joined
topic list). Today history is only visible in `QuizRunner`'s submitted/results branch via
`<History attempts={attemptRepo.listByQuiz(quiz.id)} />`.

## Decisions

- **Navigation:** a dedicated history screen (matches the app's screen-based
  flow: menu / runner / results), reached from a button on the home.
- **Grouping:** grouped by `quizId` using `allByQuiz()`. Combined runs lump into
  one `"combined"` group.
- **Group heading:** `"Combined quizzes"` when the group's quizId is
  `"combined"`; otherwise the quizTitle of the group's most recent attempt.
- **Title column:** `History` gains an optional `showTitle` prop. The history
  screen turns it on (so combined rows are disambiguated by their topic set);
  the post-quiz Results usage stays Date + Score.
- **Ordering:** groups ordered by their most recent attempt (newest first);
  rows within a group newest first.

## Components

### `History.tsx` (modify)

Add an optional prop:

```ts
export interface HistoryProps {
  attempts: Attempt[];
  showTitle?: boolean;
}
```

When `showTitle` is true, render an extra "Quiz" column (header + a cell showing
`a.quizTitle`) before the Score column. When omitted/false, the table is
unchanged (Date + Score). The existing empty state ("No past attempts yet.")
is unchanged.

### `HistoryScreen.tsx` (new)

```ts
export interface HistoryScreenProps {
  groups: Record<string, Attempt[]>;
  onBack: () => void;
}
```

- If `groups` has no entries, render the empty state ("No past attempts yet.").
- Otherwise render one section per group. Each section:
  - Heading: `quizId === "combined" ? "Combined quizzes" : <most-recent attempt's quizTitle>`.
  - A `<History attempts={sortedRows} showTitle />` where `sortedRows` is the
    group's attempts sorted by `timestamp` descending.
- Groups are ordered by each group's most recent attempt timestamp, descending.
- A "Back" button (calls `onBack`) is always present.

Wrap in `<main className="history-screen">` to match existing screen styling
conventions; reuse existing heading/button classes.

### `QuizMenu.tsx` (modify)

- Add prop `onShowHistory: () => void` to `QuizMenuProps`.
- Render a "Past attempts" button wired to `onShowHistory`. It is always visible
  (including in the empty/no-topics state) so users can review history at any
  time. Place it near the heading/lede.

### `App.tsx` (modify)

- Add a `view` state: `"menu" | "history"` (default `"menu"`), alongside the
  existing `active: Quiz | null`.
- Render priority: if `active` → `QuizRunner`; else if `!topics` → loading; else
  if `view === "history"` → `HistoryScreen`; else → `QuizMenu`.
- Pass `onShowHistory={() => setView("history")}` to `QuizMenu`.
- Render `<HistoryScreen groups={attemptRepo.allByQuiz()} onBack={() => setView("menu")} />`
  when in the history view.
- `attemptRepo` already exists at the App level.

## Data Flow

Home → click "Past attempts" → `setView("history")` → App calls
`attemptRepo.allByQuiz()` and renders `HistoryScreen` → "Back" → `setView("menu")`.
No new repository methods are needed.

## Error / Edge Cases

- No attempts at all: `allByQuiz()` returns `{}` → empty state on the screen.
- A group with attempts but a missing/empty title falls back to its quizId in
  the heading (only relevant for non-combined groups).

## Testing

- `History.test.tsx`: with `showTitle`, the quiz title renders in a column; an
  attempt's `quizTitle` is shown. Without the prop, no title column (existing
  Date/Score behavior preserved).
- `HistoryScreen.test.tsx`: renders a section heading per group; "Combined
  quizzes" heading for the `"combined"` group; rows newest-first; groups
  ordered newest-first; Back button fires `onBack`; empty state when `groups`
  is `{}`.
- `QuizMenu.test.tsx`: clicking "Past attempts" fires `onShowHistory`; the
  button is present in both the populated and empty states.
- `App.test.tsx`: clicking "Past attempts" shows the history screen; "Back"
  returns to the topic selector.

## Out of Scope

- Deleting/clearing attempts.
- Per-attempt detail drill-down.
- Filtering/searching history.
