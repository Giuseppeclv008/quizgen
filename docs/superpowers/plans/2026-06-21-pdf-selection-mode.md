# By-PDF Selection Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a tabbed home with a new "By PDF" mode (mix questions across chosen PDF quiz files) alongside the existing "By topic" mode.

**Architecture:** Extract the water-fill core (`pickEvenly`) shared by both modes; add `collectSources`/`assembleFromSources` for the PDF axis. Split the home into a `QuizMenu` tab container delegating to `TopicSelector` and `PdfSelector`. `App` derives both `topics` and `sources` and wires a start handler per mode into the unchanged `QuizRunner`.

**Tech Stack:** TypeScript, React, Vitest, @testing-library/react + userEvent, Vite.

## Global Constraints

- Tests: `npx vitest run` (single file: `npx vitest run path`). Typecheck: `npx tsc --noEmit`. Build: `npm run build`.
- Branch is `feat/pdf-selection-mode` (already created). Commit after each task.
- Both modes' even-split cap = round-robin water-fill with leftover redistribution, capped at `min(cap, pool)`; injectable `Rng` from `src/domain/shuffle.ts` (default `Math.random`).
- Assembled quizzes (both modes) use synthetic `id: "combined"`, `source: "combined"`, `createdAt = new Date().toISOString().slice(0,10)`. By-topic title = selected topics joined ", "; by-PDF title = selected PDF titles joined ", ".
- Default home tab is "By PDF".
- File style: 2-space indent, double quotes, named exports. Screens use `<main className="...">`.

---

### Task 1: Domain — `pickEvenly`, `collectSources`, `assembleFromSources`

**Files:**
- Modify: `src/domain/topics.ts`
- Test: `src/domain/topics.test.ts`

**Interfaces:**
- Consumes: `Quiz`, `Question` from `./schema`; `shuffle`, `Rng` from `./shuffle`.
- Produces:
  ```ts
  export interface SourceGroup { quizId: string; title: string; questions: Question[]; }
  export function collectSources(quizzes: Quiz[]): SourceGroup[];
  export function assembleFromSources(sources: SourceGroup[], selectedQuizIds: string[], cap: number, rng?: Rng): Quiz;
  ```
  `collectSources` returns one group per quiz, in input order (`quizId`/`title` from the quiz). `assembleFromSources` filters to selected ids, even-split + redistribute via the shared `pickEvenly`, shuffles final order; title = selected PDF titles joined ", ". The existing `assembleQuiz` keeps its public signature and now delegates to `pickEvenly` (behavior unchanged).

- [x] **Step 1: Write the failing tests**

Append to `src/domain/topics.test.ts` (the file already defines `tf`, `quiz`, `rng0`, and `countByTopic`). First add an import update and a source-quiz helper near the other helpers:

Change the top import line:
```ts
import { collectTopics, collectSources, assembleQuiz, assembleFromSources } from "./topics";
```

Add this helper (place it after the existing `quiz` helper, before the first describe):
```ts
// every question's topic == the quiz id, so countByTopic doubles as count-by-source
function sourceQuiz(id: string, n: number): Quiz {
  return quiz(id, Array.from({ length: n }, (_, i) => tf(`${id}-${i}`, id)));
}
```

