# Quiz Generator — Design Spec

**Date:** 2026-06-20
**Status:** Approved design, pre-implementation

## 1. Goal

Turn a PDF into a high-quality, interactive study quiz. Quality means: answers are
genuinely studied, the correct answer is never identifiable by length or position,
distractors are plausible, and every question teaches via an explanation.

## 2. System shape — two parts

The system is deliberately split so the app stays simple and free to run.

1. **Generator (human-in-the-loop, via chat).** The user pastes a PDF into the
   Claude chat. Claude produces a quiz **dataset** as a JSON file that conforms to
   the schema in §4. No LLM runs inside the app, so there is no API key, no cost,
   and no network dependency at runtime.
2. **Player app (local web app).** A React + TypeScript + Vite single-page app that
   loads quiz datasets, runs the quiz interactively in **exam mode**, grades it,
   shows a review with explanations, and persists attempt history to `localStorage`.

Workflow: `PDF → Claude → quiz.json → drop in src/quizzes/ → reload → take quiz`.

## 3. Quiz mode

**Exam mode.** The user answers all questions with free back/forward navigation,
submits once, and then sees a review screen: total score, per-question
correctness, the user's answer, the correct answer, and the explanation. Difficulty
breakdown is shown alongside the total.

(Study/immediate-feedback mode is intentionally out of scope for v1 — see §13.)

## 4. Dataset format

A quiz is a JSON file. The **zod schema (§5) is the single source of truth**;
this section is the human-readable contract Claude follows when generating.

```jsonc
{
  "id": "biology-ch3",
  "title": "Biology — Chapter 3: Cells",
  "source": "biology.pdf",
  "createdAt": "2026-06-20",
  "questions": [
    {
      "id": "q1",
      "type": "single_choice",
      "difficulty": "medium",
      "prompt": "Which organelle produces most of a cell's ATP?",
      "options": [
        { "id": "a", "text": "Ribosome" },
        { "id": "b", "text": "Mitochondrion" },
        { "id": "c", "text": "Golgi apparatus" },
        { "id": "d", "text": "Lysosome" }
      ],
      "correctOptionId": "b",
      "explanation": "Mitochondria run oxidative phosphorylation... Ribosomes build proteins; Golgi packages them; lysosomes digest waste."
    },
    {
      "id": "q2",
      "type": "multi_select",
      "difficulty": "hard",
      "prompt": "Which of the following are membrane-bound organelles?",
      "options": [
        { "id": "a", "text": "Nucleus" },
        { "id": "b", "text": "Ribosome" },
        { "id": "c", "text": "Mitochondrion" },
        { "id": "d", "text": "Cytosol" }
      ],
      "correctOptionIds": ["a", "c"],
      "explanation": "..."
    },
    {
      "id": "q3",
      "type": "true_false",
      "difficulty": "easy",
      "prompt": "DNA is stored primarily in the nucleus of eukaryotic cells.",
      "correctValue": true,
      "explanation": "..."
    }
  ]
}
```

### 4.1 Generation rules (Claude follows these every time)

- **Length-neutral options.** Correct answer must not be the longest or shortest;
  keep all options of similar length and grammatical form.
- **Correct position randomized** at generation (the app also shuffles at runtime —
  defense in depth).
- **No positional distractors.** Never use "All of the above" / "None of the above"
  or any option that references other options' positions — these break shuffling.
- **Plausible distractors.** Wrong options must be believable to someone who half-knows
  the material (common misconceptions, adjacent concepts), not obviously absurd.
- **Explanations teach.** State why the correct answer is correct and why the main
  distractors are wrong.
- **Length scaled to source.** Number of questions is chosen from PDF length and topic
  complexity, not a fixed count.
- **Difficulty tagged** per question: `easy | medium | hard`.
- **Stable ids.** `id` values unique within a quiz; option `id`s unique within a question.

## 5. Schema as source of truth (zod)

`src/domain/schema.ts` defines the runtime-validated schema and exports inferred TS
types. Loading any dataset runs `safeParse`; invalid datasets are excluded from the
menu and surfaced as a load error (§11).

```ts
// shape (illustrative)
const Option = z.object({ id: z.string(), text: z.string().min(1) });
const Base = z.object({
  id: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  prompt: z.string().min(1),
  explanation: z.string().min(1),
});
const SingleChoice = Base.extend({
  type: z.literal("single_choice"),
  options: z.array(Option).min(2),
  correctOptionId: z.string(),
}).refine(q => q.options.some(o => o.id === q.correctOptionId));
const MultiSelect = Base.extend({
  type: z.literal("multi_select"),
  options: z.array(Option).min(2),
  correctOptionIds: z.array(z.string()).min(1),
}).refine(q => q.correctOptionIds.every(id => q.options.some(o => o.id === id)));
const TrueFalse = Base.extend({
  type: z.literal("true_false"),
  correctValue: z.boolean(),
});
const Question = z.discriminatedUnion("type", [SingleChoice, MultiSelect, TrueFalse]);
const Quiz = z.object({
  id: z.string(), title: z.string().min(1), source: z.string(),
  createdAt: z.string(), questions: z.array(Question).min(1),
});
```

## 6. Architecture — three layers

```
domain/   pure TS, zero React, 100% unit-testable (models, schema, grading, scoring, shuffle)
data/     repositories: load quizzes, persist attempts (interfaces + concrete impls)
session/  exam-session logic (pure) + a thin React hook adapter
ui/       React components — dumb, props-driven, pick renderer by question type
```

