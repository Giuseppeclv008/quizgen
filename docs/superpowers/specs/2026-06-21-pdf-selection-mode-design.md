# By-PDF Selection Mode — Design

Date: 2026-06-21
Status: Approved

## Goal

Add a second quiz-building mode on the home page. The home becomes tabbed:

- **By PDF** (new): pick one or more converted-PDF quiz files; their questions
  are mixed and capped, ignoring topics.
- **By topic** (existing): pick topics across all PDFs; questions mixed and
  capped, ignoring source.

One mode per run. Both modes cap with even split across the selected groups and
redistribute leftover slots.

## Background

Each quiz JSON file is a converted PDF (e.g. `microservices.json` →
`source: "MicroService.pdf"`). A quiz has `id`, `title`, `source`, and
`questions[]`, each question carrying a `topic`. The current home is a single
topic selector: `collectTopics(quizzes)` groups questions by topic and
`assembleQuiz(groups, selectedTopics, cap, rng)` water-fills an even split with
leftover redistribution into a synthetic quiz (`id: "combined"`).

## Decisions

- **Two separate modes**, not combined filters. Tab switch selects the mode.
- **By-PDF cap**: even split per selected PDF + redistribute leftovers (mirrors
  the topic mode's algorithm).
- **Layout**: tabs "By PDF" / "By topic" at the top of the home; each tab shows
  its own selector, max input, and Start button.
- **Synthetic id**: assembled quizzes (both modes) keep `id: "combined"` /
  `source: "combined"`; the title disambiguates. History still groups all
  combined runs together — unchanged and out of scope here.

## Domain (`src/domain/topics.ts`)

Extract the water-fill core shared by both modes:

```ts
// private — even split + leftover redistribution, then per-group shuffle/slice,
// returns the combined picked questions (caller shuffles + wraps in a Quiz).
function pickEvenly(groups: { questions: Question[] }[], cap: number, rng: Rng): Question[];
```

`assembleQuiz` keeps its existing public signature and now delegates to
`pickEvenly`. Its behavior and tests are unchanged.

Add the source axis:

```ts
export interface SourceGroup {
  quizId: string;
  title: string;
  questions: Question[];
}

// One group per quiz (PDF), in input order.
export function collectSources(quizzes: Quiz[]): SourceGroup[];

// Filter to selected quiz ids, even-split + redistribute via pickEvenly,
// shuffle final order. Synthetic metadata: id "combined", source "combined",
// createdAt = new Date().toISOString().slice(0,10), title = selected PDF
// titles joined with ", ".
export function assembleFromSources(
  sources: SourceGroup[],
  selectedQuizIds: string[],
  cap: number,
  rng?: Rng,
): Quiz;
```

`rng` defaults to `Math.random`, injectable for deterministic tests. Cap
exceeding the pool yields `min(cap, total available)`.

## UI

The current `QuizMenu` inlines the topic selector. Split it so the tabbed
container stays small and each selector is independently testable.

### `TopicSelector.tsx` (new — extracted from current QuizMenu body)

```ts
export interface TopicSelectorProps {
  topics: TopicGroup[];
  onStart: (selectedTopics: string[], max: number) => void;
}
```

Checkbox per topic (name + question count), max-questions number input
(default = total across topics, min 1, max = total), Start button disabled until
≥1 topic selected. `onStart` fires with selected topic names and the clamped max.
This is the existing topic-selection markup/logic, moved verbatim.

### `PdfSelector.tsx` (new)

```ts
export interface PdfSelectorProps {
  sources: SourceGroup[];
  onStart: (selectedQuizIds: string[], max: number) => void;
}
```

Checkbox per PDF showing `title` + `questions.length` count, max-questions input
(default = total questions across all sources, min 1, max = that total), Start
button disabled until ≥1 PDF selected. `onStart` fires with
the selected quiz ids and the clamped max. Mirrors `TopicSelector` structure.

### `QuizMenu.tsx` (modify → container)

```ts
export interface QuizMenuProps {
  topics: TopicGroup[];
  sources: SourceGroup[];
  errors: LoadError[];
  onShowHistory: () => void;
  onStartTopics: (selectedTopics: string[], max: number) => void;
  onStartPdfs: (selectedQuizIds: string[], max: number) => void;
}
```

- Heading + lede + always-visible "Past attempts" button (unchanged).
- Empty state when `sources` is empty (no quizzes found) — same copy as today.
- A tab switch with two tabs: "By PDF" and "By topic". Local `tab` state,
  default `"pdf"`.
- Renders `<PdfSelector sources={sources} onStart={onStartPdfs} />` or
  `<TopicSelector topics={topics} onStart={onStartTopics} />` for the active tab.
- Error list rendered as today (outside the tab content).

Tabs use `role="tab"`/button elements with accessible names "By PDF" /
"By topic" so tests can select them.

## Wiring (`App.tsx`)

- Derive `sources = collectSources(listing.quizzes)` alongside
  `topics = collectTopics(listing.quizzes)`; store both in state.
- Render priority unchanged: QuizRunner > Loading > HistoryScreen > QuizMenu.
- Pass to `QuizMenu`: `topics`, `sources`, `errors`, `onShowHistory`,
  `onStartTopics={(t, max) => setActive(assembleQuiz(topics, t, max))}`,
  `onStartPdfs={(ids, max) => setActive(assembleFromSources(sources, ids, max))}`.

## Data Flow

Home → choose tab → select PDFs (or topics) + max → Start →
App assembles the synthetic quiz → `setActive` → `QuizRunner`. Quit/back returns
to the menu.

## Error / Edge Cases

- No quizzes: `sources` empty → empty state (no tabs/selectors).
- A tab with nothing selected: Start disabled.
- `max` clamped to `[1, total]` in each selector.
- Selecting a single PDF with a cap ≥ its size yields all its questions
  (shuffled).

## Testing

- `topics.test.ts`: `collectSources` (one group per quiz, order, title/quizId);
  `assembleFromSources` (even split per PDF, leftover redistribution, cap
  respected, under-cap when pool smaller, single-PDF case, title from selected
  PDF titles, deterministic with seeded rng). Existing `assembleQuiz` tests
  still pass after the `pickEvenly` extraction.
- `TopicSelector.test.tsx`: select topics + max → `onStart` payload; Start
  disabled until a topic selected. (Migrated from current QuizMenu tests.)
- `PdfSelector.test.tsx`: select PDFs + max → `onStart` payload with quiz ids;
  Start disabled until a PDF selected; counts shown.
- `QuizMenu.test.tsx`: default tab shows the PDF selector; switching to "By
  topic" shows the topic selector; "Past attempts" button present; empty state
  when no sources; load errors surfaced.
- `App.test.tsx`: By-PDF flow — select a PDF, Start, reach "Question 1 of N";
  By-topic flow still works; Past-attempts navigation still works.

## Out of Scope

- Changing the combined-attempt history grouping (still one `"combined"` bucket).
- Per-PDF or per-topic attempt analytics.
- Importing/converting PDFs at runtime (quizzes remain pre-converted JSON).