Append these describe blocks at the end of the file:
```ts
describe("collectSources", () => {
  it("returns one group per quiz with id, title, and its questions", () => {
    const groups = collectSources([quiz("a", [tf("1", "X")]), quiz("b", [tf("2", "Y"), tf("3", "Z")])]);
    expect(groups.map((g) => g.quizId)).toEqual(["a", "b"]);
    expect(groups.map((g) => g.title)).toEqual(["a", "b"]);
    expect(groups[1].questions.map((q) => q.id)).toEqual(["2", "3"]);
  });

  it("returns an empty array for no quizzes", () => {
    expect(collectSources([])).toEqual([]);
  });
});

describe("assembleFromSources", () => {
  it("splits the cap evenly across selected PDFs", () => {
    const sources = collectSources([sourceQuiz("a", 10), sourceQuiz("b", 10), sourceQuiz("c", 10)]);
    const quizOut = assembleFromSources(sources, ["a", "b", "c"], 6, rng0);
    expect(countByTopic(quizOut)).toEqual({ a: 2, b: 2, c: 2 });
    expect(quizOut.questions).toHaveLength(6);
  });

  it("redistributes leftover slots from PDFs that run out", () => {
    const sources = collectSources([sourceQuiz("a", 1), sourceQuiz("b", 10), sourceQuiz("c", 10)]);
    const quizOut = assembleFromSources(sources, ["a", "b", "c"], 9, rng0);
    const counts = countByTopic(quizOut);
    expect(counts.a).toBe(1);
    expect(counts.b).toBe(4);
    expect(counts.c).toBe(4);
    expect(quizOut.questions).toHaveLength(9);
  });

  it("ignores unselected PDFs", () => {
    const sources = collectSources([sourceQuiz("a", 5), sourceQuiz("b", 5)]);
    const quizOut = assembleFromSources(sources, ["a"], 3, rng0);
    expect(countByTopic(quizOut)).toEqual({ a: 3 });
  });

  it("caps at the total available when cap exceeds the pool", () => {
    const sources = collectSources([sourceQuiz("a", 2), sourceQuiz("b", 2)]);
    const quizOut = assembleFromSources(sources, ["a", "b"], 100, rng0);
    expect(quizOut.questions).toHaveLength(4);
  });

  it("sets synthetic combined metadata with the joined PDF titles", () => {
    const sources = collectSources([sourceQuiz("a", 2), sourceQuiz("b", 2)]);
    const quizOut = assembleFromSources(sources, ["a", "b"], 1, rng0);
    expect(quizOut.id).toBe("combined");
    expect(quizOut.source).toBe("combined");
    expect(quizOut.title).toBe("a, b");
    expect(quizOut.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/topics.test.ts`
Expected: the new `collectSources`/`assembleFromSources` tests FAIL (functions not exported). Existing `collectTopics`/`assembleQuiz` tests still pass.

- [x] **Step 3: Implement the domain changes**

Overwrite `src/domain/topics.ts`:
```ts
import type { Quiz, Question } from "./schema";
import { shuffle, type Rng } from "./shuffle";

export interface TopicGroup {
  topic: string;
  questions: Question[];
}

export interface SourceGroup {
  quizId: string;
  title: string;
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

export function collectSources(quizzes: Quiz[]): SourceGroup[] {
  return quizzes.map((q) => ({ quizId: q.id, title: q.title, questions: q.questions }));
}

// Round-robin water-fill: even split across groups + redistribute leftovers,
// capped at min(cap, pool). Returns the combined picked questions (unshuffled).
function pickEvenly(groups: { questions: Question[] }[], cap: number, rng: Rng): Question[] {
  const available = groups.map((g) => g.questions.length);
  const alloc = groups.map(() => 0);

  let remaining = Math.min(cap, available.reduce((a, b) => a + b, 0));
  while (remaining > 0) {
    let progressed = false;
    for (let i = 0; i < groups.length && remaining > 0; i++) {
      if (alloc[i] < available[i]) {
        alloc[i]++;
        remaining--;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  const picked: Question[] = [];
  groups.forEach((g, i) => {
    picked.push(...shuffle(g.questions, rng).slice(0, alloc[i]));
  });
  return picked;
}

function synthetic(title: string, questions: Question[]): Quiz {
  return {
    id: "combined",
    title,
    source: "combined",
    createdAt: new Date().toISOString().slice(0, 10),
    questions,
  };
}

export function assembleQuiz(
  groups: TopicGroup[],
  selectedTopics: string[],
  cap: number,
  rng: Rng = Math.random,
): Quiz {
  const selected = groups.filter((g) => selectedTopics.includes(g.topic));
  return synthetic(selectedTopics.join(", "), shuffle(pickEvenly(selected, cap, rng), rng));
}

export function assembleFromSources(
  sources: SourceGroup[],
  selectedQuizIds: string[],
  cap: number,
  rng: Rng = Math.random,
): Quiz {
  const selected = sources.filter((s) => selectedQuizIds.includes(s.quizId));
  return synthetic(selected.map((s) => s.title).join(", "), shuffle(pickEvenly(selected, cap, rng), rng));
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/topics.test.ts`
Expected: PASS — all `collectTopics`, `assembleQuiz`, `collectSources`, `assembleFromSources` tests.

- [x] **Step 5: Commit**

```bash
git add src/domain/topics.ts src/domain/topics.test.ts
git commit -m "feat: add source axis and shared pickEvenly to quiz assembly"
```

---

### Task 2: Extract `TopicSelector` component

**Files:**
- Create: `src/ui/components/TopicSelector.tsx`
- Test: `src/ui/components/TopicSelector.test.tsx`