### 6.1 Folder structure

```
quizgen/
  index.html
  package.json  tsconfig.json  vite.config.ts
  src/
    main.tsx
    App.tsx
    quizzes/                         # drop generated quiz JSON here (globbed)
      example.json
    domain/
      models.ts                      # types inferred from schema
      schema.ts                      # zod — source of truth
      shuffle.ts                     # option-order shuffle, id mapping preserved
      grading/
        Grader.ts                    # Grader interface (Strategy)
        SingleChoiceGrader.ts
        MultiSelectGrader.ts
        TrueFalseGrader.ts
        graderRegistry.ts            # type -> Grader
        score.ts                     # aggregate raw score, pct, byDifficulty
    data/
      QuizRepository.ts              # interface
      GlobQuizRepository.ts          # import.meta.glob impl
      AttemptRepository.ts           # interface
      LocalStorageAttemptRepository.ts
      NullAttemptRepository.ts       # fallback when localStorage unavailable
    session/
      QuizSession.ts                 # pure exam-session state machine
      useQuizSession.ts              # React hook wrapper
    ui/
      components/
        QuizMenu.tsx
        QuizRunner.tsx
        QuestionView.tsx             # registry: type -> view component
        SingleChoiceView.tsx
        MultiSelectView.tsx
        TrueFalseView.tsx
        Results.tsx
        History.tsx
  docs/superpowers/specs/2026-06-20-quiz-generator-design.md
```

## 7. Patterns & SOLID

Patterns are capped at the three that genuinely earn their place. No DI container,
no event bus, no premature abstraction (YAGNI).

- **Strategy — grading.** `Grader` interface with one impl per question type. Adding
  a question type = add a schema variant + a grader + a view, with **no edits** to
  existing graders or core logic (**OCP**). All graders honor the same contract (**LSP**).
- **Registry / map.** `graderRegistry: Record<QuestionType, Grader>` and a parallel
  `Record<QuestionType, ViewComponent>` for rendering. Lookup by `type`, type-safe via
  the discriminated union.
- **Repository.** `QuizRepository` (load datasets) and `AttemptRepository` (persist
  history) are interfaces; UI/session depend on the interfaces, not the concrete
  `localStorage`/glob implementations (**DIP**). Swapping to a real backend later is
  additive.

SRP: grading, scoring, persistence, session state, and rendering are each isolated
modules. ISP: `QuizRepository` and `AttemptRepository` are separate small interfaces
rather than one fat data interface.

## 8. Grading & scoring

Per-question score is in `[0, 1]`:

- **single_choice / true_false:** `1` if the answer matches, else `0`.
- **multi_select — partial credit:**
  `score = max(0, (correctSelected − incorrectSelected) / totalCorrect)`.
  A question is marked "correct" only when `score === 1`.

Aggregate (`score.ts`):

- `rawScore = Σ per-question score`
- `total = number of questions`
- `pct = rawScore / total * 100`
- `byDifficulty[d] = { score: Σ scores in d, total: count in d }` for `d ∈ {easy,medium,hard}`

## 9. Runtime shuffling

`shuffle.ts` reorders each question's `options` array at session start (Fisher–Yates).
Option `id`s are stable, and grading is by `id`, so display order never affects
correctness. `true_false` has no options to shuffle. Combined with generation-time
randomization, position carries zero signal.

## 10. Persistence — attempt history

`AttemptRepository` stores attempts keyed by quiz, in `localStorage`.

```ts
interface Attempt {
  quizId: string;
  quizTitle: string;
  timestamp: string;            // ISO
  rawScore: number;             // fractional sum
  total: number;                // question count
  pct: number;
  byDifficulty: Record<"easy" | "medium" | "hard", { score: number; total: number }>;
}
```

Storage key: `quizgen:attempts` → `Record<quizId, Attempt[]>`. The History view lists
past attempts per quiz so the user can track improvement.

## 11. Error handling

- **Invalid dataset:** `safeParse` failure → quiz excluded from the menu; a non-blocking
  notice lists files that failed to load with the validation message.
- **Empty `quizzes/`:** friendly empty state with a one-line "drop a JSON here" hint.
- **`localStorage` unavailable / quota:** repository factory falls back to
  `NullAttemptRepository`; the quiz still runs, history is disabled with a small notice.

## 12. Testing strategy

Vitest + jsdom + React Testing Library. TDD during implementation.

- **Unit (domain):** each grader (correct, wrong, partial-credit edge cases incl. all
  wrong, over-selection, empty), `score.ts` aggregation incl. `byDifficulty`, `shuffle`
  (every id preserved exactly once; grading unaffected), schema (`safeParse` accepts
  valid, rejects each malformed variant).
- **Unit (session):** `QuizSession` navigation, answer set/change, completeness, submit
  result.
- **Unit (data):** repositories against mocked glob and a mocked/absent `localStorage`.
- **Component (ui):** each question view renders + reports answers; full menu → run →
  submit → results → history flow.

## 13. Out of scope (v1 / YAGNI)

- In-app PDF parsing (generation happens in chat).
- Study/immediate-feedback mode (exam mode only for v1).
- Per-question timer.
- Difficulty **filtering** at runtime (tags are stored and shown; filtering is a future
  additive feature).
- Auth, backend, multi-user, cloud sync, question-editing UI.
```

