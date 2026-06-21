# Home "Past attempts" Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Past attempts" button on the home that opens a dedicated, grouped history screen with a Back button.

**Architecture:** `History` gains an optional `showTitle` column. A new presentational `HistoryScreen` groups `attemptRepo.allByQuiz()` into per-quiz sections (newest first) and renders a `History` table per group. `QuizMenu` gets a "Past attempts" button; `App` adds a `view: "menu" | "history"` state to switch between the menu and the screen.

**Tech Stack:** TypeScript, React, Vitest, @testing-library/react + userEvent, Vite.

## Global Constraints

- Tests run with `npx vitest run` (single file: `npx vitest run path`). Typecheck: `npx tsc --noEmit`. Build: `npm run build`.
- Branch is `feat/home-past-attempts` (already created). Commit after each task.
- `Attempt` (from `src/domain/models.ts`) has: `quizId`, `quizTitle`, `timestamp` (ISO string), `rawScore`, `total`, `pct`, `byDifficulty`.
- `AttemptRepository.allByQuiz(): Record<string, Attempt[]>` already exists — no repository changes.
- Group heading: `"Combined quizzes"` when the group's quizId is `"combined"`; otherwise the quizTitle of the group's most recent attempt (fall back to the quizId if that title is empty).
- Ordering: groups by most recent attempt timestamp descending; rows within a group by timestamp descending.
- File style: 2-space indent, double quotes, named exports. Screens use `<main className="...">`.

---

### Task 1: Add optional title column to `History`

**Files:**
- Modify: `src/ui/components/History.tsx`
- Modify: `src/ui/components/History.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface HistoryProps {
    attempts: Attempt[];
    showTitle?: boolean;
  }
  ```
  When `showTitle` is true, the table renders a "Quiz" column (header + cell showing `a.quizTitle`) before the Score column. When omitted/false, the table is Date + Score only (unchanged). Empty state ("No past attempts yet.") unchanged.

- [ ] **Step 1: Write the failing tests**

Append two tests to `src/ui/components/History.test.tsx` (inside the existing `describe("History", ...)`). The existing fixture `attempts` has one attempt with `quizTitle: "T"`:

```ts
it("shows the quiz title column when showTitle is set", () => {
  render(<History attempts={attempts} showTitle />);
  expect(screen.getByText("Quiz")).toBeInTheDocument();
  expect(screen.getByText("T")).toBeInTheDocument();
});

it("omits the quiz title column by default", () => {
  render(<History attempts={attempts} />);
  expect(screen.queryByText("Quiz")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/components/History.test.tsx`
Expected: the two new tests FAIL ("Quiz" header not rendered; title "T" not found).

- [ ] **Step 3: Implement the column**

Overwrite `src/ui/components/History.tsx`:

```tsx
import type { Attempt } from "../../domain/models";

export interface HistoryProps {
  attempts: Attempt[];
  showTitle?: boolean;
}

export function History({ attempts, showTitle = false }: HistoryProps) {
  if (attempts.length === 0) return <p className="muted">No past attempts yet.</p>;
  return (
    <table className="history">
      <thead>
        <tr>
          <th>Date</th>
          {showTitle && <th>Quiz</th>}
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        {attempts.map((a, i) => (
          <tr key={i}>
            <td>{new Date(a.timestamp).toLocaleString()}</td>
            {showTitle && <td>{a.quizTitle}</td>}
            <td>{a.pct.toFixed(0)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ui/components/History.test.tsx`