**Interfaces:**
- Consumes: `TopicGroup` from `../../domain/topics`.
- Produces:
  ```ts
  export interface TopicSelectorProps {
    topics: TopicGroup[];
    onStart: (selectedTopics: string[], max: number) => void;
  }
  ```
  Checkbox per topic (name + count), max input (default = total across topics, min 1, max = total), Start button disabled until ≥1 topic selected; `onStart` fires with selected topic names and the clamped max. (This is the current QuizMenu topic UI, extracted.)

- [x] **Step 1: Write the failing tests**

Create `src/ui/components/TopicSelector.test.tsx`:
```ts
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopicSelector } from "./TopicSelector";
import type { TopicGroup } from "../../domain/topics";

function tf(id: string, topic: string): TopicGroup["questions"][number] {
  return { id, type: "true_false", difficulty: "easy", topic, prompt: "p", correctValue: true, explanation: "e" };
}

const topics: TopicGroup[] = [
  { topic: "Alpha", questions: [tf("1", "Alpha"), tf("2", "Alpha")] },
  { topic: "Beta", questions: [tf("3", "Beta")] },
];

describe("TopicSelector", () => {
  it("starts with the selected topics and chosen max", async () => {
    const onStart = vi.fn();
    render(<TopicSelector topics={topics} onStart={onStart} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Alpha/ }));
    const max = screen.getByRole("spinbutton");
    await userEvent.clear(max);
    await userEvent.type(max, "1");
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(onStart).toHaveBeenCalledWith(["Alpha"], 1);
  });

  it("disables Start until a topic is selected", () => {
    render(<TopicSelector topics={topics} onStart={vi.fn()} />);
    expect(screen.getByRole("button", { name: /start/i })).toBeDisabled();
  });
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/components/TopicSelector.test.tsx`
Expected: FAIL — module does not exist.

- [x] **Step 3: Implement the component**

Create `src/ui/components/TopicSelector.tsx`:
```tsx
import { useState } from "react";
import type { TopicGroup } from "../../domain/topics";

export interface TopicSelectorProps {
  topics: TopicGroup[];
  onStart: (selectedTopics: string[], max: number) => void;
}

export function TopicSelector({ topics, onStart }: TopicSelectorProps) {
  const total = topics.reduce((n, t) => n + t.questions.length, 0);
  const [selected, setSelected] = useState<string[]>([]);
  const [max, setMax] = useState(total);

  function toggle(topic: string) {
    setSelected((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  }

  function start() {
    onStart(selected, Math.min(Math.max(1, max || 1), total));
  }

  return (
    <div className="selector">
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
    </div>
  );
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ui/components/TopicSelector.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/ui/components/TopicSelector.tsx src/ui/components/TopicSelector.test.tsx
git commit -m "feat: extract topic selector component"
```

---

### Task 3: `PdfSelector` component

**Files:**
- Create: `src/ui/components/PdfSelector.tsx`
- Test: `src/ui/components/PdfSelector.test.tsx`

**Interfaces:**
- Consumes: `SourceGroup` from `../../domain/topics` (Task 1).
- Produces:
  ```ts
  export interface PdfSelectorProps {
    sources: SourceGroup[];
    onStart: (selectedQuizIds: string[], max: number) => void;
  }
  ```
  Checkbox per PDF (`title` + question count), max input (default = total questions across all sources, min 1, max = total), Start button disabled until ≥1 PDF selected; `onStart` fires with the selected quiz ids and the clamped max.

- [x] **Step 1: Write the failing tests**

Create `src/ui/components/PdfSelector.test.tsx`:
```ts
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PdfSelector } from "./PdfSelector";
import type { SourceGroup } from "../../domain/topics";

function tf(id: string): SourceGroup["questions"][number] {
  return { id, type: "true_false", difficulty: "easy", topic: "T", prompt: "p", correctValue: true, explanation: "e" };
}

const sources: SourceGroup[] = [
  { quizId: "demo", title: "Demo Quiz", questions: [tf("1"), tf("2")] },
  { quizId: "micro", title: "Microservices", questions: [tf("3")] },
];

describe("PdfSelector", () => {
  it("shows each PDF title with its question count", () => {
    render(<PdfSelector sources={sources} onStart={vi.fn()} />);
    expect(screen.getByText("Demo Quiz")).toBeInTheDocument();
    expect(screen.getByText("Microservices")).toBeInTheDocument();
    expect(screen.getByText("2 questions")).toBeInTheDocument();
  });

  it("starts with the selected quiz ids and chosen max", async () => {
    const onStart = vi.fn();
    render(<PdfSelector sources={sources} onStart={onStart} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Demo Quiz/ }));
    const max = screen.getByRole("spinbutton");
    await userEvent.clear(max);
    await userEvent.type(max, "2");
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(onStart).toHaveBeenCalledWith(["demo"], 2);
  });

  it("disables Start until a PDF is selected", () => {
    render(<PdfSelector sources={sources} onStart={vi.fn()} />);
    expect(screen.getByRole("button", { name: /start/i })).toBeDisabled();
  });
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/components/PdfSelector.test.tsx`
Expected: FAIL — module does not exist.

