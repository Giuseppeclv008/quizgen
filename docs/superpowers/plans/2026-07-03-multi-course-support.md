# Multi-Course Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organize quizzes into courses, each with its own routed page (topics/PDF selection + per-course history), moving all existing quizzes into a `software-design-architecture` course folder.

**Architecture:** Quizzes live in `src/quizzes/<course-folder>/` with a `course.json` per folder. A new `GlobCourseRepository` groups quizzes by folder into `Course` objects. `react-router-dom` (`HashRouter`) provides `#/` (home, course cards), `#/course/:courseId` (existing `QuizMenu` scoped to the course), and `#/course/:courseId/history` (filtered history). Combined-quiz attempts get course-tagged ids (`combined:<courseId>`) so per-course history can include them.

**Tech Stack:** React 18, TypeScript (strict), zod, vitest + @testing-library/react, react-router-dom (new dep), Vite `import.meta.glob`.

**Spec:** `docs/superpowers/specs/2026-07-03-multi-course-design.md`

## Global Constraints

- Only new dependency allowed: `react-router-dom` (runtime dep).
- Hash-based routing only (`HashRouter`) — GitHub Pages has no server rewrites.
- All quiz/course JSON validated with zod; invalid files become `LoadError`s, never silent drops.
- `npm test` (vitest) and `npm run build` (tsc --noEmit && vite build) must pass at every commit.
- Build with old code paths must stay green until the Task 6 switchover; that is why Tasks 2–5 add new code without touching `App.tsx` or the existing `GlobQuizRepository`.
- Course folder name must equal the `id` inside its `course.json` (convention; repository keys by folder).

---

### Task 1: Course domain type + schema

**Files:**
- Create: `src/domain/course.ts`
- Test: `src/domain/course.test.ts`

**Interfaces:**
- Consumes: `Quiz` from `src/domain/schema.ts`.
- Produces: `courseMetaSchema` (zod), `type CourseMeta = { id: string; title: string; description: string }`, `interface Course extends CourseMeta { quizzes: Quiz[] }`. Tasks 3–6 import these.

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/course.test.ts
import { describe, it, expect } from "vitest";
import { courseMetaSchema } from "./course";

