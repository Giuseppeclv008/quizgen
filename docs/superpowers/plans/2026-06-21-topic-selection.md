# Topic Selection & Question Cap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let the user pick multiple topics across all quizzes and a max question count, then run a combined quiz evenly split across the selected topics.

**Architecture:** Add a required `topic` field to each question. A new `domain/topics.ts` module pools questions across quizzes by topic (`collectTopics`) and assembles a capped, evenly-split synthetic quiz (`assembleQuiz`). `QuizMenu` becomes a topic selector; `App` derives topics and assembles the quiz before handing it to the unchanged `QuizRunner`.

**Tech Stack:** TypeScript, React, Zod, Vitest, @testing-library/react, Vite (`import.meta.glob`).

## Global Constraints

- Tests run with `npx vitest run` (Vitest). Type/build check: `npx tsc --noEmit`.
- All question types share `baseFields` in `src/domain/schema.ts`; the `topic` field is added there once.
- Randomness goes through `Rng` from `src/domain/shuffle.ts` (`() => number`), defaulting to `Math.random`, injectable for deterministic tests.
- Commit after each task. Branch is `main`; create a feature branch first (Task 0).
- Follow existing file style: 2-space indent, double quotes, named exports.

---

### Task 0: Create feature branch

- [x] **Step 1: Branch off main**

Run:
```bash
git checkout -b feat/topic-selection
```
Expected: `Switched to a new branch 'feat/topic-selection'`

---

### Task 1: Add required `topic` field to the schema and fixtures

**Files:**
- Modify: `src/domain/schema.ts` (the `baseFields` object)
- Modify: `src/domain/schema.test.ts`
- Modify: every test/file that builds a `Question`/`Quiz` literal (see Step 3)

**Interfaces:**
- Produces: `Question` now includes `topic: string` (min length 1); `baseFields` carries `topic: z.string().min(1)`.

- [x] **Step 1: Add the failing test**

In `src/domain/schema.test.ts`, add inside `describe("quizSchema", ...)`:

```ts
it("rejects a question with no topic", () => {
  const bad = structuredClone(validQuiz);
  delete (bad.questions[0] as { topic?: string }).topic;
  expect(quizSchema.safeParse(bad).success).toBe(false);
});
```

Also add `topic` to each question in the `validQuiz` fixture at the top of the file:
```ts
{ id: "1", type: "single_choice", difficulty: "easy", topic: "T1", prompt: "p",
  options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
  correctOptionId: "b", explanation: "e" },
{ id: "2", type: "multi_select", difficulty: "hard", topic: "T2", prompt: "p",
  options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
  correctOptionIds: ["a"], explanation: "e" },
{ id: "3", type: "true_false", difficulty: "medium", topic: "T1", prompt: "p",
  correctValue: true, explanation: "e" },
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/domain/schema.test.ts`
Expected: the new "rejects a question with no topic" test FAILS (topic not yet required; parse still succeeds).

- [x] **Step 3: Add the field**

In `src/domain/schema.ts`, add `topic` to `baseFields`:

```ts
const baseFields = {
  id: z.string().min(1),
  difficulty: difficultySchema,
  topic: z.string().min(1),
  prompt: z.string().min(1),
  explanation: z.string().min(1),
};
```

- [x] **Step 4: Fix all other Question/Quiz fixtures so typecheck passes**

Find every file constructing question literals:
```bash
grep -rln '"single_choice"\|"true_false"\|"multi_select"\|type: "true_false"\|type: "single_choice"\|type: "multi_select"' src --include=*.ts --include=*.tsx
```
For each question literal in those files (test fixtures in e.g. `src/ui/components/*.test.tsx`, `src/session/*.test.ts`, `src/domain/grading/*.test.ts`, `src/data/*.test.ts`, `src/test/smoke.test.ts`), add `topic: "General"` (any non-empty string) right after the `difficulty` field. Do NOT touch the JSON quiz files here — those are Task 2.

