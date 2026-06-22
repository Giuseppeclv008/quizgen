# Quiz Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a local React/TypeScript/Vite web app that loads chat-generated quiz datasets (JSON) and runs them as interactive exam-mode quizzes with grading, explanations, and localStorage history.

**Architecture:** Three layers — `domain/` (pure TS: zod schema, grading strategies, scoring, shuffle), `data/` (Repository interfaces + impls for loading quizzes and persisting attempts), `session/` (pure exam-session reducer + React hook), `ui/` (dumb, props-driven React components selected per question type via a registry). No LLM, no backend, no network at runtime.

**Tech Stack:** React 18, TypeScript 5 (strict), Vite 5, zod 3, Vitest 2 + jsdom + React Testing Library.

## Global Constraints

- Runtime has **no API key, no backend, no network**. The app only loads local JSON and uses `localStorage`.
- **zod schema in `src/domain/schema.ts` is the single source of truth.** All TS domain types are inferred from it; every dataset is validated with `safeParse` on load.
- Question types are exactly: `single_choice`, `multi_select`, `true_false`. Adding a type must require **no edits** to existing graders/views (OCP) — only a new schema variant + grader + view + registry entries.
- Quiz flow is **exam mode**: answer all (free navigation), submit once, then a review screen with score + difficulty breakdown + per-question explanations.
- Per-question score ∈ `[0,1]`. single_choice/true_false = `1` or `0`. multi_select partial credit = `max(0, (correctSelected - incorrectSelected) / totalCorrect)`. A question is "correct" only when `score === 1`.
- Patterns capped at **Strategy (grading) + Repository + Registry/map**. No DI container, no event bus (YAGNI).
- localStorage key for history is exactly `quizgen:attempts`, shape `Record<quizId, Attempt[]>`.
- TypeScript runs in `strict` mode; no `any` in committed code.
- All commits end with the trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (the second `-m` in every commit command).
- Work happens on a feature branch, not `main`.

---

### Task 1: Project scaffold + toolchain

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`
- Create: `src/main.tsx`, `src/app.css`, `src/test/setup.ts`
- Test: `src/test/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test` (Vitest + jsdom + jest-dom) and `npm run dev` toolchain that all later tasks depend on.

- [x] **Step 1: Create the feature branch**

```bash
git checkout -b quiz-generator
```

- [x] **Step 2: Write `package.json`**

```json
{
  "name": "quizgen",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.0",
    "typescript": "^5.5.3",
    "vite": "^5.3.3",
    "vitest": "^2.0.2"
  }
}
```

- [x] **Step 3: Write `tsconfig.json` and `tsconfig.node.json`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [x] **Step 4: Write `vite.config.ts`** (Vitest config lives here)

```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

- [x] **Step 5: Write `index.html`, `src/main.tsx`, `src/app.css`, `src/test/setup.ts`**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Quiz Generator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx` (placeholder; replaced in Task 15):
```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <h1>Quiz Generator</h1>
  </React.StrictMode>,
);
```

`src/app.css`:
```css
:root { color-scheme: light dark; font-family: system-ui, sans-serif; }
body { margin: 0; padding: 2rem; max-width: 760px; margin-inline: auto; line-height: 1.5; }
button { font: inherit; padding: 0.5rem 1rem; cursor: pointer; }
```

`src/test/setup.ts`:
```ts
import "@testing-library/jest-dom";
```

- [x] **Step 6: Write the failing smoke test**

`src/test/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [x] **Step 7: Install deps and run the test**

Run: `npm install && npm test`
Expected: smoke test PASSES (1 passed). If `npm install` is offline-blocked, that is an environment issue to resolve before continuing.

- [x] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Vitest toolchain" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Domain schema + types (zod source of truth)

**Files:**
- Create: `src/domain/schema.ts`
- Create: `src/domain/models.ts`
- Test: `src/domain/schema.test.ts`

**Interfaces:**
- Consumes: zod.
- Produces:
  - From `schema.ts`: `quizSchema`, `questionSchema`, `optionSchema`, `difficultySchema` and types `Difficulty`, `Option`, `SingleChoiceQuestion`, `MultiSelectQuestion`, `TrueFalseQuestion`, `Question`, `Quiz`, `QuestionType`.
  - From `models.ts`: `Answer`, `QuestionResult`, `DifficultyTally`, `QuizResult`, `Attempt`.

- [x] **Step 1: Write the failing test**

`src/domain/schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { quizSchema } from "./schema";

const validQuiz = {
  id: "q",
  title: "Sample",
  source: "x.pdf",
  createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "single_choice", difficulty: "easy", prompt: "p",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctOptionId: "b", explanation: "e" },
    { id: "2", type: "multi_select", difficulty: "hard", prompt: "p",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctOptionIds: ["a"], explanation: "e" },
    { id: "3", type: "true_false", difficulty: "medium", prompt: "p",
      correctValue: true, explanation: "e" },
  ],
};

describe("quizSchema", () => {
  it("accepts a valid quiz of all three types", () => {
    expect(quizSchema.safeParse(validQuiz).success).toBe(true);
  });

  it("rejects single_choice whose correctOptionId is not an option", () => {
    const bad = structuredClone(validQuiz);
    (bad.questions[0] as { correctOptionId: string }).correctOptionId = "zzz";
    expect(quizSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects multi_select with an unknown correctOptionId", () => {
    const bad = structuredClone(validQuiz);
    (bad.questions[1] as { correctOptionIds: string[] }).correctOptionIds = ["zzz"];
    expect(quizSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown question type", () => {
    const bad = structuredClone(validQuiz);
    (bad.questions[2] as { type: string }).type = "essay";
    expect(quizSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an empty questions array", () => {
    const bad = { ...validQuiz, questions: [] };
    expect(quizSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/schema.test.ts`
Expected: FAIL — cannot find module `./schema`.

- [x] **Step 3: Write `src/domain/schema.ts`**

> Note: `discriminatedUnion` requires plain `ZodObject` members, so cross-field checks (correctOptionId membership) are done in a `superRefine` on the union, NOT with `.refine()` on each member.

```ts
import { z } from "zod";

export const difficultySchema = z.enum(["easy", "medium", "hard"]);

export const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const baseFields = {
  id: z.string().min(1),
  difficulty: difficultySchema,
  prompt: z.string().min(1),
  explanation: z.string().min(1),
};

export const singleChoiceObject = z.object({
  ...baseFields,
  type: z.literal("single_choice"),
  options: z.array(optionSchema).min(2),
  correctOptionId: z.string().min(1),
});

export const multiSelectObject = z.object({
  ...baseFields,
  type: z.literal("multi_select"),
  options: z.array(optionSchema).min(2),
  correctOptionIds: z.array(z.string().min(1)).min(1),
});

export const trueFalseObject = z.object({
  ...baseFields,
  type: z.literal("true_false"),
  correctValue: z.boolean(),
});

export const questionSchema = z
  .discriminatedUnion("type", [singleChoiceObject, multiSelectObject, trueFalseObject])
  .superRefine((q, ctx) => {
    if (q.type === "single_choice" && !q.options.some((o) => o.id === q.correctOptionId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "correctOptionId must match an option id" });
    }
    if (q.type === "multi_select") {
      const ids = new Set(q.options.map((o) => o.id));
      if (!q.correctOptionIds.every((id) => ids.has(id))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "every correctOptionId must match an option id" });
      }
    }
  });

export const quizSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source: z.string(),
  createdAt: z.string(),
  questions: z.array(questionSchema).min(1),
});

export type Difficulty = z.infer<typeof difficultySchema>;
export type Option = z.infer<typeof optionSchema>;
export type SingleChoiceQuestion = z.infer<typeof singleChoiceObject>;
export type MultiSelectQuestion = z.infer<typeof multiSelectObject>;
export type TrueFalseQuestion = z.infer<typeof trueFalseObject>;
export type Question = z.infer<typeof questionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type QuestionType = Question["type"];
```

- [x] **Step 4: Write `src/domain/models.ts`**

