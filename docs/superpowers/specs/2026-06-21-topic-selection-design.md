# Topic Selection & Question Cap — Design

Date: 2026-06-21
Status: Approved

## Goal

Let the user pick multiple topics ("arguments") from all available quizzes and
choose a maximum number of questions per run. The app assembles a combined quiz
from the selected topics, evenly split across them, capped at the chosen size.

## Decisions

- **Argument unit:** question-level `topic` tag, grouped across all quiz files.
- **Topic field:** required in schema; existing quizzes are tagged now.
- **Cap selection:** even split per topic, with leftover slots redistributed to
  topics that still have unused questions.
- **Menu:** the topic selector fully replaces the old per-quiz card menu.

## Schema change (`src/domain/schema.ts`)

Add a required field to `baseFields`:

```ts
topic: z.string().min(1),
```

Applies to all three question types via the shared base. Tag every question in
`src/quizzes/example.json` and `src/quizzes/microservices.json` with a `topic`.
Update any test fixtures/builders that construct questions.

## New module (`src/domain/topics.ts`)

```ts
export interface TopicGroup {
  topic: string;
  questions: Question[];
}

// Pool all questions across quizzes, group by topic, distinct + sorted by topic.
export function collectTopics(quizzes: Quiz[]): TopicGroup[];

// Build a synthetic combined quiz from the selected topics, capped at `cap`.
export function assembleQuiz(
  groups: TopicGroup[],
  selectedTopics: string[],
  cap: number,
  rng?: Rng,
): Quiz;
```

### Allocation (water-fill)

1. Restrict to groups whose topic is in `selectedTopics`.
2. `remaining = min(cap, totalAvailable)`.
3. Round-robin: repeatedly walk the selected topics; for each, if it has unused
   questions and `remaining > 0`, grant one slot. Stop when `remaining` hits 0
   or no topic can take more.

This yields an even split and automatically redistributes leftover slots from
topics that ran out to those with spare questions.

### Building the quiz

- Per topic: `shuffle(group.questions, rng)`, take its allotment.
- Concatenate, then `shuffle(combined, rng)` for final order.
- Synthetic metadata: `id: "combined"`, `title` derived from selected topics,
  `source: "combined"`, `createdAt`: current ISO date.
- `rng` defaults to `Math.random`; injectable for deterministic tests.

## UI (`src/ui/components/QuizMenu.tsx`)

Replaces the per-quiz card list. Props:

```ts
interface QuizMenuProps {
  topics: TopicGroup[];
  errors: LoadError[];
  onStart: (selectedTopics: string[], max: number) => void;
}
```

- Checkbox list of topics; each row shows its question count.
- Max-questions number input: default = total available, min 1, clamped to total.
- Start button disabled until ≥1 topic selected.
- Preserve existing empty state (no topics) and load-error display.

## App wiring (`src/App.tsx`)

- Load all quizzes from the repository, derive topics via `collectTopics`.
- Render `QuizMenu` with topics + errors.
- On start: `assembleQuiz(...)` → set as active quiz → render `QuizRunner`.
- Quit/back returns to the menu.

## Unchanged

`QuizRunner`, grading, `Results`, `History`, attempt repositories. Combined runs
save attempts under the synthetic `combined` id; history groups them there.

## Testing

- `src/domain/topics.test.ts`: `collectTopics` grouping/distinct/sort;
  allocation evenness; leftover redistribution; cap respected; under-cap when
  pool smaller than cap; deterministic output with seeded `rng`.
- Update `QuizMenu` test for the selector UI (select topics, set max, start).
- Update `schema.test.ts` / fixtures for the required `topic` field.