- [x] **Step 5: Run typecheck and full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc reports no errors; all tests PASS **except** any that load the real JSON quizzes (`GlobQuizRepository.test.ts`, `App.test.tsx`, `smoke.test.ts` if they parse `src/quizzes/*.json`). If those fail because the JSON lacks `topic`, that is expected and fixed in Task 2 — note which failed and proceed.

- [x] **Step 6: Commit**

```bash
git add src/domain/schema.ts src/domain/schema.test.ts src
git commit -m "feat: require topic field on every question"
```

---

### Task 2: Tag existing quiz JSON files with topics

**Files:**
- Modify: `src/quizzes/example.json`
- Modify: `src/quizzes/microservices.json`

**Interfaces:**
- Produces: both bundled quizzes parse under the new schema; ≥3 distinct topics exist across them.

- [x] **Step 1: Tag example.json**

Add a `"topic"` field to each of the three questions:
- `q1` (planet closest to Sun): `"topic": "Astronomy"`
- `q2` (noble gases): `"topic": "Chemistry"`
- `q3` (water boiling point): `"topic": "Physics"`

- [x] **Step 2: Tag microservices.json**

Add a `"topic"` field to every question in `src/quizzes/microservices.json`. Read each `prompt` and assign the best-fit topic from this fixed list:

- `"Microservices Basics"` — advantages/drawbacks of microservices, decomposition strategies, monolith-to-microservices migration.
- `"Domain-Driven Design"` — entities, value objects, domain services, repositories, packaging principles.
- `"Aggregates"` — aggregate rules, references between aggregates, transaction-per-aggregate, granularity, domain events.
- `"Inter-Service Communication"` — RPC, circuit breaker, service discovery, message brokers, delivery guarantees.
- `"Data Management"` — database per service, transactional outbox, event sourcing, CQRS, API composition.
- `"Sagas"` — saga definition, pivot/compensating transactions, countermeasures.

Assign each question to exactly one topic. Every question must end up with a non-empty `topic`.

- [x] **Step 3: Verify both JSON files parse and topics are present**

Run: `npx vitest run`
Expected: ALL tests PASS now (including the JSON-loading tests that were allowed to fail in Task 1).

Spot-check distinct topics:
```bash
grep -h '"topic"' src/quizzes/microservices.json | sort -u
```
Expected: at least 3 distinct topic values.

- [x] **Step 4: Commit**

```bash
git add src/quizzes/example.json src/quizzes/microservices.json
git commit -m "feat: tag bundled quizzes with topics"
```

---

### Task 3: `collectTopics` — pool questions by topic

**Files:**
- Create: `src/domain/topics.ts`
- Test: `src/domain/topics.test.ts`

**Interfaces:**
- Consumes: `Quiz`, `Question` from `./schema`; `Rng`, `shuffle` from `./shuffle`.
- Produces:
  ```ts
  export interface TopicGroup { topic: string; questions: Question[]; }
  export function collectTopics(quizzes: Quiz[]): TopicGroup[];
  ```
  Groups every question across all quizzes by its `topic`, one `TopicGroup` per distinct topic, sorted ascending by `topic`. Question order within a group follows quiz order then in-quiz order.

- [x] **Step 1: Write the failing test**

Create `src/domain/topics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { collectTopics } from "./topics";
import type { Quiz } from "./schema";

function tf(id: string, topic: string): Quiz["questions"][number] {
  return { id, type: "true_false", difficulty: "easy", topic, prompt: "p", correctValue: true, explanation: "e" };
}

function quiz(id: string, questions: Quiz["questions"]): Quiz {
  return { id, title: id, source: "s", createdAt: "2026-06-21", questions };
}

describe("collectTopics", () => {
  it("groups questions by topic across quizzes, sorted by topic", () => {
    const a = quiz("a", [tf("1", "Beta"), tf("2", "Alpha")]);
    const b = quiz("b", [tf("3", "Alpha")]);
    const groups = collectTopics([a, b]);
    expect(groups.map((g) => g.topic)).toEqual(["Alpha", "Beta"]);
    expect(groups[0].questions.map((q) => q.id)).toEqual(["2", "3"]);
    expect(groups[1].questions.map((q) => q.id)).toEqual(["1"]);
  });

  it("returns an empty array for no quizzes", () => {
    expect(collectTopics([])).toEqual([]);
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/domain/topics.test.ts`
Expected: FAIL — `collectTopics` is not defined / module missing.