- [x] **Step 3: Implement the component**

Create `src/ui/components/PdfSelector.tsx`:
```tsx
import { useState } from "react";
import type { SourceGroup } from "../../domain/topics";

export interface PdfSelectorProps {
  sources: SourceGroup[];
  onStart: (selectedQuizIds: string[], max: number) => void;
}

export function PdfSelector({ sources, onStart }: PdfSelectorProps) {
  const total = sources.reduce((n, s) => n + s.questions.length, 0);
  const [selected, setSelected] = useState<string[]>([]);
  const [max, setMax] = useState(total);

  function toggle(quizId: string) {
    setSelected((prev) =>
      prev.includes(quizId) ? prev.filter((id) => id !== quizId) : [...prev, quizId],
    );
  }

  function start() {
    onStart(selected, Math.min(Math.max(1, max || 1), total));
  }

  return (
    <div className="selector">
      <ul className="pdf-list">
        {sources.map((s) => (
          <li key={s.quizId}>
            <label className="topic-row">
              <input
                type="checkbox"
                checked={selected.includes(s.quizId)}
                onChange={() => toggle(s.quizId)}
              />
              <span className="t-name">{s.title}</span>
              <span className="t-count">{s.questions.length} questions</span>
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
    </div>
  );
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ui/components/PdfSelector.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/ui/components/PdfSelector.tsx src/ui/components/PdfSelector.test.tsx
git commit -m "feat: add pdf selector component"
```

---

### Task 4: `QuizMenu` tab container

**Files:**
- Modify: `src/ui/components/QuizMenu.tsx`
- Modify: `src/ui/components/QuizMenu.test.tsx`

**Interfaces:**
- Consumes: `TopicSelector` (Task 2), `PdfSelector` (Task 3), `TopicGroup`/`SourceGroup` (Task 1), `LoadError`.
- Produces:
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
  Tabs "By PDF" / "By topic" (default "By PDF"); renders the active selector. Always-visible "Past attempts" button. Empty state when `sources` is empty. Error list as before.

Note: after this task `src/App.tsx` still passes the OLD QuizMenu props (`topics`/`onStart`), so `npx tsc --noEmit` will fail on App.tsx — EXPECTED, fixed in Task 5. The QuizMenu test must pass.

- [x] **Step 1: Overwrite the test**

Overwrite `src/ui/components/QuizMenu.test.tsx`:
```ts
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizMenu } from "./QuizMenu";
import type { TopicGroup, SourceGroup } from "../../domain/topics";

function tf(id: string, topic: string): TopicGroup["questions"][number] {
  return { id, type: "true_false", difficulty: "easy", topic, prompt: "p", correctValue: true, explanation: "e" };
}

const topics: TopicGroup[] = [{ topic: "Alpha", questions: [tf("1", "Alpha")] }];
const sources: SourceGroup[] = [{ quizId: "demo", title: "Demo Quiz", questions: [tf("1", "Alpha")] }];

function renderMenu(overrides: Partial<React.ComponentProps<typeof QuizMenu>> = {}) {
  return render(
    <QuizMenu
      topics={topics}
      sources={sources}
      errors={[]}
      onShowHistory={vi.fn()}
      onStartTopics={vi.fn()}
      onStartPdfs={vi.fn()}
      {...overrides}
    />,
  );
}

describe("QuizMenu", () => {
  it("shows the PDF selector by default", () => {
    renderMenu();
    expect(screen.getByRole("checkbox", { name: /Demo Quiz/ })).toBeInTheDocument();
  });

  it("switches to the topic selector when the By topic tab is clicked", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("tab", { name: /by topic/i }));
    expect(screen.getByRole("checkbox", { name: /Alpha/ })).toBeInTheDocument();
  });

  it("shows the Past attempts button", () => {
    renderMenu();
    expect(screen.getByRole("button", { name: /past attempts/i })).toBeInTheDocument();
  });

  it("shows an empty state when there are no sources", () => {
    renderMenu({ sources: [], topics: [] });
    expect(screen.getByText(/drop a quiz/i)).toBeInTheDocument();
  });

  it("surfaces load errors", () => {
    renderMenu({ sources: [], topics: [], errors: [{ source: "bad.json", message: "boom" }] });
    expect(screen.getByText(/bad\.json/)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/components/QuizMenu.test.tsx`