```ts
import type { Difficulty } from "./schema";

export type Answer =
  | { type: "single_choice"; optionId: string | null }
  | { type: "multi_select"; optionIds: string[] }
  | { type: "true_false"; value: boolean | null };

export interface QuestionResult {
  questionId: string;
  score: number; // 0..1
  correct: boolean; // score === 1
}

export interface DifficultyTally {
  score: number;
  total: number;
}

export interface QuizResult {
  rawScore: number;
  total: number;
  pct: number;
  byDifficulty: Record<Difficulty, DifficultyTally>;
  perQuestion: QuestionResult[];
}

export interface Attempt {
  quizId: string;
  quizTitle: string;
  timestamp: string; // ISO
  rawScore: number;
  total: number;
  pct: number;
  byDifficulty: Record<Difficulty, DifficultyTally>;
}
```

- [x] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/domain/schema.test.ts`
Expected: PASS (5 passed).

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add zod quiz schema and domain models" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Option shuffling

**Files:**
- Create: `src/domain/shuffle.ts`
- Test: `src/domain/shuffle.test.ts`

**Interfaces:**
- Consumes: `Quiz` from `./schema`.
- Produces: `type Rng = () => number`; `shuffle<T>(arr, rng?): T[]`; `shuffleQuizOptions(quiz: Quiz, rng?): Quiz`.

- [x] **Step 1: Write the failing test**

`src/domain/shuffle.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { shuffle, shuffleQuizOptions } from "./shuffle";
import type { Quiz } from "./schema";