- [x] **Step 3: Implement `collectTopics`**

Create `src/domain/topics.ts`:

```ts
import type { Quiz, Question } from "./schema";

export interface TopicGroup {
  topic: string;
  questions: Question[];
}

export function collectTopics(quizzes: Quiz[]): TopicGroup[] {
  const byTopic = new Map<string, Question[]>();
  for (const quiz of quizzes) {
    for (const question of quiz.questions) {
      const bucket = byTopic.get(question.topic);
      if (bucket) bucket.push(question);
      else byTopic.set(question.topic, [question]);
    }
  }
  return [...byTopic.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([topic, questions]) => ({ topic, questions }));
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/domain/topics.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/domain/topics.ts src/domain/topics.test.ts
git commit -m "feat: collect questions into topic groups"
```

---

### Task 4: `assembleQuiz` — even split, redistribution, cap

**Files:**
- Modify: `src/domain/topics.ts`
- Test: `src/domain/topics.test.ts`

**Interfaces:**
- Consumes: `TopicGroup` (Task 3); `Rng`, `shuffle` from `./shuffle`; `Quiz` from `./schema`.
- Produces:
  ```ts
  export function assembleQuiz(
    groups: TopicGroup[],
    selectedTopics: string[],
    cap: number,
    rng?: Rng,
  ): Quiz;
  ```
  Builds a synthetic `Quiz` from groups whose `topic` is in `selectedTopics`. Allocation is round-robin water-fill: walk selected topics repeatedly granting one slot each pass to any topic with unused questions, until `cap` slots are filled or the pool is exhausted (so leftover slots from small topics flow to larger ones). Within each topic, questions are shuffled with `rng` then sliced to the allotment. The combined list is shuffled with `rng` for final order. Metadata: `id: "combined"`, `source: "combined"`, `createdAt` = `new Date().toISOString().slice(0, 10)`, `title` = the selected topics joined with `", "`.

- [x] **Step 1: Write the failing tests**

Append to `src/domain/topics.test.ts`:

```ts
import { assembleQuiz } from "./topics";
import type { TopicGroup } from "./topics";

// Deterministic Rng: returns 0 so shuffle keeps relative order (Fisher–Yates
// with j=floor(0*(i+1))=0 swaps each element with index 0, but order of the
// *set* of taken questions is what we assert, not their sequence).
const rng0 = () => 0;

function group(topic: string, n: number): TopicGroup {
  return {
    topic,
    questions: Array.from({ length: n }, (_, i) => ({
      id: `${topic}-${i}`, type: "true_false", difficulty: "easy",
      topic, prompt: "p", correctValue: true, explanation: "e",
    })),
  };
}

describe("assembleQuiz", () => {
  it("splits the cap evenly across selected topics", () => {
    const groups = [group("A", 10), group("B", 10), group("C", 10)];
    const quiz = assembleQuiz(groups, ["A", "B", "C"], 6, rng0);
    const counts = countByTopic(quiz);
    expect(counts).toEqual({ A: 2, B: 2, C: 2 });
    expect(quiz.questions).toHaveLength(6);
  });

  it("redistributes leftover slots from topics that run out", () => {
    const groups = [group("A", 1), group("B", 10), group("C", 10)];
    const quiz = assembleQuiz(groups, ["A", "B", "C"], 9, rng0);
    const counts = countByTopic(quiz);
    expect(counts.A).toBe(1);
    expect(counts.B + counts.C).toBe(8);
    expect(quiz.questions).toHaveLength(9);
  });

  it("ignores unselected topics", () => {
    const groups = [group("A", 5), group("B", 5)];
    const quiz = assembleQuiz(groups, ["A"], 3, rng0);
    expect(countByTopic(quiz)).toEqual({ A: 3 });
  });

  it("caps at the total available when cap exceeds the pool", () => {
    const groups = [group("A", 2), group("B", 2)];
    const quiz = assembleQuiz(groups, ["A", "B"], 100, rng0);
    expect(quiz.questions).toHaveLength(4);
  });

  it("sets synthetic combined metadata", () => {
    const quiz = assembleQuiz([group("A", 2)], ["A"], 1, rng0);
    expect(quiz.id).toBe("combined");
    expect(quiz.source).toBe("combined");
    expect(quiz.title).toContain("A");
  });
});

function countByTopic(quiz: { questions: { topic: string }[] }): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of quiz.questions) out[q.topic] = (out[q.topic] ?? 0) + 1;
  return out;
}
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/topics.test.ts`
Expected: the `assembleQuiz` tests FAIL — function not defined.