Expected: FAIL — QuizMenu still has the old props/markup (no tabs, no PdfSelector).

- [x] **Step 3: Rewrite the component**

Overwrite `src/ui/components/QuizMenu.tsx`:
```tsx
import { useState } from "react";
import type { TopicGroup, SourceGroup } from "../../domain/topics";
import type { LoadError } from "../../data/QuizRepository";
import { TopicSelector } from "./TopicSelector";
import { PdfSelector } from "./PdfSelector";

export interface QuizMenuProps {
  topics: TopicGroup[];
  sources: SourceGroup[];
  errors: LoadError[];
  onShowHistory: () => void;
  onStartTopics: (selectedTopics: string[], max: number) => void;
  onStartPdfs: (selectedQuizIds: string[], max: number) => void;
}

export function QuizMenu({
  topics,
  sources,
  errors,
  onShowHistory,
  onStartTopics,
  onStartPdfs,
}: QuizMenuProps) {
  const [tab, setTab] = useState<"pdf" | "topic">("pdf");

  return (
    <main className="menu">
      <h1>Quiz Generator</h1>
      <p className="lede">Pick a source and how many questions to practice.</p>
      <button className="ghost" onClick={onShowHistory}>Past attempts</button>
      {sources.length === 0 ? (
        <div className="empty">
          <p>No quizzes found.</p>
          <p className="muted">Drop a quiz JSON into <code>src/quizzes/</code> and reload.</p>
        </div>
      ) : (
        <>
          <div className="tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === "pdf"}
              className={tab === "pdf" ? "tab is-active" : "tab"}
              onClick={() => setTab("pdf")}
            >
              By PDF
            </button>
            <button
              role="tab"
              aria-selected={tab === "topic"}
              className={tab === "topic" ? "tab is-active" : "tab"}
              onClick={() => setTab("topic")}
            >
              By topic
            </button>
          </div>
          {tab === "pdf" ? (
            <PdfSelector sources={sources} onStart={onStartPdfs} />
          ) : (
            <TopicSelector topics={topics} onStart={onStartTopics} />
          )}
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
git commit -m "feat: tab the quiz menu between pdf and topic modes"
```

---

### Task 5: Wire `App` for both modes

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `collectTopics`, `collectSources`, `assembleQuiz`, `assembleFromSources` (Task 1); the new `QuizMenu` props (Task 4).

- [x] **Step 1: Overwrite the App test**

Overwrite `src/App.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App", () => {
  it("shows PDF checkboxes from the bundled quizzes by default", async () => {
    render(<App />);
    expect(await screen.findByRole("checkbox", { name: /Demo — Mixed Question Types/ })).toBeInTheDocument();
  });

  it("starts a quiz from a selected PDF", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("checkbox", { name: /Demo — Mixed Question Types/ }));
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(await screen.findByText(/Question 1 of/)).toBeInTheDocument();
  });

  it("starts a quiz from a selected topic via the By topic tab", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("tab", { name: /by topic/i }));
    await userEvent.click(await screen.findByRole("checkbox", { name: /Astronomy/ }));
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(await screen.findByText(/Question 1 of/)).toBeInTheDocument();
  });

  it("opens the past-attempts screen from the menu and returns", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: /past attempts/i }));
    expect(screen.getByRole("heading", { name: /past attempts/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByRole("tab", { name: /by pdf/i })).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — App still renders the old single-mode QuizMenu.

- [x] **Step 3: Wire App**

Overwrite `src/App.tsx`:
```tsx
import { useEffect, useMemo, useState } from "react";
import type { Quiz } from "./domain/schema";
import {
  collectTopics,
  collectSources,
  assembleQuiz,
  assembleFromSources,
  type TopicGroup,
  type SourceGroup,
} from "./domain/topics";
import { GlobQuizRepository, type QuizModuleMap } from "./data/GlobQuizRepository";
import { createAttemptRepository } from "./data/createAttemptRepository";
import type { LoadError } from "./data/QuizRepository";
import { QuizMenu } from "./ui/components/QuizMenu";
import { QuizRunner } from "./ui/components/QuizRunner";
import { HistoryScreen } from "./ui/components/HistoryScreen";