Expected: PASS (all History tests, including the two existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/History.tsx src/ui/components/History.test.tsx
git commit -m "feat: optional title column in history table"
```

---

### Task 2: `HistoryScreen` component

**Files:**
- Create: `src/ui/components/HistoryScreen.tsx`
- Test: `src/ui/components/HistoryScreen.test.tsx`

**Interfaces:**
- Consumes: `History` with `showTitle` (Task 1); `Attempt` from `../../domain/models`.
- Produces:
  ```ts
  export interface HistoryScreenProps {
    groups: Record<string, Attempt[]>;
    onBack: () => void;
  }
  export function HistoryScreen(props: HistoryScreenProps): JSX.Element;
  ```
  Renders the empty state when `groups` has no keys. Otherwise renders one section per group (heading + `<History showTitle>` table), groups ordered by most recent attempt desc, rows within a group sorted by timestamp desc. A "Back" button always calls `onBack`.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/components/HistoryScreen.test.tsx`:

```ts
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryScreen } from "./HistoryScreen";
import type { Attempt } from "../../domain/models";

const zeroDiff = { easy: { score: 0, total: 0 }, medium: { score: 0, total: 0 }, hard: { score: 0, total: 0 } };

function attempt(quizId: string, quizTitle: string, timestamp: string, pct: number): Attempt {
  return { quizId, quizTitle, timestamp, rawScore: 0, total: 1, pct, byDifficulty: zeroDiff };
}

describe("HistoryScreen", () => {
  it("shows an empty state when there are no attempts", () => {
    render(<HistoryScreen groups={{}} onBack={vi.fn()} />);
    expect(screen.getByText(/no past attempts/i)).toBeInTheDocument();
  });

  it("labels the combined group 'Combined quizzes'", () => {
    const groups = { combined: [attempt("combined", "Astronomy, Physics", "2026-06-21T10:00:00.000Z", 80)] };
    render(<HistoryScreen groups={groups} onBack={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Combined quizzes" })).toBeInTheDocument();
    // the per-attempt title is still shown via the title column
    expect(screen.getByText("Astronomy, Physics")).toBeInTheDocument();
  });

  it("uses the most recent attempt's title as a non-combined group heading", () => {
    const groups = {
      "demo-mixed": [
        attempt("demo-mixed", "Demo Quiz", "2026-06-20T10:00:00.000Z", 50),
        attempt("demo-mixed", "Demo Quiz", "2026-06-21T10:00:00.000Z", 70),
      ],
    };
    render(<HistoryScreen groups={groups} onBack={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Demo Quiz" })).toBeInTheDocument();
  });

  it("orders rows within a group newest first", () => {
    const groups = {
      "demo-mixed": [
        attempt("demo-mixed", "Demo Quiz", "2026-06-20T10:00:00.000Z", 50),
        attempt("demo-mixed", "Demo Quiz", "2026-06-21T10:00:00.000Z", 70),
      ],
    };
    render(<HistoryScreen groups={groups} onBack={vi.fn()} />);
    const rows = screen.getAllByRole("row").filter((r) => within(r).queryByText(/%$/));
    // first data row is the newest (70%)
    expect(within(rows[0]).getByText("70%")).toBeInTheDocument();
    expect(within(rows[1]).getByText("50%")).toBeInTheDocument();
  });

  it("fires onBack when Back is clicked", async () => {
    const onBack = vi.fn();
    render(<HistoryScreen groups={{}} onBack={onBack} />);
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/components/HistoryScreen.test.tsx`
Expected: FAIL — `HistoryScreen` module does not exist.

- [ ] **Step 3: Implement the component**

Create `src/ui/components/HistoryScreen.tsx`:

```tsx
import type { Attempt } from "../../domain/models";
import { History } from "./History";

export interface HistoryScreenProps {
  groups: Record<string, Attempt[]>;
  onBack: () => void;
}

function sortedDesc(attempts: Attempt[]): Attempt[] {
  return [...attempts].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function headingFor(quizId: string, rows: Attempt[]): string {
  if (quizId === "combined") return "Combined quizzes";
  return rows[0]?.quizTitle || quizId;
}

export function HistoryScreen({ groups, onBack }: HistoryScreenProps) {
  const sections = Object.entries(groups)
    .map(([quizId, attempts]) => ({ quizId, rows: sortedDesc(attempts) }))
    .filter((s) => s.rows.length > 0)
    .sort((a, b) => b.rows[0].timestamp.localeCompare(a.rows[0].timestamp));

  return (
    <main className="history-screen">
      <h1>Past attempts</h1>
      {sections.length === 0 ? (
        <p className="muted">No past attempts yet.</p>
      ) : (
        sections.map((s) => (
          <section key={s.quizId} className="history-group">
            <h2>{headingFor(s.quizId, s.rows)}</h2>
            <History attempts={s.rows} showTitle />
          </section>
        ))
      )}
      <div className="results-actions">
        <button className="ghost" onClick={onBack}>Back</button>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ui/components/HistoryScreen.test.tsx`
Expected: PASS (all 5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/HistoryScreen.tsx src/ui/components/HistoryScreen.test.tsx
git commit -m "feat: grouped past-attempts history screen"
```

---

### Task 3: "Past attempts" button on `QuizMenu`

**Files:**
- Modify: `src/ui/components/QuizMenu.tsx`
- Modify: `src/ui/components/QuizMenu.test.tsx`

**Interfaces:**
- Produces: `QuizMenuProps` gains `onShowHistory: () => void`. A "Past attempts" button (always rendered, including the empty/no-topics state) calls it.

- [ ] **Step 1: Write the failing tests**

The existing `QuizMenu.test.tsx` renders `<QuizMenu topics=... errors=... onStart=... />`. Every render now needs `onShowHistory`. Update the existing renders to pass `onShowHistory={vi.fn()}`, then add two tests inside `describe("QuizMenu", ...)`:

```ts
it("fires onShowHistory when Past attempts is clicked", async () => {
  const onShowHistory = vi.fn();
  render(<QuizMenu topics={topics} errors={[]} onStart={vi.fn()} onShowHistory={onShowHistory} />);
  await userEvent.click(screen.getByRole("button", { name: /past attempts/i }));
  expect(onShowHistory).toHaveBeenCalled();
});

it("shows Past attempts even when there are no topics", () => {
  render(<QuizMenu topics={[]} errors={[]} onStart={vi.fn()} onShowHistory={vi.fn()} />);
  expect(screen.getByRole("button", { name: /past attempts/i })).toBeInTheDocument();
});
```

For reference, the existing tests in this file use a `topics` fixture of `TopicGroup[]` and import `userEvent`; keep those imports. Update the three existing `render(<QuizMenu ... />)` calls (the onStart/disabled/empty/errors tests) to include `onShowHistory={vi.fn()}` so they typecheck.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/components/QuizMenu.test.tsx`
Expected: FAIL — `onShowHistory` not a prop / no "Past attempts" button.

- [ ] **Step 3: Implement the button**

In `src/ui/components/QuizMenu.tsx`:

Update the props interface and signature:
```tsx
export interface QuizMenuProps {
  topics: TopicGroup[];
  errors: LoadError[];
  onStart: (selectedTopics: string[], max: number) => void;
  onShowHistory: () => void;
}

export function QuizMenu({ topics, errors, onStart, onShowHistory }: QuizMenuProps) {
```

Add the button right after the `<p className="lede">…</p>` line (so it shows in both populated and empty states):
```tsx
      <p className="lede">Pick topics and how many questions to practice.</p>
      <button className="ghost" onClick={onShowHistory}>Past attempts</button>
```

Leave the rest of the component unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/ui/components/QuizMenu.test.tsx`
Expected: PASS (existing + two new tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/QuizMenu.tsx src/ui/components/QuizMenu.test.tsx
git commit -m "feat: add past-attempts button to quiz menu"
```

---

### Task 4: Wire the history view into `App`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `QuizMenu` `onShowHistory` (Task 3); `HistoryScreen` (Task 2); `attemptRepo.allByQuiz()`.

- [ ] **Step 1: Write the failing test**

Append to `src/App.test.tsx` (inside `describe("App", ...)`):

```ts
it("opens the past-attempts screen from the menu and returns", async () => {
  render(<App />);
  await userEvent.click(await screen.findByRole("button", { name: /past attempts/i }));
  expect(screen.getByRole("heading", { name: /past attempts/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /back/i }));
  expect(await screen.findByRole("checkbox", { name: /Astronomy/ })).toBeInTheDocument();
});
```

Ensure `userEvent` is imported at the top of the file (`import userEvent from "@testing-library/user-event";`) — the existing App tests already import it; if not, add it.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — no "Past attempts" button wired in App yet.

- [ ] **Step 3: Wire App**

In `src/App.tsx`:

Add the import (with the other component imports):
```tsx
import { HistoryScreen } from "./ui/components/HistoryScreen";
```

Add a view state alongside the existing state declarations:
```tsx
  const [view, setView] = useState<"menu" | "history">("menu");
```

Replace the render tail (from `if (active)` to the end of the component) with:
```tsx
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
      errors={errors}
      onStart={(selectedTopics, max) => setActive(assembleQuiz(topics, selectedTopics, max))}
      onShowHistory={() => setView("history")}
    />
  );
```

- [ ] **Step 4: Run the test, then the full suite, typecheck, and build**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS.

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests PASS.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire past-attempts screen into app navigation"
```

---

### Task 5: Style the history screen

**Files:**
- Modify: `src/app.css`

**Interfaces:** none (visual only). Uses classes from Tasks 2-3: `.history-screen`, `.history-group`. The `.ghost` button class and `.history` table already exist in `app.css`.

- [ ] **Step 1: Add styles**

Append to `src/app.css`, matching the existing design language (reuse spacing already used by other screens/sections):

```css
.history-screen { max-width: 48rem; margin: 0 auto; padding: 2rem 1rem; }
.history-group { margin-bottom: 1.5rem; }
.history-group h2 { font-size: 1.1rem; margin-bottom: 0.5rem; }
```

If `app.css` defines spacing/radius custom properties (e.g. `--r-sm`) used by sibling rules, prefer those tokens over literals where one applies.

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app.css
git commit -m "style: lay out past-attempts history screen"
```

---

## Self-Review

- **Spec coverage:** dedicated screen reached from home button (Tasks 3,4) ✓; grouped by quizId with combined→"Combined quizzes" heading and title fallback (Task 2) ✓; optional title column (Task 1) ✓; group + row ordering newest-first (Task 2) ✓; empty state (Task 2) ✓; button visible in empty state (Task 3) ✓; no repository changes (uses existing `allByQuiz()`) ✓; styling (Task 5) ✓.
- **Type consistency:** `HistoryProps.showTitle?`, `HistoryScreenProps` (`groups`/`onBack`), `QuizMenuProps.onShowHistory`, and App's `view` state are consistent across Tasks 1-4. `Attempt` fields used (`quizId`, `quizTitle`, `timestamp`, `pct`) match `src/domain/models.ts`.
- **Placeholders:** none — every code step contains full code; the Task 5 token preference is a concrete instruction, not a gap.