- [x] **Step 3: Implement `assembleQuiz`**

In `src/domain/topics.ts`, update the import and add the function:

```ts
import type { Quiz, Question } from "./schema";
import { shuffle, type Rng } from "./shuffle";
```

```ts
export function assembleQuiz(
  groups: TopicGroup[],
  selectedTopics: string[],
  cap: number,
  rng: Rng = Math.random,
): Quiz {
  const selected = groups.filter((g) => selectedTopics.includes(g.topic));
  const available = selected.map((g) => g.questions.length);
  const alloc = selected.map(() => 0);

  let remaining = Math.min(cap, available.reduce((a, b) => a + b, 0));
  while (remaining > 0) {
    let progressed = false;
    for (let i = 0; i < selected.length && remaining > 0; i++) {
      if (alloc[i] < available[i]) {
        alloc[i]++;
        remaining--;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  const picked: Question[] = [];
  selected.forEach((g, i) => {
    picked.push(...shuffle(g.questions, rng).slice(0, alloc[i]));
  });

  return {
    id: "combined",
    title: selectedTopics.join(", "),
    source: "combined",
    createdAt: new Date().toISOString().slice(0, 10),
    questions: shuffle(picked, rng),
  };
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/topics.test.ts`
Expected: PASS (all `collectTopics` and `assembleQuiz` tests).

- [x] **Step 5: Commit**

```bash
git add src/domain/topics.ts src/domain/topics.test.ts
git commit -m "feat: assemble capped quiz evenly split across topics"
```

---

### Task 5: Rewrite `QuizMenu` as a topic selector

**Files:**
- Modify: `src/ui/components/QuizMenu.tsx`
- Modify: `src/ui/components/QuizMenu.test.tsx`

**Interfaces:**
- Consumes: `TopicGroup` (Task 3); `LoadError` from `../../data/QuizRepository`.
- Produces:
  ```ts
  export interface QuizMenuProps {
    topics: TopicGroup[];
    errors: LoadError[];
    onStart: (selectedTopics: string[], max: number) => void;
  }
  ```
  Presentational only — no data loading. Renders a checkbox per topic (label shows topic name and question count), a number input for max questions (default = total questions across all topics, min 1, max = that total), and a Start button disabled until ≥1 topic is checked. Empty state when `topics` is empty; error list when `errors` is non-empty.

- [x] **Step 1: Replace the test file**

Overwrite `src/ui/components/QuizMenu.test.tsx`:

```ts
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizMenu } from "./QuizMenu";
import type { TopicGroup } from "../../domain/topics";

function tf(id: string, topic: string): TopicGroup["questions"][number] {
  return { id, type: "true_false", difficulty: "easy", topic, prompt: "p", correctValue: true, explanation: "e" };
}

const topics: TopicGroup[] = [
  { topic: "Alpha", questions: [tf("1", "Alpha"), tf("2", "Alpha")] },
  { topic: "Beta", questions: [tf("3", "Beta")] },
];

describe("QuizMenu", () => {
  it("starts with the selected topics and chosen max", async () => {
    const onStart = vi.fn();
    render(<QuizMenu topics={topics} errors={[]} onStart={onStart} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Alpha/ }));
    const max = screen.getByRole("spinbutton");
    await userEvent.clear(max);
    await userEvent.type(max, "1");
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(onStart).toHaveBeenCalledWith(["Alpha"], 1);
  });

  it("disables Start until a topic is selected", () => {
    render(<QuizMenu topics={topics} errors={[]} onStart={vi.fn()} />);
    expect(screen.getByRole("button", { name: /start/i })).toBeDisabled();
  });

  it("shows an empty state when there are no topics", () => {
    render(<QuizMenu topics={[]} errors={[]} onStart={vi.fn()} />);
    expect(screen.getByText(/drop a quiz/i)).toBeInTheDocument();
  });

  it("surfaces load errors", () => {
    render(<QuizMenu topics={[]} errors={[{ source: "bad.json", message: "boom" }]} onStart={vi.fn()} />);
    expect(screen.getByText(/bad\.json/)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/components/QuizMenu.test.tsx`