describe("shuffle", () => {
  it("preserves every element exactly once", () => {
    const input = ["a", "b", "c", "d"];
    const out = shuffle(input, () => 0.42);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it("does not mutate the input array", () => {
    const input = ["a", "b", "c"];
    shuffle(input, () => 0);
    expect(input).toEqual(["a", "b", "c"]);
  });
});

describe("shuffleQuizOptions", () => {
  const quiz: Quiz = {
    id: "q", title: "t", source: "s", createdAt: "2026-06-20",
    questions: [
      { id: "1", type: "single_choice", difficulty: "easy", prompt: "p",
        options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
        correctOptionId: "a", explanation: "e" },
      { id: "2", type: "true_false", difficulty: "easy", prompt: "p",
        correctValue: true, explanation: "e" },
    ],
  };

  it("keeps the same option ids (only order may change)", () => {
    const out = shuffleQuizOptions(quiz, () => 0.9);
    const q1 = out.questions[0];
    if (q1.type !== "single_choice") throw new Error("type changed");
    expect(q1.options.map((o) => o.id).sort()).toEqual(["a", "b"]);
  });

  it("leaves true_false questions untouched", () => {
    const out = shuffleQuizOptions(quiz, () => 0);
    expect(out.questions[1]).toEqual(quiz.questions[1]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/shuffle.test.ts`
Expected: FAIL — cannot find module `./shuffle`.

- [x] **Step 3: Write `src/domain/shuffle.ts`**

```ts
import type { Quiz } from "./schema";

export type Rng = () => number; // returns [0, 1)

export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleQuizOptions(quiz: Quiz, rng: Rng = Math.random): Quiz {
  return {
    ...quiz,
    questions: quiz.questions.map((q) =>
      q.type === "true_false" ? q : { ...q, options: shuffle(q.options, rng) },
    ),
  };
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain/shuffle.test.ts`
Expected: PASS (4 passed).

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Fisher-Yates option shuffling" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Grading strategies + registry

**Files:**
- Create: `src/domain/grading/Grader.ts`
- Create: `src/domain/grading/SingleChoiceGrader.ts`
- Create: `src/domain/grading/MultiSelectGrader.ts`
- Create: `src/domain/grading/TrueFalseGrader.ts`
- Create: `src/domain/grading/graderRegistry.ts`
- Test: `src/domain/grading/grading.test.ts`

**Interfaces:**
- Consumes: `Question`, `QuestionType` from `../schema`; `Answer`, `QuestionResult` from `../models`.
- Produces: `interface Grader { grade(question: Question, answer: Answer | undefined): QuestionResult }`; classes `SingleChoiceGrader`, `MultiSelectGrader`, `TrueFalseGrader`; `graderRegistry: Record<QuestionType, Grader>`; `gradeQuestion(question, answer): QuestionResult`.

- [x] **Step 1: Write the failing test**

`src/domain/grading/grading.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { gradeQuestion } from "./graderRegistry";
import type { Question } from "../schema";
import type { Answer } from "../models";

const single: Question = {
  id: "1", type: "single_choice", difficulty: "easy", prompt: "p",
  options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
  correctOptionId: "b", explanation: "e",
};
const multi: Question = {
  id: "2", type: "multi_select", difficulty: "hard", prompt: "p",
  options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }, { id: "d", text: "D" }],
  correctOptionIds: ["a", "c"], explanation: "e",
};
const tf: Question = {
  id: "3", type: "true_false", difficulty: "medium", prompt: "p",
  correctValue: true, explanation: "e",
};

describe("single_choice grading", () => {
  it("scores 1 when correct", () => {
    const a: Answer = { type: "single_choice", optionId: "b" };
    expect(gradeQuestion(single, a)).toEqual({ questionId: "1", score: 1, correct: true });
  });
  it("scores 0 when wrong or unanswered", () => {
    expect(gradeQuestion(single, { type: "single_choice", optionId: "a" }).score).toBe(0);
    expect(gradeQuestion(single, undefined).score).toBe(0);
  });
});

describe("multi_select partial credit", () => {
  it("scores 1 for exactly the correct set", () => {
    const a: Answer = { type: "multi_select", optionIds: ["a", "c"] };
    expect(gradeQuestion(multi, a)).toEqual({ questionId: "2", score: 1, correct: true });
  });
  it("gives partial credit for one of two correct", () => {
    const a: Answer = { type: "multi_select", optionIds: ["a"] };
    expect(gradeQuestion(multi, a).score).toBeCloseTo(0.5);
    expect(gradeQuestion(multi, a).correct).toBe(false);
  });
  it("subtracts incorrect selections", () => {
    const a: Answer = { type: "multi_select", optionIds: ["a", "b"] }; // +1 correct, -1 wrong
    expect(gradeQuestion(multi, a).score).toBeCloseTo(0);
  });
  it("floors at zero when wrong selections exceed correct", () => {
    const a: Answer = { type: "multi_select", optionIds: ["b", "d"] };
    expect(gradeQuestion(multi, a).score).toBe(0);
  });
});

describe("true_false grading", () => {
  it("scores 1 when matching", () => {
    expect(gradeQuestion(tf, { type: "true_false", value: true }).score).toBe(1);
  });
  it("scores 0 when not matching or unanswered", () => {
    expect(gradeQuestion(tf, { type: "true_false", value: false }).score).toBe(0);
    expect(gradeQuestion(tf, undefined).score).toBe(0);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/grading/grading.test.ts`
Expected: FAIL — cannot find module `./graderRegistry`.

- [x] **Step 3: Write the grader interface and three strategies**

`src/domain/grading/Grader.ts`:
```ts
import type { Question } from "../schema";
import type { Answer, QuestionResult } from "../models";

export interface Grader {
  grade(question: Question, answer: Answer | undefined): QuestionResult;
}
```

`src/domain/grading/SingleChoiceGrader.ts`:
```ts
import type { Grader } from "./Grader";
import type { Question } from "../schema";
import type { Answer, QuestionResult } from "../models";

export class SingleChoiceGrader implements Grader {
  grade(question: Question, answer: Answer | undefined): QuestionResult {
    if (question.type !== "single_choice") throw new Error("SingleChoiceGrader: wrong question type");
    const picked = answer?.type === "single_choice" ? answer.optionId : null;
    const score = picked === question.correctOptionId ? 1 : 0;
    return { questionId: question.id, score, correct: score === 1 };
  }
}
```

`src/domain/grading/MultiSelectGrader.ts`:
```ts
import type { Grader } from "./Grader";
import type { Question } from "../schema";
import type { Answer, QuestionResult } from "../models";

export class MultiSelectGrader implements Grader {
  grade(question: Question, answer: Answer | undefined): QuestionResult {
    if (question.type !== "multi_select") throw new Error("MultiSelectGrader: wrong question type");
    const selected = answer?.type === "multi_select" ? new Set(answer.optionIds) : new Set<string>();
    const correctSet = new Set(question.correctOptionIds);
    let correctSelected = 0;
    let incorrectSelected = 0;
    for (const id of selected) {
      if (correctSet.has(id)) correctSelected++;
      else incorrectSelected++;
    }
    const total = question.correctOptionIds.length;
    const score = Math.max(0, (correctSelected - incorrectSelected) / total);
    return { questionId: question.id, score, correct: score === 1 };
  }
}
```

`src/domain/grading/TrueFalseGrader.ts`:
```ts
import type { Grader } from "./Grader";
import type { Question } from "../schema";
import type { Answer, QuestionResult } from "../models";

export class TrueFalseGrader implements Grader {
  grade(question: Question, answer: Answer | undefined): QuestionResult {
    if (question.type !== "true_false") throw new Error("TrueFalseGrader: wrong question type");
    const value = answer?.type === "true_false" ? answer.value : null;
    const score = value === question.correctValue ? 1 : 0;
    return { questionId: question.id, score, correct: score === 1 };
  }
}
```

- [x] **Step 4: Write the registry**

`src/domain/grading/graderRegistry.ts`:
```ts
import type { Grader } from "./Grader";
import type { Question, QuestionType } from "../schema";
import type { Answer, QuestionResult } from "../models";
import { SingleChoiceGrader } from "./SingleChoiceGrader";
import { MultiSelectGrader } from "./MultiSelectGrader";
import { TrueFalseGrader } from "./TrueFalseGrader";

export const graderRegistry: Record<QuestionType, Grader> = {
  single_choice: new SingleChoiceGrader(),
  multi_select: new MultiSelectGrader(),
  true_false: new TrueFalseGrader(),
};

export function gradeQuestion(question: Question, answer: Answer | undefined): QuestionResult {
  return graderRegistry[question.type].grade(question, answer);
}
```

- [x] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/domain/grading/grading.test.ts`
Expected: PASS (all assertions green).

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add grading strategies and registry" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Scoring aggregation

**Files:**
- Create: `src/domain/grading/score.ts`
- Test: `src/domain/grading/score.test.ts`

**Interfaces:**
- Consumes: `Quiz`, `Difficulty` from `../schema`; `Answer`, `QuizResult`, `QuestionResult`, `DifficultyTally` from `../models`; `gradeQuestion` from `./graderRegistry`.
- Produces: `aggregate(quiz: Quiz, perQuestion: QuestionResult[]): QuizResult`; `gradeQuiz(quiz: Quiz, answers: Record<string, Answer | undefined>): QuizResult`.

- [x] **Step 1: Write the failing test**

`src/domain/grading/score.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { gradeQuiz } from "./score";
import type { Quiz } from "../schema";
import type { Answer } from "../models";

const quiz: Quiz = {
  id: "q", title: "t", source: "s", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "single_choice", difficulty: "easy", prompt: "p",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctOptionId: "a", explanation: "e" },
    { id: "2", type: "multi_select", difficulty: "hard", prompt: "p",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctOptionIds: ["a", "b"], explanation: "e" },
    { id: "3", type: "true_false", difficulty: "hard", prompt: "p",
      correctValue: true, explanation: "e" },
  ],
};

describe("gradeQuiz", () => {
  it("aggregates raw score, pct, and per-difficulty tallies", () => {
    const answers: Record<string, Answer> = {
      "1": { type: "single_choice", optionId: "a" }, // 1
      "2": { type: "multi_select", optionIds: ["a"] }, // 0.5
      "3": { type: "true_false", value: false }, // 0
    };
    const result = gradeQuiz(quiz, answers);
    expect(result.rawScore).toBeCloseTo(1.5);
    expect(result.total).toBe(3);
    expect(result.pct).toBeCloseTo(50);
    expect(result.byDifficulty.easy).toEqual({ score: 1, total: 1 });
    expect(result.byDifficulty.hard.score).toBeCloseTo(0.5);
    expect(result.byDifficulty.hard.total).toBe(2);
    expect(result.perQuestion).toHaveLength(3);
  });

  it("treats missing answers as zero", () => {
    const result = gradeQuiz(quiz, {});
    expect(result.rawScore).toBe(0);
    expect(result.pct).toBe(0);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/grading/score.test.ts`
Expected: FAIL — cannot find module `./score`.

- [x] **Step 3: Write `src/domain/grading/score.ts`**

```ts
import type { Quiz, Difficulty } from "../schema";
import type { Answer, QuizResult, QuestionResult, DifficultyTally } from "../models";
import { gradeQuestion } from "./graderRegistry";

function emptyTallies(): Record<Difficulty, DifficultyTally> {
  return {
    easy: { score: 0, total: 0 },
    medium: { score: 0, total: 0 },
    hard: { score: 0, total: 0 },
  };
}

export function aggregate(quiz: Quiz, perQuestion: QuestionResult[]): QuizResult {
  const byId = new Map(perQuestion.map((r) => [r.questionId, r]));
  const byDifficulty = emptyTallies();
  let rawScore = 0;
  for (const q of quiz.questions) {
    const score = byId.get(q.id)?.score ?? 0;
    rawScore += score;
    byDifficulty[q.difficulty].score += score;
    byDifficulty[q.difficulty].total += 1;
  }
  const total = quiz.questions.length;
  const pct = total > 0 ? (rawScore / total) * 100 : 0;
  return { rawScore, total, pct, byDifficulty, perQuestion };
}

export function gradeQuiz(quiz: Quiz, answers: Record<string, Answer | undefined>): QuizResult {
  const perQuestion = quiz.questions.map((q) => gradeQuestion(q, answers[q.id]));
  return aggregate(quiz, perQuestion);
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain/grading/score.test.ts`
Expected: PASS (2 passed).

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add quiz scoring aggregation" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Quiz repository (load + validate datasets)

**Files:**
- Create: `src/data/QuizRepository.ts`
- Create: `src/data/GlobQuizRepository.ts`
- Test: `src/data/GlobQuizRepository.test.ts`

**Interfaces:**
- Consumes: `Quiz`, `quizSchema` from `../domain/schema`.
- Produces: `interface LoadError { source: string; message: string }`; `interface QuizListing { quizzes: Quiz[]; errors: LoadError[] }`; `interface QuizRepository { list(): Promise<QuizListing>; get(id: string): Promise<Quiz | undefined> }`; `type QuizModuleMap = Record<string, () => Promise<unknown>>`; `class GlobQuizRepository implements QuizRepository` (constructor takes `QuizModuleMap`).

- [x] **Step 1: Write the failing test**

`src/data/GlobQuizRepository.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { GlobQuizRepository, type QuizModuleMap } from "./GlobQuizRepository";

const validQuiz = {
  id: "valid", title: "Valid", source: "s.pdf", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "true_false", difficulty: "easy", prompt: "p",
      correctValue: true, explanation: "e" },
  ],
};

function modules(): QuizModuleMap {
  return {
    "./quizzes/valid.json": () => Promise.resolve({ default: validQuiz }),
    "./quizzes/broken.json": () => Promise.resolve({ default: { id: "x" } }),
  };
}

describe("GlobQuizRepository", () => {
  it("returns valid quizzes and collects errors for invalid ones", async () => {
    const repo = new GlobQuizRepository(modules());
    const { quizzes, errors } = await repo.list();
    expect(quizzes.map((q) => q.id)).toEqual(["valid"]);
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toContain("broken.json");
  });

  it("get() returns a quiz by id, or undefined", async () => {
    const repo = new GlobQuizRepository(modules());
    expect((await repo.get("valid"))?.title).toBe("Valid");
    expect(await repo.get("nope")).toBeUndefined();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/GlobQuizRepository.test.ts`
Expected: FAIL — cannot find module `./GlobQuizRepository`.

- [x] **Step 3: Write the interface**

`src/data/QuizRepository.ts`:
```ts
import type { Quiz } from "../domain/schema";

export interface LoadError {
  source: string;
  message: string;
}

export interface QuizListing {
  quizzes: Quiz[];
  errors: LoadError[];
}

export interface QuizRepository {
  list(): Promise<QuizListing>;
  get(id: string): Promise<Quiz | undefined>;
}
```

- [x] **Step 4: Write the glob-backed implementation**

`src/data/GlobQuizRepository.ts`:
```ts
import { quizSchema, type Quiz } from "../domain/schema";
import type { QuizRepository, QuizListing, LoadError } from "./QuizRepository";

export type QuizModuleMap = Record<string, () => Promise<unknown>>;

export class GlobQuizRepository implements QuizRepository {
  constructor(private readonly modules: QuizModuleMap) {}

  async list(): Promise<QuizListing> {
    const quizzes: Quiz[] = [];
    const errors: LoadError[] = [];
    for (const [source, loader] of Object.entries(this.modules)) {
      try {
        const mod = (await loader()) as { default?: unknown };
        const data = mod && "default" in mod ? mod.default : mod;
        const parsed = quizSchema.safeParse(data);
        if (parsed.success) {
          quizzes.push(parsed.data);
        } else {
          errors.push({ source, message: parsed.error.issues.map((i) => i.message).join("; ") });
        }
      } catch (e) {
        errors.push({ source, message: e instanceof Error ? e.message : String(e) });
      }
    }
    quizzes.sort((a, b) => a.title.localeCompare(b.title));
    return { quizzes, errors };
  }

  async get(id: string): Promise<Quiz | undefined> {
    const { quizzes } = await this.list();
    return quizzes.find((q) => q.id === id);
  }
}
```

- [x] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/data/GlobQuizRepository.test.ts`
Expected: PASS (2 passed).

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add glob-backed quiz repository with validation" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Attempt history repository

**Files:**
- Create: `src/data/AttemptRepository.ts`
- Create: `src/data/LocalStorageAttemptRepository.ts`
- Create: `src/data/NullAttemptRepository.ts`
- Create: `src/data/createAttemptRepository.ts`
- Test: `src/data/LocalStorageAttemptRepository.test.ts`

**Interfaces:**
- Consumes: `Attempt` from `../domain/models`.
- Produces: `interface AttemptRepository { save(a: Attempt): void; listByQuiz(quizId: string): Attempt[]; allByQuiz(): Record<string, Attempt[]> }`; `class LocalStorageAttemptRepository` (constructor takes a `Storage`); `class NullAttemptRepository`; `createAttemptRepository(): AttemptRepository`.

- [x] **Step 1: Write the failing test**

`src/data/LocalStorageAttemptRepository.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorageAttemptRepository } from "./LocalStorageAttemptRepository";
import type { Attempt } from "../domain/models";

function makeAttempt(quizId: string, pct: number): Attempt {
  return {
    quizId, quizTitle: "T", timestamp: new Date().toISOString(),
    rawScore: pct / 100, total: 1, pct,
    byDifficulty: { easy: { score: 0, total: 0 }, medium: { score: 0, total: 0 }, hard: { score: 0, total: 0 } },
  };
}

describe("LocalStorageAttemptRepository", () => {
  beforeEach(() => localStorage.clear());

  it("saves and lists attempts per quiz", () => {
    const repo = new LocalStorageAttemptRepository(localStorage);
    repo.save(makeAttempt("a", 50));
    repo.save(makeAttempt("a", 80));
    repo.save(makeAttempt("b", 10));
    expect(repo.listByQuiz("a").map((x) => x.pct)).toEqual([50, 80]);
    expect(repo.listByQuiz("b")).toHaveLength(1);
    expect(repo.listByQuiz("missing")).toEqual([]);
  });

  it("persists under the quizgen:attempts key", () => {
    const repo = new LocalStorageAttemptRepository(localStorage);
    repo.save(makeAttempt("a", 50));
    expect(localStorage.getItem("quizgen:attempts")).toContain("\"a\"");
  });

  it("tolerates corrupt stored JSON", () => {
    localStorage.setItem("quizgen:attempts", "{not json");
    const repo = new LocalStorageAttemptRepository(localStorage);
    expect(repo.allByQuiz()).toEqual({});
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/LocalStorageAttemptRepository.test.ts`
Expected: FAIL — cannot find module `./LocalStorageAttemptRepository`.

- [x] **Step 3: Write the interface and implementations**

`src/data/AttemptRepository.ts`:
```ts
import type { Attempt } from "../domain/models";

export interface AttemptRepository {
  save(attempt: Attempt): void;
  listByQuiz(quizId: string): Attempt[];
  allByQuiz(): Record<string, Attempt[]>;
}
```

`src/data/LocalStorageAttemptRepository.ts`:
```ts
import type { Attempt } from "../domain/models";
import type { AttemptRepository } from "./AttemptRepository";

const KEY = "quizgen:attempts";

export class LocalStorageAttemptRepository implements AttemptRepository {
  constructor(private readonly storage: Storage) {}

  private readAll(): Record<string, Attempt[]> {
    const raw = this.storage.getItem(KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, Attempt[]>;
    } catch {
      return {};
    }
  }

  private writeAll(data: Record<string, Attempt[]>): void {
    this.storage.setItem(KEY, JSON.stringify(data));
  }

  save(attempt: Attempt): void {
    const all = this.readAll();
    (all[attempt.quizId] ??= []).push(attempt);
    this.writeAll(all);
  }

  listByQuiz(quizId: string): Attempt[] {
    return this.readAll()[quizId] ?? [];
  }

  allByQuiz(): Record<string, Attempt[]> {
    return this.readAll();
  }
}
```

`src/data/NullAttemptRepository.ts`:
```ts
import type { Attempt } from "../domain/models";
import type { AttemptRepository } from "./AttemptRepository";

export class NullAttemptRepository implements AttemptRepository {
  save(_attempt: Attempt): void {}
  listByQuiz(_quizId: string): Attempt[] {
    return [];
  }
  allByQuiz(): Record<string, Attempt[]> {
    return {};
  }
}
```

- [x] **Step 4: Write the factory**

`src/data/createAttemptRepository.ts`:
```ts
import type { AttemptRepository } from "./AttemptRepository";
import { LocalStorageAttemptRepository } from "./LocalStorageAttemptRepository";
import { NullAttemptRepository } from "./NullAttemptRepository";

export function createAttemptRepository(): AttemptRepository {
  try {
    const probe = "__quizgen_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return new LocalStorageAttemptRepository(window.localStorage);
  } catch {
    return new NullAttemptRepository();
  }
}
```

- [x] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/data/LocalStorageAttemptRepository.test.ts`
Expected: PASS (3 passed).

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add attempt history repository with localStorage and null fallback" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Exam-session reducer

**Files:**
- Create: `src/session/QuizSession.ts`
- Test: `src/session/QuizSession.test.ts`

**Interfaces:**
- Consumes: `Quiz` from `../domain/schema`; `Answer`, `QuizResult` from `../domain/models`; `Rng`, `shuffleQuizOptions` from `../domain/shuffle`; `gradeQuiz` from `../domain/grading/score`.
- Produces: `interface QuizSessionState { quiz: Quiz; currentIndex: number; answers: Record<string, Answer>; submitted: boolean; result?: QuizResult }`; `type SessionAction`; `initSession(quiz: Quiz, rng?: Rng): QuizSessionState`; `sessionReducer(state, action): QuizSessionState`; `answeredCount(state): number`.

- [x] **Step 1: Write the failing test**

`src/session/QuizSession.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { initSession, sessionReducer, answeredCount } from "./QuizSession";
import type { Quiz } from "../domain/schema";

const quiz: Quiz = {
  id: "q", title: "t", source: "s", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "single_choice", difficulty: "easy", prompt: "p",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctOptionId: "a", explanation: "e" },
    { id: "2", type: "true_false", difficulty: "easy", prompt: "p",
      correctValue: true, explanation: "e" },
  ],
};

const noShuffle = () => 0;

describe("QuizSession", () => {
  it("initializes at index 0 with no answers", () => {
    const s = initSession(quiz, noShuffle);
    expect(s.currentIndex).toBe(0);
    expect(s.answers).toEqual({});
    expect(s.submitted).toBe(false);
  });

  it("records and overwrites answers", () => {
    let s = initSession(quiz, noShuffle);
    s = sessionReducer(s, { kind: "answer", questionId: "1", answer: { type: "single_choice", optionId: "b" } });
    s = sessionReducer(s, { kind: "answer", questionId: "1", answer: { type: "single_choice", optionId: "a" } });
    expect(s.answers["1"]).toEqual({ type: "single_choice", optionId: "a" });
    expect(answeredCount(s)).toBe(1);
  });

  it("navigates and clamps within bounds", () => {
    let s = initSession(quiz, noShuffle);
    s = sessionReducer(s, { kind: "next" });
    expect(s.currentIndex).toBe(1);
    s = sessionReducer(s, { kind: "next" });
    expect(s.currentIndex).toBe(1); // clamped at last
    s = sessionReducer(s, { kind: "prev" });
    s = sessionReducer(s, { kind: "prev" });
    expect(s.currentIndex).toBe(0); // clamped at first
    s = sessionReducer(s, { kind: "goto", index: 1 });
    expect(s.currentIndex).toBe(1);
  });

  it("submit grades and sets result", () => {
    let s = initSession(quiz, noShuffle);
    s = sessionReducer(s, { kind: "answer", questionId: "1", answer: { type: "single_choice", optionId: "a" } });
    s = sessionReducer(s, { kind: "answer", questionId: "2", answer: { type: "true_false", value: true } });
    s = sessionReducer(s, { kind: "submit" });
    expect(s.submitted).toBe(true);
    expect(s.result?.rawScore).toBe(2);
    expect(s.result?.pct).toBe(100);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/session/QuizSession.test.ts`
Expected: FAIL — cannot find module `./QuizSession`.

- [x] **Step 3: Write `src/session/QuizSession.ts`**

```ts
import type { Quiz } from "../domain/schema";
import type { Answer, QuizResult } from "../domain/models";
import { shuffleQuizOptions, type Rng } from "../domain/shuffle";
import { gradeQuiz } from "../domain/grading/score";

export interface QuizSessionState {
  quiz: Quiz;
  currentIndex: number;
  answers: Record<string, Answer>;
  submitted: boolean;
  result?: QuizResult;
}

export type SessionAction =
  | { kind: "answer"; questionId: string; answer: Answer }
  | { kind: "goto"; index: number }
  | { kind: "next" }
  | { kind: "prev" }
  | { kind: "submit" };

export function initSession(quiz: Quiz, rng: Rng = Math.random): QuizSessionState {
  return {
    quiz: shuffleQuizOptions(quiz, rng),
    currentIndex: 0,
    answers: {},
    submitted: false,
  };
}

function clamp(index: number, length: number): number {
  return Math.max(0, Math.min(index, length - 1));
}

export function sessionReducer(state: QuizSessionState, action: SessionAction): QuizSessionState {
  if (state.submitted) return state;
  const last = state.quiz.questions.length;
  switch (action.kind) {
    case "answer":
      return { ...state, answers: { ...state.answers, [action.questionId]: action.answer } };
    case "goto":
      return { ...state, currentIndex: clamp(action.index, last) };
    case "next":
      return { ...state, currentIndex: clamp(state.currentIndex + 1, last) };
    case "prev":
      return { ...state, currentIndex: clamp(state.currentIndex - 1, last) };
    case "submit":
      return { ...state, submitted: true, result: gradeQuiz(state.quiz, state.answers) };
  }
}

export function answeredCount(state: QuizSessionState): number {
  return Object.keys(state.answers).length;
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/session/QuizSession.test.ts`
Expected: PASS (4 passed).

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add exam-mode session reducer" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: useQuizSession hook

**Files:**
- Create: `src/session/useQuizSession.ts`
- Test: `src/session/useQuizSession.test.ts`

**Interfaces:**
- Consumes: `Quiz` from `../domain/schema`; `initSession`, `sessionReducer`, `QuizSessionState`, `SessionAction` from `./QuizSession`.
- Produces: `useQuizSession(quiz: Quiz): { state: QuizSessionState; dispatch: React.Dispatch<SessionAction> }`.

- [x] **Step 1: Write the failing test**

`src/session/useQuizSession.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQuizSession } from "./useQuizSession";
import type { Quiz } from "../domain/schema";

const quiz: Quiz = {
  id: "q", title: "t", source: "s", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "true_false", difficulty: "easy", prompt: "p", correctValue: true, explanation: "e" },
  ],
};

describe("useQuizSession", () => {
  it("exposes state and dispatch, and updates on answer", () => {
    const { result } = renderHook(() => useQuizSession(quiz));
    expect(result.current.state.currentIndex).toBe(0);
    act(() => {
      result.current.dispatch({ kind: "answer", questionId: "1", answer: { type: "true_false", value: true } });
    });
    expect(result.current.state.answers["1"]).toEqual({ type: "true_false", value: true });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/session/useQuizSession.test.ts`
Expected: FAIL — cannot find module `./useQuizSession`.

- [x] **Step 3: Write `src/session/useQuizSession.ts`**

```ts
import { useReducer } from "react";
import type { Quiz } from "../domain/schema";
import { initSession, sessionReducer, type QuizSessionState, type SessionAction } from "./QuizSession";

export function useQuizSession(quiz: Quiz): {
  state: QuizSessionState;
  dispatch: React.Dispatch<SessionAction>;
} {
  const [state, dispatch] = useReducer(sessionReducer, quiz, (q) => initSession(q));
  return { state, dispatch };
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/session/useQuizSession.test.ts`
Expected: PASS (1 passed).

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add useQuizSession React hook" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Question view components + registry

**Files:**
- Create: `src/ui/components/SingleChoiceView.tsx`
- Create: `src/ui/components/MultiSelectView.tsx`
- Create: `src/ui/components/TrueFalseView.tsx`
- Create: `src/ui/components/QuestionView.tsx`
- Test: `src/ui/components/QuestionView.test.tsx`

**Interfaces:**
- Consumes: `Question`, `QuestionType` from `../../domain/schema`; `Answer` from `../../domain/models`.
- Produces: `interface QuestionViewProps { question: Question; answer: Answer | undefined; disabled?: boolean; onAnswer: (answer: Answer) => void }`; components `SingleChoiceView`, `MultiSelectView`, `TrueFalseView`, `QuestionView`.

- [x] **Step 1: Write the failing test**

`src/ui/components/QuestionView.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionView } from "./QuestionView";
import type { Question } from "../../domain/schema";

const single: Question = {
  id: "1", type: "single_choice", difficulty: "easy", prompt: "Pick B",
  options: [{ id: "a", text: "Apple" }, { id: "b", text: "Banana" }],
  correctOptionId: "b", explanation: "e",
};
const multi: Question = {
  id: "2", type: "multi_select", difficulty: "easy", prompt: "Pick A and C",
  options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }],
  correctOptionIds: ["a", "c"], explanation: "e",
};
const tf: Question = {
  id: "3", type: "true_false", difficulty: "easy", prompt: "True please",
  correctValue: true, explanation: "e",
};

describe("QuestionView", () => {
  it("renders single_choice and reports the picked option", async () => {
    const onAnswer = vi.fn();
    render(<QuestionView question={single} answer={undefined} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByLabelText("Banana"));
    expect(onAnswer).toHaveBeenCalledWith({ type: "single_choice", optionId: "b" });
  });

  it("renders multi_select and accumulates selections", async () => {
    const onAnswer = vi.fn();
    render(<QuestionView question={multi} answer={{ type: "multi_select", optionIds: ["a"] }} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByLabelText("C"));
    expect(onAnswer).toHaveBeenCalledWith({ type: "multi_select", optionIds: ["a", "c"] });
  });

  it("renders true_false and reports the boolean", async () => {
    const onAnswer = vi.fn();
    render(<QuestionView question={tf} answer={undefined} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByLabelText("True"));
    expect(onAnswer).toHaveBeenCalledWith({ type: "true_false", value: true });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/components/QuestionView.test.tsx`
Expected: FAIL — cannot find module `./QuestionView`.

- [x] **Step 3: Write the per-type view components**

`src/ui/components/SingleChoiceView.tsx`:
```tsx
import type { Answer } from "../../domain/models";
import type { QuestionViewProps } from "./QuestionView";

export function SingleChoiceView({ question, answer, disabled, onAnswer }: QuestionViewProps) {
  if (question.type !== "single_choice") return null;
  const picked = answer?.type === "single_choice" ? answer.optionId : null;
  return (
    <fieldset>
      {question.options.map((o) => (
        <label key={o.id} style={{ display: "block" }}>
          <input
            type="radio"
            name={question.id}
            checked={picked === o.id}
            disabled={disabled}
            onChange={() => onAnswer({ type: "single_choice", optionId: o.id } as Answer)}
          />
          {o.text}
        </label>
      ))}
    </fieldset>
  );
}
```

`src/ui/components/MultiSelectView.tsx`:
```tsx
import type { Answer } from "../../domain/models";
import type { QuestionViewProps } from "./QuestionView";

export function MultiSelectView({ question, answer, disabled, onAnswer }: QuestionViewProps) {
  if (question.type !== "multi_select") return null;
  const selected = answer?.type === "multi_select" ? answer.optionIds : [];
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onAnswer({ type: "multi_select", optionIds: next } as Answer);
  };
  return (
    <fieldset>
      {question.options.map((o) => (
        <label key={o.id} style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={selected.includes(o.id)}
            disabled={disabled}
            onChange={() => toggle(o.id)}
          />
          {o.text}
        </label>
      ))}
    </fieldset>
  );
}
```

`src/ui/components/TrueFalseView.tsx`:
```tsx
import type { Answer } from "../../domain/models";
import type { QuestionViewProps } from "./QuestionView";

export function TrueFalseView({ question, answer, disabled, onAnswer }: QuestionViewProps) {
  if (question.type !== "true_false") return null;
  const value = answer?.type === "true_false" ? answer.value : null;
  return (
    <fieldset>
      {[{ label: "True", v: true }, { label: "False", v: false }].map(({ label, v }) => (
        <label key={label} style={{ display: "block" }}>
          <input
            type="radio"
            name={question.id}
            checked={value === v}
            disabled={disabled}
            onChange={() => onAnswer({ type: "true_false", value: v } as Answer)}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
```

- [x] **Step 4: Write the registry/dispatcher**

`src/ui/components/QuestionView.tsx`:
```tsx
import type { FC } from "react";
import type { Question, QuestionType } from "../../domain/schema";
import type { Answer } from "../../domain/models";
import { SingleChoiceView } from "./SingleChoiceView";
import { MultiSelectView } from "./MultiSelectView";
import { TrueFalseView } from "./TrueFalseView";

export interface QuestionViewProps {
  question: Question;
  answer: Answer | undefined;
  disabled?: boolean;
  onAnswer: (answer: Answer) => void;
}

const viewRegistry: Record<QuestionType, FC<QuestionViewProps>> = {
  single_choice: SingleChoiceView,
  multi_select: MultiSelectView,
  true_false: TrueFalseView,
};

export function QuestionView(props: QuestionViewProps) {
  const View = viewRegistry[props.question.type];
  return (
    <div>
      <p>{props.question.prompt}</p>
      <View {...props} />
    </div>
  );
}
```

- [x] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/ui/components/QuestionView.test.tsx`
Expected: PASS (3 passed).

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add per-type question views and registry" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Results / review component

**Files:**
- Create: `src/ui/components/Results.tsx`
- Test: `src/ui/components/Results.test.tsx`

**Interfaces:**
- Consumes: `Quiz` from `../../domain/schema`; `Answer`, `QuizResult` from `../../domain/models`.
- Produces: `interface ResultsProps { quiz: Quiz; answers: Record<string, Answer>; result: QuizResult; onBackToMenu: () => void }`; component `Results`.

- [x] **Step 1: Write the failing test**

`src/ui/components/Results.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Results } from "./Results";
import type { Quiz } from "../../domain/schema";
import type { Answer, QuizResult } from "../../domain/models";

const quiz: Quiz = {
  id: "q", title: "t", source: "s", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "single_choice", difficulty: "easy", prompt: "Pick B",
      options: [{ id: "a", text: "Apple" }, { id: "b", text: "Banana" }],
      correctOptionId: "b", explanation: "Bananas are best." },
  ],
};
const answers: Record<string, Answer> = { "1": { type: "single_choice", optionId: "a" } };
const result: QuizResult = {
  rawScore: 0, total: 1, pct: 0,
  byDifficulty: { easy: { score: 0, total: 1 }, medium: { score: 0, total: 0 }, hard: { score: 0, total: 0 } },
  perQuestion: [{ questionId: "1", score: 0, correct: false }],
};

describe("Results", () => {
  it("shows the percentage, the explanation, and the correct answer", () => {
    render(<Results quiz={quiz} answers={answers} result={result} onBackToMenu={vi.fn()} />);
    expect(screen.getByText(/0%/)).toBeInTheDocument();
    expect(screen.getByText(/Bananas are best\./)).toBeInTheDocument();
    expect(screen.getByText(/Banana/)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/components/Results.test.tsx`
Expected: FAIL — cannot find module `./Results`.

- [x] **Step 3: Write `src/ui/components/Results.tsx`**

```tsx
import type { Quiz, Question, Difficulty } from "../../domain/schema";
import type { Answer, QuizResult } from "../../domain/models";

export interface ResultsProps {
  quiz: Quiz;
  answers: Record<string, Answer>;
  result: QuizResult;
  onBackToMenu: () => void;
}

function optionText(question: Question, id: string): string {
  if (question.type === "true_false") return id;
  return question.options.find((o) => o.id === id)?.text ?? id;
}

function formatUserAnswer(question: Question, answer: Answer | undefined): string {
  if (!answer) return "(no answer)";
  if (answer.type === "single_choice") return answer.optionId ? optionText(question, answer.optionId) : "(no answer)";
  if (answer.type === "multi_select") return answer.optionIds.length ? answer.optionIds.map((id) => optionText(question, id)).join(", ") : "(no answer)";
  return answer.value === null ? "(no answer)" : answer.value ? "True" : "False";
}

function formatCorrectAnswer(question: Question): string {
  if (question.type === "single_choice") return optionText(question, question.correctOptionId);
  if (question.type === "multi_select") return question.correctOptionIds.map((id) => optionText(question, id)).join(", ");
  return question.correctValue ? "True" : "False";
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function Results({ quiz, answers, result, onBackToMenu }: ResultsProps) {
  const resultById = new Map(result.perQuestion.map((r) => [r.questionId, r]));
  return (
    <div>
      <h2>Results — {quiz.title}</h2>
      <p>
        Score: {result.rawScore.toFixed(2)} / {result.total} ({result.pct.toFixed(0)}%)
      </p>
      <ul>
        {DIFFICULTIES.filter((d) => result.byDifficulty[d].total > 0).map((d) => (
          <li key={d}>
            {d}: {result.byDifficulty[d].score.toFixed(2)} / {result.byDifficulty[d].total}
          </li>
        ))}
      </ul>
      <hr />
      {quiz.questions.map((q) => {
        const r = resultById.get(q.id);
        const status = r?.correct ? "✓ correct" : r && r.score > 0 ? `partial (${r.score.toFixed(2)})` : "✗ wrong";
        return (
          <div key={q.id} style={{ marginBottom: "1rem" }}>
            <p><strong>{q.prompt}</strong> — {status}</p>
            <p>Your answer: {formatUserAnswer(q, answers[q.id])}</p>
            <p>Correct answer: {formatCorrectAnswer(q)}</p>
            <p><em>{q.explanation}</em></p>
          </div>
        );
      })}
      <button onClick={onBackToMenu}>Back to menu</button>
    </div>
  );
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/components/Results.test.tsx`
Expected: PASS (1 passed).

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add results review component" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: History component

**Files:**
- Create: `src/ui/components/History.tsx`
- Test: `src/ui/components/History.test.tsx`

**Interfaces:**
- Consumes: `Attempt` from `../../domain/models`.
- Produces: `interface HistoryProps { attempts: Attempt[] }`; component `History`.

- [x] **Step 1: Write the failing test**

`src/ui/components/History.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { History } from "./History";
import type { Attempt } from "../../domain/models";

const attempts: Attempt[] = [
  { quizId: "a", quizTitle: "T", timestamp: "2026-06-20T10:00:00.000Z",
    rawScore: 1, total: 2, pct: 50,
    byDifficulty: { easy: { score: 0, total: 0 }, medium: { score: 0, total: 0 }, hard: { score: 0, total: 0 } } },
];

describe("History", () => {
  it("lists past attempts with their percentage", () => {
    render(<History attempts={attempts} />);
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it("shows an empty state when there are no attempts", () => {
    render(<History attempts={[]} />);
    expect(screen.getByText(/no past attempts/i)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/components/History.test.tsx`
Expected: FAIL — cannot find module `./History`.

- [x] **Step 3: Write `src/ui/components/History.tsx`**

```tsx
import type { Attempt } from "../../domain/models";

export interface HistoryProps {
  attempts: Attempt[];
}

export function History({ attempts }: HistoryProps) {
  if (attempts.length === 0) return <p>No past attempts yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        {attempts.map((a, i) => (
          <tr key={i}>
            <td>{new Date(a.timestamp).toLocaleString()}</td>
            <td>{a.pct.toFixed(0)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/components/History.test.tsx`
Expected: PASS (2 passed).

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add attempt history component" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 13: QuizRunner (exam flow)

**Files:**
- Create: `src/ui/components/QuizRunner.tsx`
- Test: `src/ui/components/QuizRunner.test.tsx`

**Interfaces:**
- Consumes: `Quiz` from `../../domain/schema`; `Attempt` from `../../domain/models`; `AttemptRepository` from `../../data/AttemptRepository`; `useQuizSession` from `../../session/useQuizSession`; `QuestionView`, `Results`, `History`.
- Produces: `interface QuizRunnerProps { quiz: Quiz; attemptRepo: AttemptRepository; onExit: () => void }`; component `QuizRunner`. On submit it builds an `Attempt` from the result and calls `attemptRepo.save` exactly once.

- [x] **Step 1: Write the failing test**

`src/ui/components/QuizRunner.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizRunner } from "./QuizRunner";
import { NullAttemptRepository } from "../../data/NullAttemptRepository";
import type { Quiz } from "../../domain/schema";

const quiz: Quiz = {
  id: "q", title: "Demo", source: "s", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "true_false", difficulty: "easy", prompt: "Sky is blue?",
      correctValue: true, explanation: "Yes." },
  ],
};

describe("QuizRunner", () => {
  it("runs the quiz, submits, saves an attempt, and shows results", async () => {
    const repo = new NullAttemptRepository();
    const saveSpy = vi.spyOn(repo, "save");
    render(<QuizRunner quiz={quiz} attemptRepo={repo} onExit={vi.fn()} />);

    await userEvent.click(screen.getByLabelText("True"));
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByText(/Results — Demo/)).toBeInTheDocument();
    expect(screen.getByText(/100%/)).toBeInTheDocument();
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy.mock.calls[0][0]).toMatchObject({ quizId: "q", pct: 100 });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/components/QuizRunner.test.tsx`
Expected: FAIL — cannot find module `./QuizRunner`.

- [x] **Step 3: Write `src/ui/components/QuizRunner.tsx`**

```tsx
import { useEffect, useRef } from "react";
import type { Quiz } from "../../domain/schema";
import type { Attempt } from "../../domain/models";
import type { AttemptRepository } from "../../data/AttemptRepository";
import { useQuizSession } from "../../session/useQuizSession";
import { answeredCount } from "../../session/QuizSession";
import { QuestionView } from "./QuestionView";
import { Results } from "./Results";
import { History } from "./History";

export interface QuizRunnerProps {
  quiz: Quiz;
  attemptRepo: AttemptRepository;
  onExit: () => void;
}

export function QuizRunner({ quiz, attemptRepo, onExit }: QuizRunnerProps) {
  const { state, dispatch } = useQuizSession(quiz);
  const saved = useRef(false);

  useEffect(() => {
    if (state.submitted && state.result && !saved.current) {
      saved.current = true;
      const attempt: Attempt = {
        quizId: quiz.id,
        quizTitle: quiz.title,
        timestamp: new Date().toISOString(),
        rawScore: state.result.rawScore,
        total: state.result.total,
        pct: state.result.pct,
        byDifficulty: state.result.byDifficulty,
      };
      attemptRepo.save(attempt);
    }
  }, [state.submitted, state.result, quiz, attemptRepo]);

  if (state.submitted && state.result) {
    return (
      <div>
        <Results quiz={state.quiz} answers={state.answers} result={state.result} onBackToMenu={onExit} />
        <h3>Past attempts</h3>
        <History attempts={attemptRepo.listByQuiz(quiz.id)} />
      </div>
    );
  }

  const question = state.quiz.questions[state.currentIndex];
  const isLast = state.currentIndex === state.quiz.questions.length - 1;

  return (
    <div>
      <p>
        Question {state.currentIndex + 1} of {state.quiz.questions.length} · answered{" "}
        {answeredCount(state)}/{state.quiz.questions.length}
      </p>
      <QuestionView
        question={question}
        answer={state.answers[question.id]}
        onAnswer={(answer) => dispatch({ kind: "answer", questionId: question.id, answer })}
      />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <button onClick={() => dispatch({ kind: "prev" })} disabled={state.currentIndex === 0}>
          Previous
        </button>
        {!isLast && <button onClick={() => dispatch({ kind: "next" })}>Next</button>}
        {isLast && <button onClick={() => dispatch({ kind: "submit" })}>Submit</button>}
        <button onClick={onExit}>Quit</button>
      </div>
    </div>
  );
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/components/QuizRunner.test.tsx`
Expected: PASS (1 passed).

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add exam-flow quiz runner" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 14: QuizMenu

**Files:**
- Create: `src/ui/components/QuizMenu.tsx`
- Test: `src/ui/components/QuizMenu.test.tsx`

**Interfaces:**
- Consumes: `Quiz` from `../../domain/schema`; `QuizRepository`, `QuizListing` from `../../data/QuizRepository`.
- Produces: `interface QuizMenuProps { repository: QuizRepository; onSelect: (quiz: Quiz) => void }`; component `QuizMenu`. Renders a loading state, an empty state, a list of quizzes (title + question count), and any load errors.

- [x] **Step 1: Write the failing test**

`src/ui/components/QuizMenu.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizMenu } from "./QuizMenu";
import type { QuizRepository, QuizListing } from "../../data/QuizRepository";
import type { Quiz } from "../../domain/schema";

const quiz: Quiz = {
  id: "demo", title: "Demo Quiz", source: "s", createdAt: "2026-06-20",
  questions: [{ id: "1", type: "true_false", difficulty: "easy", prompt: "p", correctValue: true, explanation: "e" }],
};

function repoWith(listing: QuizListing): QuizRepository {
  return {
    list: () => Promise.resolve(listing),
    get: (id) => Promise.resolve(listing.quizzes.find((q) => q.id === id)),
  };
}

describe("QuizMenu", () => {
  it("lists quizzes and fires onSelect", async () => {
    const onSelect = vi.fn();
    render(<QuizMenu repository={repoWith({ quizzes: [quiz], errors: [] })} onSelect={onSelect} />);
    const btn = await screen.findByRole("button", { name: /Demo Quiz/ });
    await userEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith(quiz);
  });

  it("shows an empty state when there are no quizzes", async () => {
    render(<QuizMenu repository={repoWith({ quizzes: [], errors: [] })} onSelect={vi.fn()} />);
    expect(await screen.findByText(/drop a quiz/i)).toBeInTheDocument();
  });

  it("surfaces load errors", async () => {
    render(<QuizMenu repository={repoWith({ quizzes: [], errors: [{ source: "bad.json", message: "boom" }] })} onSelect={vi.fn()} />);
    expect(await screen.findByText(/bad\.json/)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/components/QuizMenu.test.tsx`
Expected: FAIL — cannot find module `./QuizMenu`.

- [x] **Step 3: Write `src/ui/components/QuizMenu.tsx`**

```tsx
import { useEffect, useState } from "react";
import type { Quiz } from "../../domain/schema";
import type { QuizRepository, QuizListing } from "../../data/QuizRepository";

export interface QuizMenuProps {
  repository: QuizRepository;
  onSelect: (quiz: Quiz) => void;
}

export function QuizMenu({ repository, onSelect }: QuizMenuProps) {
  const [listing, setListing] = useState<QuizListing | null>(null);

  useEffect(() => {
    let active = true;
    repository.list().then((l) => {
      if (active) setListing(l);
    });
    return () => {
      active = false;
    };
  }, [repository]);

  if (!listing) return <p>Loading…</p>;

  return (
    <div>
      <h1>Quiz Generator</h1>
      {listing.quizzes.length === 0 ? (
        <p>No quizzes found. Drop a quiz JSON into <code>src/quizzes/</code> and reload.</p>
      ) : (
        <ul>
          {listing.quizzes.map((q) => (
            <li key={q.id} style={{ marginBottom: "0.5rem" }}>
              <button onClick={() => onSelect(q)}>
                {q.title} ({q.questions.length} questions)
              </button>
            </li>
          ))}
        </ul>
      )}
      {listing.errors.length > 0 && (
        <div style={{ marginTop: "1rem", color: "crimson" }}>
          <p>Some files could not be loaded:</p>
          <ul>
            {listing.errors.map((e) => (
              <li key={e.source}>
                {e.source}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/components/QuizMenu.test.tsx`
Expected: PASS (3 passed).

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add quiz menu with empty and error states" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 15: App composition root + example quiz + manual verification

**Files:**
- Create: `src/App.tsx`
- Create: `src/quizzes/example.json`
- Modify: `src/main.tsx` (render `<App />` instead of the placeholder)
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `Quiz` from `./domain/schema`; `GlobQuizRepository` from `./data/GlobQuizRepository`; `createAttemptRepository` from `./data/createAttemptRepository`; `QuizMenu`, `QuizRunner`.
- Produces: component `App` wiring `import.meta.glob("./quizzes/*.json")` into a `GlobQuizRepository`, a process-wide `AttemptRepository`, and menu↔runner navigation.

- [x] **Step 1: Write the example quiz dataset**

`src/quizzes/example.json`:
```json
{
  "id": "demo-mixed",
  "title": "Demo — Mixed Question Types",
  "source": "manual",
  "createdAt": "2026-06-20",
  "questions": [
    {
      "id": "q1",
      "type": "single_choice",
      "difficulty": "easy",
      "prompt": "Which planet is closest to the Sun?",
      "options": [
        { "id": "a", "text": "Venus orbits nearer than the others" },
        { "id": "b", "text": "Mercury sits in the innermost orbit" },
        { "id": "c", "text": "Earth holds the closest position" },
        { "id": "d", "text": "Mars travels just inside Earth" }
      ],
      "correctOptionId": "b",
      "explanation": "Mercury is the innermost planet. Venus is second, Earth third, and Mars is outside Earth's orbit."
    },
    {
      "id": "q2",
      "type": "multi_select",
      "difficulty": "medium",
      "prompt": "Which of these are noble gases?",
      "options": [
        { "id": "a", "text": "Helium" },
        { "id": "b", "text": "Oxygen" },
        { "id": "c", "text": "Neon" },
        { "id": "d", "text": "Nitrogen" }
      ],
      "correctOptionIds": ["a", "c"],
      "explanation": "Helium and neon are noble gases (group 18). Oxygen and nitrogen are diatomic non-metals, not noble gases."
    },
    {
      "id": "q3",
      "type": "true_false",
      "difficulty": "easy",
      "prompt": "Water boils at 100°C at standard atmospheric pressure.",
      "correctValue": true,
      "explanation": "At 1 atm, water's boiling point is 100°C by definition of the Celsius scale."
    }
  ]
}
```

- [x] **Step 2: Write the failing test**

`src/App.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders the menu with the bundled example quiz", async () => {
    render(<App />);
    expect(await screen.findByRole("button", { name: /Demo — Mixed Question Types/ })).toBeInTheDocument();
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — cannot find module `./App`.

- [x] **Step 4: Write `src/App.tsx`**

```tsx
import { useMemo, useState } from "react";
import type { Quiz } from "./domain/schema";
import { GlobQuizRepository, type QuizModuleMap } from "./data/GlobQuizRepository";
import { createAttemptRepository } from "./data/createAttemptRepository";
import { QuizMenu } from "./ui/components/QuizMenu";
import { QuizRunner } from "./ui/components/QuizRunner";

export function App() {
  const repository = useMemo(() => {
    const modules = import.meta.glob("./quizzes/*.json") as QuizModuleMap;
    return new GlobQuizRepository(modules);
  }, []);
  const attemptRepo = useMemo(() => createAttemptRepository(), []);
  const [active, setActive] = useState<Quiz | null>(null);

  if (active) {
    return <QuizRunner quiz={active} attemptRepo={attemptRepo} onExit={() => setActive(null)} />;
  }
  return <QuizMenu repository={repository} onSelect={setActive} />;
}
```

- [x] **Step 5: Update `src/main.tsx` to render the app**

Replace the entire file contents:
```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [x] **Step 6: Run the full test suite and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all test files PASS, `tsc` reports no errors.

- [x] **Step 7: Manual verification in the browser**

Run: `npm run dev`
Then open the printed URL and confirm:
- The menu lists "Demo — Mixed Question Types (3 questions)".
- Selecting it shows question 1; Next/Previous navigate; option order may differ from the JSON (shuffle working).
- Answering all three and clicking Submit shows the results screen with a percentage, a per-difficulty breakdown, per-question correct answers + explanations, and a "Past attempts" table.
- Reloading and retaking adds a second row to "Past attempts" (localStorage working).
Stop the dev server when done (Ctrl+C).

- [x] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: wire app composition root with glob repository and example quiz" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## How to generate a quiz dataset (operating instructions)

This is the human/Claude workflow, not a build task:

1. Paste a PDF (or its text) into the Claude chat and ask for a quiz.
2. Claude returns JSON conforming to `src/domain/schema.ts`, following the generation rules in the spec (length-neutral options, randomized correct position, plausible distractors, no "all/none of the above", difficulty tags, teaching explanations, count scaled to the source).
3. Save the JSON into `src/quizzes/<name>.json`.
4. Reload the dev server — the quiz appears in the menu automatically (`import.meta.glob`). Invalid files are skipped and reported in the menu's error panel.

---

## Plan Self-Review

- **Spec coverage:**
  - Two-part system → generator workflow documented above; player app = Tasks 1–15. ✓
  - Dataset format + generation rules → Task 2 schema (source of truth) + operating instructions. ✓
  - All three question types → Tasks 2, 4, 10. ✓
  - Exam mode (answer all, free nav, submit, review) → Tasks 8, 13, 11. ✓
  - Partial-credit multi-select formula → Task 4 (`MultiSelectGrader`) + test. ✓
  - Scoring incl. byDifficulty → Task 5. ✓
  - Strategy + Repository + Registry, SOLID → Tasks 4, 6, 7, 10. ✓
  - zod validation on load → Tasks 2, 6. ✓
  - Runtime option shuffle → Tasks 3, 8. ✓
  - Quiz discovery via import.meta.glob → Tasks 6, 15. ✓
  - localStorage attempt history + Null fallback → Tasks 7, 12, 13. ✓
  - Error handling (invalid JSON, empty folder, no localStorage) → Tasks 6, 14, 7. ✓
  - Testing strategy (Vitest + jsdom + RTL, TDD) → every task. ✓
  - Out of scope items (study mode, timer, difficulty filtering, PDF parsing) → not implemented, by design. ✓
- **Placeholder scan:** No "TBD"/"add error handling"-style steps; every code step contains full code. ✓
- **Type consistency:** `Answer`, `QuestionResult`, `QuizResult`, `Attempt`, `Grader`, `QuizRepository`, `AttemptRepository`, `QuestionViewProps`, `QuizSessionState`/`SessionAction` names are used identically across producing and consuming tasks. `gradeQuestion`/`gradeQuiz`/`shuffleQuizOptions`/`initSession`/`sessionReducer`/`answeredCount`/`createAttemptRepository` signatures match their call sites. ✓