export function App() {
  const repository = useMemo(() => {
    const modules = import.meta.glob("./quizzes/*.json") as QuizModuleMap;
    return new GlobQuizRepository(modules);
  }, []);
  const attemptRepo = useMemo(() => createAttemptRepository(), []);

  const [topics, setTopics] = useState<TopicGroup[] | null>(null);
  const [sources, setSources] = useState<SourceGroup[]>([]);
  const [errors, setErrors] = useState<LoadError[]>([]);
  const [active, setActive] = useState<Quiz | null>(null);
  const [view, setView] = useState<"menu" | "history">("menu");

  useEffect(() => {
    let alive = true;
    repository.list().then((listing) => {
      if (!alive) return;
      setTopics(collectTopics(listing.quizzes));
      setSources(collectSources(listing.quizzes));
      setErrors(listing.errors);
    }).catch(() => {
      if (alive) setTopics([]);
    });
    return () => {
      alive = false;
    };
  }, [repository]);

  if (active) {
    return <QuizRunner quiz={active} attemptRepo={attemptRepo} onExit={() => setActive(null)} />;
  }
  if (!topics) return <p className="loading">Loading…</p>;
  if (view === "history") {
    return <HistoryScreen groups={attemptRepo.allByQuiz()} onBack={() => setView("menu")} />;
  }

  return (
    <QuizMenu
      topics={topics}
      sources={sources}
      errors={errors}
      onShowHistory={() => setView("history")}
      onStartTopics={(selectedTopics, max) => setActive(assembleQuiz(topics, selectedTopics, max))}
      onStartPdfs={(selectedQuizIds, max) => setActive(assembleFromSources(sources, selectedQuizIds, max))}
    />
  );
}
```

- [x] **Step 4: Run the test, then full suite, typecheck, build**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS.

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests PASS.

Run: `npm run build`
Expected: build succeeds.

- [x] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire pdf and topic start modes into app"
```

---

### Task 6: Style the tabs

**Files:**
- Modify: `src/app.css`

**Interfaces:** none (visual only). Uses classes from Task 4: `.tabs`, `.tab`, `.tab.is-active`, and `.selector`/`.pdf-list` from Tasks 2-3. `.topic-row`, `.topic-list`, `.max-field` already exist and are reused.

- [x] **Step 1: Add styles**

First READ `src/app.css` to match its conventions and reuse any existing tokens (e.g. `--r-sm`, `--line`, accent color). Then append, adapting the literals below to the existing token names where one applies:
```css
.tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.tab { padding: 0.5rem 1rem; border: 1px solid var(--line); border-radius: var(--r-sm); background: none; cursor: pointer; }
.tab.is-active { background: var(--line); font-weight: 600; }
.pdf-list { list-style: none; padding: 0; margin: 0 0 1rem; display: grid; gap: 0.5rem; }
```
If `--line` or `--r-sm` are not defined in `app.css`, substitute the border color / radius the existing `.topic-row` rule uses.

- [x] **Step 2: Verify the build**

Run: `npm run build`
Expected: build succeeds.

- [x] **Step 3: Commit**

```bash
git add src/app.css
git commit -m "style: lay out pdf/topic mode tabs"
```

---

## Self-Review

- **Spec coverage:** shared `pickEvenly` extraction + `collectSources` + `assembleFromSources` with even-split/redistribute/cap/title (Task 1) ✓; `TopicSelector` extracted (Task 2) ✓; `PdfSelector` (Task 3) ✓; tabbed `QuizMenu` container default "By PDF", Past-attempts button, empty state, errors (Task 4) ✓; App derives both axes and wires both start handlers, render priority unchanged (Task 5) ✓; tab styling (Task 6) ✓; existing topic-mode behavior preserved (assembleQuiz unchanged; TopicSelector tests; App By-topic test) ✓.
- **Type consistency:** `SourceGroup` (`quizId`/`title`/`questions`), `collectSources`, `assembleFromSources`, `TopicSelectorProps`, `PdfSelectorProps`, and `QuizMenuProps` (`topics`/`sources`/`errors`/`onShowHistory`/`onStartTopics`/`onStartPdfs`) are consistent across Tasks 1-5. App passes exactly those props.
- **Placeholders:** none — every code step has full code; Task 6's token note is a concrete adapt-to-existing instruction. The Task 4 → Task 5 typecheck failure is explicitly called out as expected.