Expected: FAIL — current `QuizMenu` takes `repository`/`onSelect`, not the new props.

- [x] **Step 3: Rewrite the component**

Overwrite `src/ui/components/QuizMenu.tsx`:

```tsx
import { useState } from "react";
import type { TopicGroup } from "../../domain/topics";
import type { LoadError } from "../../data/QuizRepository";

export interface QuizMenuProps {
  topics: TopicGroup[];
  errors: LoadError[];
  onStart: (selectedTopics: string[], max: number) => void;
}

export function QuizMenu({ topics, errors, onStart }: QuizMenuProps) {
  const total = topics.reduce((n, t) => n + t.questions.length, 0);
  const [selected, setSelected] = useState<string[]>([]);
  const [max, setMax] = useState(total);

  function toggle(topic: string) {
    setSelected((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  }

  function start() {
    const clamped = Math.min(Math.max(1, max || 1), total);
    onStart(selected, clamped);
  }

  return (
    <main className="menu">
      <h1>Quiz Generator</h1>
      <p className="lede">Pick topics and how many questions to practice.</p>
      {topics.length === 0 ? (
        <div className="empty">
          <p>No quizzes found.</p>
          <p className="muted">Drop a quiz JSON into <code>src/quizzes/</code> and reload.</p>
        </div>
      ) : (
        <>
          <ul className="topic-list">
            {topics.map((t) => (
              <li key={t.topic}>
                <label className="topic-row">
                  <input
                    type="checkbox"
                    checked={selected.includes(t.topic)}
                    onChange={() => toggle(t.topic)}
                  />
                  <span className="t-name">{t.topic}</span>
                  <span className="t-count">{t.questions.length} questions</span>
                </label>
              </li>
            ))}
          </ul>
          <label className="max-field">
            Max questions
            <input
              type="number"
              min={1}
              max={total}
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
            />
          </label>
          <button className="primary" disabled={selected.length === 0} onClick={start}>
            Start quiz
          </button>
        </>
      )}
      {errors.length > 0 && (
        <div className="errors">
          <p>Some files could not be loaded:</p>
          <ul>
            {errors.map((e) => (
              <li key={e.source}>
                {e.source}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/components/QuizMenu.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/ui/components/QuizMenu.tsx src/ui/components/QuizMenu.test.tsx
git commit -m "feat: turn quiz menu into a topic selector"
```

---

### Task 6: Wire `App` to derive topics and assemble the quiz

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `collectTopics`, `assembleQuiz` (Tasks 3-4); the new `QuizMenu` props (Task 5); `QuizRepository.list()` → `QuizListing`.

- [x] **Step 1: Update the App test**

Overwrite `src/App.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App", () => {
  it("shows topic checkboxes from the bundled quizzes", async () => {
    render(<App />);
    expect(await screen.findByRole("checkbox", { name: /Astronomy/ })).toBeInTheDocument();
  });

  it("starts a combined quiz from a selected topic", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("checkbox", { name: /Astronomy/ }));
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(await screen.findByText(/Question 1 of/)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — App still renders the old quiz-card menu.

- [x] **Step 3: Rewrite App**

Overwrite `src/App.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import type { Quiz } from "./domain/schema";
import { collectTopics, assembleQuiz, type TopicGroup } from "./domain/topics";
import { GlobQuizRepository, type QuizModuleMap } from "./data/GlobQuizRepository";
import { createAttemptRepository } from "./data/createAttemptRepository";
import type { LoadError } from "./data/QuizRepository";
import { QuizMenu } from "./ui/components/QuizMenu";
import { QuizRunner } from "./ui/components/QuizRunner";