describe("courseMetaSchema", () => {
  it("accepts valid course metadata", () => {
    const parsed = courseMetaSchema.safeParse({
      id: "software-design-architecture",
      title: "Software Design and Architecture",
      description: "Design principles, patterns, and architecture.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing or empty required fields", () => {
    expect(courseMetaSchema.safeParse({ id: "", title: "T", description: "" }).success).toBe(false);
    expect(courseMetaSchema.safeParse({ title: "T", description: "" }).success).toBe(false);
    expect(courseMetaSchema.safeParse({ id: "x", description: "" }).success).toBe(false);
  });

  it("allows an empty description", () => {
    expect(courseMetaSchema.safeParse({ id: "x", title: "T", description: "" }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/course.test.ts`
Expected: FAIL — `Cannot find module './course'` (or equivalent).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/course.ts
import { z } from "zod";
import type { Quiz } from "./schema";

export const courseMetaSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
});

export type CourseMeta = z.infer<typeof courseMetaSchema>;

export interface Course extends CourseMeta {
  quizzes: Quiz[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/course.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/course.ts src/domain/course.test.ts
git commit -m "feat: add course domain type and metadata schema"
```

---

### Task 2: Course-tagged combined quiz ids

Combined (assembled) quizzes currently get the synthetic id `"combined"`. Per-course history needs to know which course an assembled attempt belongs to, so assembly functions accept an optional `courseId` and produce `combined:<courseId>`. Omitting `courseId` keeps the legacy `"combined"` id, so existing callers (`App.tsx`) stay correct until Task 6. Note: attempts recorded before this feature keep the plain `"combined"` id and will not appear in any course's history — accepted data limitation from the spec.

**Files:**
- Modify: `src/domain/topics.ts` (function `synthetic`, `assembleQuiz`, `assembleFromSources`)
- Modify: `src/ui/components/HistoryScreen.tsx:13-16` (`headingFor`)
- Test: `src/domain/topics.test.ts`, `src/ui/components/HistoryScreen.test.tsx`

**Interfaces:**
- Consumes: existing `assembleQuiz(groups, selectedTopics, cap, rng)` and `assembleFromSources(sources, selectedQuizIds, cap, rng)` from `src/domain/topics.ts`.
- Produces: `assembleQuiz(groups: TopicGroup[], selectedTopics: string[], cap: number, rng: Rng = Math.random, courseId?: string): Quiz` and `assembleFromSources(sources: SourceGroup[], selectedQuizIds: string[], cap: number, rng: Rng = Math.random, courseId?: string): Quiz`. When `courseId` is given, the returned quiz id is `` `combined:${courseId}` ``; otherwise `"combined"`. Task 5 (CoursePage) passes `course.id`; Task 5's history page matches on `` `combined:${course.id}` ``.

- [ ] **Step 1: Write the failing tests**

Append to `src/domain/topics.test.ts`:

```ts
describe("course-tagged combined ids", () => {
  const groups = [
    {
      topic: "General",
      questions: [
        { id: "q1", type: "true_false", difficulty: "easy", topic: "General",
          prompt: "p", correctValue: true, explanation: "e" },
      ],
    },
  ] as TopicGroup[];

  it("assembleQuiz tags the combined id with the course id", () => {
    const quiz = assembleQuiz(groups, ["General"], 5, Math.random, "swda");
    expect(quiz.id).toBe("combined:swda");
  });

  it("assembleQuiz keeps legacy 'combined' id without a course id", () => {
    expect(assembleQuiz(groups, ["General"], 5).id).toBe("combined");
  });

  it("assembleFromSources tags the combined id with the course id", () => {
    const sources = [{ quizId: "a", title: "A", questions: groups[0].questions }];
    expect(assembleFromSources(sources, ["a"], 5, Math.random, "swda").id).toBe("combined:swda");
  });
});
```

(Import `assembleFromSources` and `TopicGroup` in that file's imports if not already imported.)

Append to `src/ui/components/HistoryScreen.test.tsx` (follow the file's existing render/fixture pattern for building `Attempt` objects):

```tsx
it("shows 'Combined quizzes' heading for course-tagged combined attempts", () => {
  const attempt = makeAttempt({ quizId: "combined:swda", quizTitle: "General" });
  render(<HistoryScreen groups={{ "combined:swda": [attempt] }} onBack={() => {}} />);
  expect(screen.getByRole("heading", { name: /combined quizzes/i })).toBeInTheDocument();
});
```

If `HistoryScreen.test.tsx` has no `makeAttempt` helper, build the attempt literal matching the `Attempt` type in `src/domain/models.ts` (read that file first).

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/domain/topics.test.ts src/ui/components/HistoryScreen.test.tsx`
Expected: FAIL — `combined:swda` ids not produced / heading shows quiz title instead of "Combined quizzes".

- [ ] **Step 3: Implement**

In `src/domain/topics.ts` replace `synthetic`, `assembleQuiz`, `assembleFromSources`:

```ts
function synthetic(title: string, questions: Question[], courseId?: string): Quiz {
  return {
    id: courseId ? `combined:${courseId}` : "combined",
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
  courseId?: string,
): Quiz {
  const selected = groups.filter((g) => selectedTopics.includes(g.topic));
  return synthetic(selectedTopics.join(", "), shuffle(pickEvenly(selected, cap, rng), rng), courseId);
}

export function assembleFromSources(
  sources: SourceGroup[],
  selectedQuizIds: string[],
  cap: number,
  rng: Rng = Math.random,
  courseId?: string,
): Quiz {
  const selected = sources.filter((s) => selectedQuizIds.includes(s.quizId));
  return synthetic(
    selected.map((s) => s.title).join(", "),
    shuffle(pickEvenly(selected, cap, rng), rng),
    courseId,
  );
}
```

In `src/ui/components/HistoryScreen.tsx` update `headingFor`:

```ts
function headingFor(quizId: string, rows: Attempt[]): string {
  if (quizId === "combined" || quizId.startsWith("combined:")) return "Combined quizzes";
  return rows[0]?.quizTitle || quizId;
}
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — all suites (existing `App.tsx` callers still omit `courseId`, so behavior is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/domain/topics.ts src/domain/topics.test.ts src/ui/components/HistoryScreen.tsx src/ui/components/HistoryScreen.test.tsx
git commit -m "feat: tag combined quiz ids with their course id"
```

---

### Task 3: GlobCourseRepository

New repository class in a new file; the old `GlobQuizRepository` stays untouched until Task 6 so the app keeps working.

**Files:**
- Create: `src/data/CourseRepository.ts`
- Test: `src/data/CourseRepository.test.ts`

**Interfaces:**
- Consumes: `quizSchema` from `src/domain/schema.ts`, `courseMetaSchema`/`Course` from `src/domain/course.ts` (Task 1), `LoadError` from `src/data/QuizRepository.ts`.
- Produces:
  - `type QuizModuleMap = Record<string, () => Promise<unknown>>` (re-exported here; Task 6 imports it from this file)
  - `interface CourseListing { courses: Course[]; errors: LoadError[] }`
  - `class GlobCourseRepository { constructor(courseModules: QuizModuleMap, quizModules: QuizModuleMap); list(): Promise<CourseListing> }`
  - Courses sorted by title; each course's quizzes sorted by title. Quiz files in a folder without a valid `course.json` produce a `LoadError`. `quizModules` entries ending in `/course.json` are skipped (the `./quizzes/*/*.json` glob includes them).

- [ ] **Step 1: Write the failing test**

```ts
// src/data/CourseRepository.test.ts
import { describe, it, expect } from "vitest";
import { GlobCourseRepository, type QuizModuleMap } from "./CourseRepository";

const validQuiz = {
  id: "valid", title: "Valid", source: "s.pdf", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "true_false", difficulty: "easy", topic: "General", prompt: "p",
      correctValue: true, explanation: "e" },
  ],
};

const courseMeta = { id: "swda", title: "SW Design", description: "desc" };

function courseModules(): QuizModuleMap {
  return {
    "./quizzes/swda/course.json": () => Promise.resolve({ default: courseMeta }),
    "./quizzes/empty/course.json": () =>
      Promise.resolve({ default: { id: "empty", title: "Empty Course", description: "" } }),
    "./quizzes/badmeta/course.json": () => Promise.resolve({ default: { id: "" } }),
  };
}

function quizModules(): QuizModuleMap {
  return {
    "./quizzes/swda/course.json": () => Promise.resolve({ default: courseMeta }),
    "./quizzes/swda/valid.json": () => Promise.resolve({ default: validQuiz }),
    "./quizzes/swda/broken.json": () => Promise.resolve({ default: { id: "x" } }),
    "./quizzes/orphan/lost.json": () => Promise.resolve({ default: validQuiz }),
  };
}

describe("GlobCourseRepository", () => {
  it("groups quizzes into their course by folder", async () => {
    const repo = new GlobCourseRepository(courseModules(), quizModules());
    const { courses } = await repo.list();
    const swda = courses.find((c) => c.id === "swda");
    expect(swda?.quizzes.map((q) => q.id)).toEqual(["valid"]);
  });

  it("lists a course with zero quizzes", async () => {
    const repo = new GlobCourseRepository(courseModules(), quizModules());
    const { courses } = await repo.list();
    expect(courses.find((c) => c.id === "empty")?.quizzes).toEqual([]);
  });

  it("collects errors for invalid course.json, invalid quizzes, and orphan quizzes", async () => {
    const repo = new GlobCourseRepository(courseModules(), quizModules());
    const { courses, errors } = await repo.list();
    expect(courses.map((c) => c.id).sort()).toEqual(["empty", "swda"]);
    const sources = errors.map((e) => e.source);
    expect(sources).toContainEqual(expect.stringContaining("badmeta/course.json"));
    expect(sources).toContainEqual(expect.stringContaining("swda/broken.json"));
    expect(sources).toContainEqual(expect.stringContaining("orphan/lost.json"));
    expect(errors).toHaveLength(3);
  });

  it("does not treat course.json entries in the quiz glob as quizzes", async () => {
    const repo = new GlobCourseRepository(courseModules(), quizModules());
    const { courses, errors } = await repo.list();
    const swda = courses.find((c) => c.id === "swda");
    expect(swda?.quizzes).toHaveLength(1);
    expect(errors.map((e) => e.source)).not.toContainEqual(
      expect.stringContaining("swda/course.json"),
    );
  });

  it("collects errors when a loader throws", async () => {
    const repo = new GlobCourseRepository(courseModules(), {
      "./quizzes/swda/throws.json": () => Promise.reject(new Error("network error")),
    });
    const { errors } = await repo.list();
    expect(errors.map((e) => e.message)).toContainEqual(expect.stringContaining("network error"));
  });

  it("sorts courses and quizzes by title", async () => {
    const repo = new GlobCourseRepository(
      {
        "./quizzes/b/course.json": () =>
          Promise.resolve({ default: { id: "b", title: "Zeta", description: "" } }),
        "./quizzes/a/course.json": () =>
          Promise.resolve({ default: { id: "a", title: "Alpha", description: "" } }),
      },
      {
        "./quizzes/a/z.json": () =>
          Promise.resolve({ default: { ...validQuiz, id: "z", title: "Zed" } }),
        "./quizzes/a/a.json": () =>
          Promise.resolve({ default: { ...validQuiz, id: "a", title: "Abc" } }),
      },
    );
    const { courses } = await repo.list();
    expect(courses.map((c) => c.title)).toEqual(["Alpha", "Zeta"]);
    expect(courses[0].quizzes.map((q) => q.title)).toEqual(["Abc", "Zed"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/CourseRepository.test.ts`
Expected: FAIL — `Cannot find module './CourseRepository'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/data/CourseRepository.ts
import { quizSchema } from "../domain/schema";
import { courseMetaSchema, type Course } from "../domain/course";
import type { LoadError } from "./QuizRepository";

export type QuizModuleMap = Record<string, () => Promise<unknown>>;

export interface CourseListing {
  courses: Course[];
  errors: LoadError[];
}

function folderOf(path: string): string {
  return path.slice(0, path.lastIndexOf("/"));
}

async function loadJson(loader: () => Promise<unknown>): Promise<unknown> {
  const mod = (await loader()) as { default?: unknown };
  return mod && typeof mod === "object" && "default" in mod ? mod.default : mod;
}

export class GlobCourseRepository {
  constructor(
    private readonly courseModules: QuizModuleMap,
    private readonly quizModules: QuizModuleMap,
  ) {}

  async list(): Promise<CourseListing> {
    const errors: LoadError[] = [];
    const byFolder = new Map<string, Course>();

    for (const [source, loader] of Object.entries(this.courseModules)) {
      try {
        const parsed = courseMetaSchema.safeParse(await loadJson(loader));
        if (parsed.success) {
          byFolder.set(folderOf(source), { ...parsed.data, quizzes: [] });
        } else {
          errors.push({ source, message: parsed.error.issues.map((i) => i.message).join("; ") });
        }
      } catch (e) {
        errors.push({ source, message: e instanceof Error ? e.message : String(e) });
      }
    }

    for (const [source, loader] of Object.entries(this.quizModules)) {
      if (source.endsWith("/course.json")) continue;
      const course = byFolder.get(folderOf(source));
      if (!course) {
        errors.push({ source, message: "no valid course.json in this folder" });
        continue;
      }
      try {
        const parsed = quizSchema.safeParse(await loadJson(loader));
        if (parsed.success) {
          course.quizzes.push(parsed.data);
        } else {
          errors.push({ source, message: parsed.error.issues.map((i) => i.message).join("; ") });
        }
      } catch (e) {
        errors.push({ source, message: e instanceof Error ? e.message : String(e) });
      }
    }

    const courses = [...byFolder.values()].sort((a, b) => a.title.localeCompare(b.title));
    for (const c of courses) c.quizzes.sort((a, b) => a.title.localeCompare(b.title));
    return { courses, errors };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/CourseRepository.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/CourseRepository.ts src/data/CourseRepository.test.ts
git commit -m "feat: add course-aware glob repository"
```

---

### Task 4: react-router-dom + HomePage

**Files:**
- Modify: `package.json` (dependency added by npm)
- Create: `src/ui/pages/HomePage.tsx`
- Modify: `src/app.css` (append course-card styles)
- Test: `src/ui/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `Course` (Task 1), `LoadError` from `src/data/QuizRepository.ts`, `Link` from react-router-dom.
- Produces: `HomePage({ courses, errors }: { courses: Course[]; errors: LoadError[] })` — renders one card-link per course pointing at `/course/${course.id}`. Task 6 mounts it at route `/`.

- [ ] **Step 1: Install react-router-dom**

Run: `npm install react-router-dom`
Expected: `added N packages` and `react-router-dom` under `dependencies` in package.json.

- [ ] **Step 2: Write the failing test**

```tsx
// src/ui/pages/HomePage.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "./HomePage";
import type { Course } from "../../domain/course";

const courses: Course[] = [
  { id: "swda", title: "SW Design", description: "Design course", quizzes: [] },
  { id: "new-course", title: "New Course", description: "Placeholder", quizzes: [] },
];

function renderHome(list: Course[] = courses, errors = []) {
  return render(
    <MemoryRouter>
      <HomePage courses={list} errors={errors} />
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  it("renders one card per course linking to its page", () => {
    renderHome();
    const link = screen.getByRole("link", { name: /SW Design/ });
    expect(link).toHaveAttribute("href", "/course/swda");
    expect(screen.getByRole("link", { name: /New Course/ })).toBeInTheDocument();
  });

  it("shows an empty state when there are no courses", () => {
    renderHome([]);
    expect(screen.getByText(/no courses found/i)).toBeInTheDocument();
  });

  it("lists load errors", () => {
    renderHome(courses, [{ source: "./quizzes/x/bad.json", message: "boom" }]);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/bad\.json/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/ui/pages/HomePage.test.tsx`
Expected: FAIL — `Cannot find module './HomePage'`.

- [ ] **Step 4: Write the implementation**

```tsx
// src/ui/pages/HomePage.tsx
import { Link } from "react-router-dom";
import type { Course } from "../../domain/course";
import type { LoadError } from "../../data/QuizRepository";

export interface HomePageProps {
  courses: Course[];
  errors: LoadError[];
}

export function HomePage({ courses, errors }: HomePageProps) {
  return (
    <main className="menu">
      <h1>Quiz Generator</h1>
      <p className="lede">Pick a course to practice.</p>
      {courses.length === 0 ? (
        <div className="empty">
          <p>No courses found.</p>
          <p className="muted">
            Create <code>src/quizzes/&lt;course&gt;/course.json</code> and reload.
          </p>
        </div>
      ) : (
        <ul className="course-list">
          {courses.map((c) => (
            <li key={c.id} className="course-card">
              <Link to={`/course/${c.id}`}>
                <h2>{c.title}</h2>
                <p className="muted">{c.description}</p>
                <p className="muted">
                  {c.quizzes.length} {c.quizzes.length === 1 ? "quiz" : "quizzes"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
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

Append to `src/app.css` (match the file's existing color variables/conventions — read the file first and reuse its tokens):

```css
.course-list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 12px;
}

.course-card a {
  display: block;
  padding: 16px;
  border: 1px solid var(--border, #444);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
}

.course-card a:hover {
  border-color: var(--accent, #7aa2f7);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/ui/pages/HomePage.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/ui/pages/HomePage.tsx src/ui/pages/HomePage.test.tsx src/app.css
git commit -m "feat: add react-router-dom and course home page"
```

---

### Task 5: CoursePage + CourseHistoryPage

**Files:**
- Create: `src/ui/pages/CoursePage.tsx`
- Create: `src/ui/pages/CourseHistoryPage.tsx`
- Modify: `src/ui/components/QuizMenu.tsx` (optional `title` prop)
- Test: `src/ui/pages/CoursePage.test.tsx`, `src/ui/pages/CourseHistoryPage.test.tsx`

**Interfaces:**
- Consumes: `Course` (Task 1); `assembleQuiz`/`assembleFromSources` with trailing `courseId` param (Task 2); `collectTopics`, `collectSources` from `src/domain/topics.ts`; `shuffleQuizOptions` from `src/domain/shuffle.ts`; `AttemptRepository` from `src/data/AttemptRepository.ts`; `QuizMenu`, `QuizRunner`, `HistoryScreen` components; `useParams`, `useNavigate`, `Link` from react-router-dom.
- Produces:
  - `CoursePage({ courses, attemptRepo }: { courses: Course[]; attemptRepo: AttemptRepository })` — reads `courseId` from route params; unknown id renders "Course not found" with a home link. Task 6 mounts at `/course/:courseId`.
  - `CourseHistoryPage({ courses, attemptRepo })` (same props) — Task 6 mounts at `/course/:courseId/history`. Shows attempts whose `quizId` is one of the course's quiz ids or `` `combined:${course.id}` ``.
  - `QuizMenuProps` gains optional `title?: string` (heading defaults to `"Quiz Generator"`).

- [ ] **Step 1: Read `src/domain/models.ts` and `src/ui/components/HistoryScreen.test.tsx`**

Needed to build valid `Attempt` fixtures for the history test. Reuse the existing fixture pattern.

- [ ] **Step 2: Write the failing CoursePage test**

```tsx
// src/ui/pages/CoursePage.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CoursePage } from "./CoursePage";
import { NullAttemptRepository } from "../../data/NullAttemptRepository";
import type { Course } from "../../domain/course";

const quiz = {
  id: "q1", title: "Quiz One", source: "one.pdf", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "true_false" as const, difficulty: "easy" as const, topic: "Astronomy",
      prompt: "p", correctValue: true, explanation: "e" },
  ],
};

const courses: Course[] = [
  { id: "swda", title: "SW Design", description: "d", quizzes: [quiz] },
];

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/course/:courseId"
          element={<CoursePage courses={courses} attemptRepo={new NullAttemptRepository()} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CoursePage", () => {
  it("shows the course title and only its own sources", async () => {
    renderAt("/course/swda");
    expect(screen.getByRole("heading", { name: /SW Design/ })).toBeInTheDocument();
    expect(await screen.findByRole("checkbox", { name: /Quiz One/ })).toBeInTheDocument();
  });

  it("shows only the course's topics on the topic tab", async () => {
    renderAt("/course/swda");
    await userEvent.click(screen.getByRole("tab", { name: /by topic/i }));
    expect(screen.getByRole("checkbox", { name: /Astronomy/ })).toBeInTheDocument();
  });

  it("starts a quiz from a selected PDF", async () => {
    renderAt("/course/swda");
    await userEvent.click(await screen.findByRole("checkbox", { name: /Quiz One/ }));
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(await screen.findByText(/Question 1 of/)).toBeInTheDocument();
  });

  it("renders not-found for an unknown course id", () => {
    renderAt("/course/nope");
    expect(screen.getByText(/course not found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to courses/i })).toHaveAttribute("href", "/");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/ui/pages/CoursePage.test.tsx`
Expected: FAIL — `Cannot find module './CoursePage'`.

- [ ] **Step 4: Add the `title` prop to QuizMenu**

In `src/ui/components/QuizMenu.tsx`: add `title?: string;` to `QuizMenuProps`, add `title` to the destructured props, and change the heading line to:

```tsx
<h1>{title ?? "Quiz Generator"}</h1>
```

- [ ] **Step 5: Implement CoursePage**

```tsx
// src/ui/pages/CoursePage.tsx
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Quiz } from "../../domain/schema";
import type { Course } from "../../domain/course";
import type { AttemptRepository } from "../../data/AttemptRepository";
import {
  collectTopics,
  collectSources,
  assembleQuiz,
  assembleFromSources,
} from "../../domain/topics";
import { shuffleQuizOptions } from "../../domain/shuffle";
import { QuizMenu } from "../components/QuizMenu";
import { QuizRunner } from "../components/QuizRunner";

export interface CoursePageProps {
  courses: Course[];
  attemptRepo: AttemptRepository;
}

export function CoursePage({ courses, attemptRepo }: CoursePageProps) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [active, setActive] = useState<Quiz | null>(null);
  const course = courses.find((c) => c.id === courseId);

  if (!course) {
    return (
      <main className="menu">
        <h1>Course not found</h1>
        <Link to="/">Back to courses</Link>
      </main>
    );
  }

  if (active) {
    return <QuizRunner quiz={active} attemptRepo={attemptRepo} onExit={() => setActive(null)} />;
  }

  const topics = collectTopics(course.quizzes);
  const sources = collectSources(course.quizzes);

  return (
    <>
      <nav className="crumbs">
        <Link to="/">← All courses</Link>
      </nav>
      <QuizMenu
        title={course.title}
        topics={topics}
        sources={sources}
        errors={[]}
        onShowHistory={() => navigate(`/course/${course.id}/history`)}
        onStartTopics={(selectedTopics, max) =>
          setActive(
            shuffleQuizOptions(assembleQuiz(topics, selectedTopics, max, Math.random, course.id)),
          )
        }
        onStartPdfs={(selectedQuizIds, max) =>
          setActive(
            shuffleQuizOptions(
              assembleFromSources(sources, selectedQuizIds, max, Math.random, course.id),
            ),
          )
        }
      />
    </>
  );
}
```

Append to `src/app.css`:

```css
.crumbs {
  max-width: 720px;
  margin: 16px auto 0;
  padding: 0 16px;
}
```

(Adjust `max-width`/padding to match how `.menu` is laid out in the existing CSS — read it first.)

- [ ] **Step 6: Run CoursePage test to verify it passes**

Run: `npx vitest run src/ui/pages/CoursePage.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 7: Write the failing CourseHistoryPage test**

```tsx
// src/ui/pages/CourseHistoryPage.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CourseHistoryPage } from "./CourseHistoryPage";
import type { Course } from "../../domain/course";
import type { Attempt } from "../../domain/models";
import type { AttemptRepository } from "../../data/AttemptRepository";

const quiz = {
  id: "q1", title: "Quiz One", source: "one.pdf", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "true_false" as const, difficulty: "easy" as const, topic: "General",
      prompt: "p", correctValue: true, explanation: "e" },
  ],
};

const courses: Course[] = [
  { id: "swda", title: "SW Design", description: "d", quizzes: [quiz] },
];

function makeAttempt(quizId: string, quizTitle: string): Attempt {
  const tally = { score: 0, total: 0 };
  return {
    quizId,
    quizTitle,
    timestamp: "2026-07-01T10:00:00.000Z",
    rawScore: 1,
    total: 1,
    pct: 100,
    byDifficulty: { easy: { score: 1, total: 1 }, medium: tally, hard: tally },
  };
}

function repoWith(groups: Record<string, Attempt[]>): AttemptRepository {
  return {
    save: () => Promise.resolve(),
    listByQuiz: (quizId) => Promise.resolve(groups[quizId] ?? []),
    allByQuiz: () => Promise.resolve(groups),
  };
}

function renderAt(repo: AttemptRepository) {
  return render(
    <MemoryRouter initialEntries={["/course/swda/history"]}>
      <Routes>
        <Route
          path="/course/:courseId/history"
          element={<CourseHistoryPage courses={courses} attemptRepo={repo} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CourseHistoryPage", () => {
  it("shows attempts for the course's quizzes and its combined attempts only", async () => {
    const repo = repoWith({
      q1: [makeAttempt("q1", "Quiz One")],
      "combined:swda": [makeAttempt("combined:swda", "General")],
      "combined:other": [makeAttempt("combined:other", "Other")],
      unrelated: [makeAttempt("unrelated", "Unrelated Quiz")],
    });
    renderAt(repo);
    expect(await screen.findByRole("heading", { name: /Quiz One/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /combined quizzes/i })).toBeInTheDocument();
    expect(screen.queryByText(/Unrelated Quiz/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Other/)).not.toBeInTheDocument();
  });

  it("shows the empty state when the course has no attempts", async () => {
    renderAt(repoWith({}));
    expect(await screen.findByText(/no past attempts yet/i)).toBeInTheDocument();
  });
});
```

(`Attempt` and `AttemptRepository` shapes above match `src/domain/models.ts` and `src/data/AttemptRepository.ts` exactly — `Attempt` = `{ quizId, quizTitle, timestamp, rawScore, total, pct, byDifficulty }`, repository = `{ save, listByQuiz, allByQuiz }`.)

- [ ] **Step 8: Run test to verify it fails**

Run: `npx vitest run src/ui/pages/CourseHistoryPage.test.tsx`
Expected: FAIL — `Cannot find module './CourseHistoryPage'`.

- [ ] **Step 9: Implement CourseHistoryPage**

```tsx
// src/ui/pages/CourseHistoryPage.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Course } from "../../domain/course";
import type { Attempt } from "../../domain/models";
import type { AttemptRepository } from "../../data/AttemptRepository";
import { HistoryScreen } from "../components/HistoryScreen";

export interface CourseHistoryPageProps {
  courses: Course[];
  attemptRepo: AttemptRepository;
}

export function CourseHistoryPage({ courses, attemptRepo }: CourseHistoryPageProps) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Record<string, Attempt[]> | null>(null);
  const course = courses.find((c) => c.id === courseId);

  useEffect(() => {
    let alive = true;
    attemptRepo.allByQuiz().then((g) => {
      if (alive) setGroups(g);
    });
    return () => {
      alive = false;
    };
  }, [attemptRepo]);

  if (!course) {
    return (
      <main className="menu">
        <h1>Course not found</h1>
        <Link to="/">Back to courses</Link>
      </main>
    );
  }
  if (!groups) return <p className="loading">Loading…</p>;

  const quizIds = new Set(course.quizzes.map((q) => q.id));
  const filtered = Object.fromEntries(
    Object.entries(groups).filter(
      ([quizId]) => quizIds.has(quizId) || quizId === `combined:${course.id}`,
    ),
  );

  return <HistoryScreen groups={filtered} onBack={() => navigate(`/course/${course.id}`)} />;
}
```

- [ ] **Step 10: Run the full suite**

Run: `npm test`
Expected: PASS — all suites, including existing `QuizMenu.test.tsx` (heading default unchanged).

- [ ] **Step 11: Commit**

```bash
git add src/ui/pages/CoursePage.tsx src/ui/pages/CoursePage.test.tsx src/ui/pages/CourseHistoryPage.tsx src/ui/pages/CourseHistoryPage.test.tsx src/ui/components/QuizMenu.tsx src/app.css
git commit -m "feat: add course page and per-course history page"
```

---

### Task 6: Switchover — move quiz files, rewrite App, delete legacy repository

Single task because these changes only work together: once quiz files move into subfolders, the old flat glob finds nothing.

**Files:**
- Move: all 19 `src/quizzes/*.json` → `src/quizzes/software-design-architecture/`
- Create: `src/quizzes/software-design-architecture/course.json`, `src/quizzes/new-course/course.json`
- Modify: `src/App.tsx` (router shell), `src/App.test.tsx`, `src/data/QuizRepository.ts` (prune)
- Delete: `src/data/GlobQuizRepository.ts`, `src/data/GlobQuizRepository.test.ts`

**Interfaces:**
- Consumes: `GlobCourseRepository`, `CourseListing`, `QuizModuleMap` from `src/data/CourseRepository.ts` (Task 3); `HomePage` (Task 4); `CoursePage`, `CourseHistoryPage` (Task 5); `HashRouter`, `Routes`, `Route` from react-router-dom.
- Produces: final `App` component. `src/data/QuizRepository.ts` keeps only `LoadError` (delete `QuizListing` and the `QuizRepository` interface after confirming no remaining importers with the grep in Step 1).

- [ ] **Step 1: Confirm remaining usages of the legacy repository types**

Run: `grep -rn "GlobQuizRepository\|QuizListing\|QuizRepository\b" src --include='*.ts' --include='*.tsx' | grep -v QuizRepository.ts`
Expected: hits only in `src/App.tsx`, `src/data/GlobQuizRepository.ts(.test.ts)`, and `LoadError` imports (which stay). If anything else imports `QuizListing`/`QuizRepository`, keep those types and only delete the glob class.

- [ ] **Step 2: Move quiz files and create course.json files**

```bash
mkdir -p src/quizzes/software-design-architecture src/quizzes/new-course
git mv src/quizzes/*.json src/quizzes/software-design-architecture/
```

Create `src/quizzes/software-design-architecture/course.json`:

```json
{
  "id": "software-design-architecture",
  "title": "Software Design and Architecture",
  "description": "Design principles, patterns, and the architecture of software systems — from monoliths to microservices."
}
```

Create `src/quizzes/new-course/course.json`:

```json
{
  "id": "new-course",
  "title": "New Course",
  "description": "Placeholder — rename this folder and edit course.json when the next course starts."
}
```

- [ ] **Step 3: Rewrite App.tsx**

```tsx
// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import {
  GlobCourseRepository,
  type CourseListing,
  type QuizModuleMap,
} from "./data/CourseRepository";
import { createAttemptRepository } from "./data/createAttemptRepository";
import { HomePage } from "./ui/pages/HomePage";
import { CoursePage } from "./ui/pages/CoursePage";
import { CourseHistoryPage } from "./ui/pages/CourseHistoryPage";

export function App() {
  const repository = useMemo(() => {
    const courseModules = import.meta.glob("./quizzes/*/course.json") as QuizModuleMap;
    const quizModules = import.meta.glob("./quizzes/*/*.json") as QuizModuleMap;
    return new GlobCourseRepository(courseModules, quizModules);
  }, []);
  const attemptRepo = useMemo(() => createAttemptRepository(), []);

  const [listing, setListing] = useState<CourseListing | null>(null);

  useEffect(() => {
    let alive = true;
    repository
      .list()
      .then((l) => {
        if (alive) setListing(l);
      })
      .catch(() => {
        if (alive) setListing({ courses: [], errors: [] });
      });
    return () => {
      alive = false;
    };
  }, [repository]);

  if (!listing) return <p className="loading">Loading…</p>;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage courses={listing.courses} errors={listing.errors} />} />
        <Route
          path="/course/:courseId"
          element={<CoursePage courses={listing.courses} attemptRepo={attemptRepo} />}
        />
        <Route
          path="/course/:courseId/history"
          element={<CourseHistoryPage courses={listing.courses} attemptRepo={attemptRepo} />}
        />
      </Routes>
    </HashRouter>
  );
}
```

- [ ] **Step 4: Delete legacy repository and prune types**

```bash
git rm src/data/GlobQuizRepository.ts src/data/GlobQuizRepository.test.ts
```

In `src/data/QuizRepository.ts`, keep only:

```ts
export interface LoadError {
  source: string;
  message: string;
}
```

(Only if Step 1 confirmed no other importers of `QuizListing`/`QuizRepository`.)

- [ ] **Step 5: Rewrite App.test.tsx**

HashRouter reads `window.location.hash`, which persists across tests in the same jsdom file — reset it before each test.

```tsx
// src/App.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    window.location.hash = "#/";
  });

  it("shows a card per course on the home page", async () => {
    render(<App />);
    expect(
      await screen.findByRole("link", { name: /Software Design and Architecture/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New Course/ })).toBeInTheDocument();
  });

  it("navigates into a course and shows its PDF checkboxes", async () => {
    render(<App />);
    await userEvent.click(
      await screen.findByRole("link", { name: /Software Design and Architecture/ }),
    );
    expect(
      await screen.findByRole("checkbox", { name: /Demo — Mixed Question Types/ }),
    ).toBeInTheDocument();
  });

  it("starts a quiz from a selected PDF inside a course", async () => {
    render(<App />);
    await userEvent.click(
      await screen.findByRole("link", { name: /Software Design and Architecture/ }),
    );
    await userEvent.click(
      await screen.findByRole("checkbox", { name: /Demo — Mixed Question Types/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(await screen.findByText(/Question 1 of/)).toBeInTheDocument();
  });

  it("opens per-course history and returns", async () => {
    render(<App />);
    await userEvent.click(
      await screen.findByRole("link", { name: /Software Design and Architecture/ }),
    );
    await userEvent.click(await screen.findByRole("button", { name: /past attempts/i }));
    expect(await screen.findByRole("heading", { name: /past attempts/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByRole("tab", { name: /by pdf/i })).toBeInTheDocument();
  });

  it("shows the placeholder course as empty", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("link", { name: /New Course/ }));
    expect(await screen.findByText(/no quizzes found/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the full suite and the build**

Run: `npm test`
Expected: PASS — all suites.

Run: `npm run build`
Expected: tsc clean, vite build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: route quizzes through course pages

Quizzes now live in src/quizzes/<course>/ with a course.json per
folder. Home page lists courses; each course page hosts the existing
topic/PDF quiz menu and a per-course history. Legacy flat-glob
repository removed."
```

---

### Task 7: Final verification

**Files:** none created; verification only.

- [ ] **Step 1: Full test run**

Run: `npm test`
Expected: PASS, zero failures.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: success; note bundle size delta from react-router-dom is acceptable (~+45KB pre-gzip).

- [ ] **Step 3: Manual smoke test in dev server**

Run: `npm run dev` (background), then verify in browser:
- `#/` shows two course cards (Software Design and Architecture: 19 quizzes; New Course: 0).
- Clicking the SWDA card shows the familiar By PDF / By topic tabs with all quizzes.
- Starting and finishing a short quiz records an attempt; `Past attempts` inside the course shows it (combined id `combined:software-design-architecture`).
- New Course page shows the "No quizzes found" empty state.
- Browser back/forward moves between home and course pages.
- Direct load of `#/course/software-design-architecture` works (deep link).
- `#/course/bogus` shows "Course not found".

- [ ] **Step 4: Report results to the user** — including the note that pre-existing attempts with the plain `combined` id no longer appear in any history view (per spec, global history was removed).