export function App() {
  const repository = useMemo(() => {
    const modules = import.meta.glob("./quizzes/*.json") as QuizModuleMap;
    return new GlobQuizRepository(modules);
  }, []);
  const attemptRepo = useMemo(() => createAttemptRepository(), []);

  const [topics, setTopics] = useState<TopicGroup[] | null>(null);
  const [errors, setErrors] = useState<LoadError[]>([]);
  const [active, setActive] = useState<Quiz | null>(null);

  useEffect(() => {
    let alive = true;
    repository.list().then((listing) => {
      if (!alive) return;
      setTopics(collectTopics(listing.quizzes));
      setErrors(listing.errors);
    });
    return () => {
      alive = false;
    };
  }, [repository]);

  if (active) {
    return <QuizRunner quiz={active} attemptRepo={attemptRepo} onExit={() => setActive(null)} />;
  }
  if (!topics) return <p className="loading">Loading…</p>;

  return (
    <QuizMenu
      topics={topics}
      errors={errors}
      onStart={(selectedTopics, max) => setActive(assembleQuiz(topics, selectedTopics, max))}
    />
  );
}
```

- [x] **Step 4: Run the App test, then the full suite + typecheck**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS.

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests PASS.

- [x] **Step 5: Build to confirm the production bundle compiles**

Run: `npm run build`
Expected: build succeeds.

- [x] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: derive topics and assemble combined quiz in app"
```

---

### Task 7: Style the topic selector

**Files:**
- Modify: `src/app.css`

**Interfaces:** none (visual only). Uses class names from Task 5: `.topic-list`, `.topic-row`, `.t-name`, `.t-count`, `.max-field`.

- [x] **Step 1: Add styles**

Append to `src/app.css`, matching the existing visual language (reuse spacing/colors already defined for `.quiz-list`/`.quiz-card`):

```css
.topic-list { list-style: none; padding: 0; margin: 0 0 1rem; display: grid; gap: 0.5rem; }
.topic-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border: 1px solid var(--border, #ddd); border-radius: 8px; cursor: pointer; }
.topic-row .t-name { font-weight: 600; }
.topic-row .t-count { margin-left: auto; opacity: 0.7; font-size: 0.9em; }
.max-field { display: flex; flex-direction: column; gap: 0.25rem; max-width: 12rem; margin-bottom: 1rem; }
.max-field input { padding: 0.4rem 0.6rem; }
```

If `src/app.css` does not define a `--border` custom property, replace `var(--border, #ddd)` with the literal border color used by `.quiz-card`.

- [x] **Step 2: Verify the app renders**

Run: `npm run build`
Expected: build succeeds.

- [x] **Step 3: Commit**

```bash
git add src/app.css
git commit -m "style: lay out topic selector"
```

---

## Self-Review

- **Spec coverage:** schema topic field (Task 1) ✓; tag existing quizzes (Task 2) ✓; `collectTopics` (Task 3) ✓; `assembleQuiz` even-split + redistribute + cap + shuffle + synthetic metadata (Task 4) ✓; `QuizMenu` selector replacing card menu (Task 5) ✓; App wiring (Task 6) ✓; unchanged QuizRunner/grading/Results/History confirmed via full-suite runs (Tasks 4,6) ✓; styling (Task 7) ✓.
- **Type consistency:** `TopicGroup`, `collectTopics`, `assembleQuiz` signatures match across Tasks 3-6; `QuizMenuProps` (`topics`/`errors`/`onStart`) consistent between Tasks 5 and 6; `Rng` import path `./shuffle` consistent.
- **Placeholders:** none — every code step shows full code; the one judgment step (Task 2 microservices tagging) gives an explicit fixed topic list and a verification gate.
