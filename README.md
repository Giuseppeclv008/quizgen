# Quizgen

A small, self-contained quiz application for studying from question banks. Build
quizzes from JSON files, practise them in an exam-style runner, and keep a history
of past attempts persisted in a local SQLite database.

- **Frontend:** React 18 + TypeScript, bundled with Vite.
- **Validation:** Zod schema validates every quiz file at load time.
- **Persistence:** a zero-dependency Node backend (`node:http` + `node:sqlite`)
  stores attempt history; the browser talks to it over a small REST API.

---

## Features

- **Two ways to start a quiz**
  - **By PDF** — mix questions across one or more chosen quiz files.
  - **By topic** — mix questions across one or more topics (the `topic` field on
    each question), regardless of which file they came from.
- **Question types:** single choice, multi-select, and true/false.
- **Even question split** with a configurable max-questions cap (round-robin
  water-fill with leftover redistribution).
- **Results screen** with per-difficulty breakdown and explanations.
- **Past attempts** history, grouped by quiz, stored server-side in SQLite.

---

## Requirements

- **Node.js 22.5+ (24.x recommended).** The backend uses the built-in
  `node:sqlite` module, so no native database dependency is needed.
  > On Node 24 you will see an `ExperimentalWarning: SQLite is an experimental
  > feature` — this is harmless.

---

## Running the app

The app has two processes: the **Vite dev server** (UI) and the **attempts API
server** (persistence). Run each in its own terminal.

```bash
# 1. install dependencies (first time only)
npm install

# 2. start the attempts API server  (terminal 1)
npm run server          # → http://localhost:3001

# 3. start the web app               (terminal 2)
npm run dev             # → http://localhost:5173
```

Open **http://localhost:5173**. The dev server proxies any `/api/*` request to the
API server on port 3001, so you only ever browse to `:5173`.

> The app still works if the API server is not running — reads simply return empty
> history and finished quizzes still show results; attempts just won't be saved.

### Other scripts

| Command          | What it does                                            |
| ---------------- | ------------------------------------------------------- |
| `npm run dev`    | Start the Vite dev server (UI).                         |
| `npm run server` | Start the attempts API server (SQLite persistence).     |
| `npm run build`  | Type-check (`tsc --noEmit`) and produce a `dist/` build.|
| `npm run preview`| Serve the production build locally.                     |
| `npm test`       | Run the test suite once (Vitest).                       |
| `npm run test:watch` | Run tests in watch mode.                            |

### Production note

`npm run build` outputs static assets to `dist/`. In production you must serve
`dist/` behind a web server/CDN. If you want server-side attempt history, also run
`npm run server` (or an equivalent) somewhere reachable and route `/api/*` to it.
The `/api` proxy in `vite.config.ts` only applies to local development.

---

## Deploying to GitHub Pages

The repo ships a workflow (`.github/workflows/deploy.yml`) that builds and
publishes the app to GitHub Pages on every push to `main`.

**One-time setup:** in the GitHub repo go to **Settings → Pages → Build and
deployment → Source** and choose **GitHub Actions**. The next push to `main`
(or a manual run from the Actions tab) deploys the site to:

```
https://giuseppeclv008.github.io/quizgen/
```

Notes:

- The production build uses `base: "/quizgen/"` (set in `vite.config.ts`) so assets
  resolve under the repo path.
- **Persistence on Pages uses the browser's `localStorage`,** because static
  hosting has no backend. `createAttemptRepository()` uses the SQLite API server
  only in local development and falls back to `localStorage` in production builds.
  Attempt history is therefore per-browser on the published site.

---

## Adding questions manually

Quizzes are plain JSON files. **One file = one quiz.**

### Where to put the file

Drop a new `.json` file into:

```
src/quizzes/
```

Every `src/quizzes/*.json` file is picked up automatically at build/dev time
(via `import.meta.glob`) — no registration or imports needed. After adding a
file, reload the page (the dev server hot-reloads).

> Quiz files are bundled into the app at build time. They are **not** stored in the
> database — only attempt history is. To change questions, edit the JSON and reload.

### File format

A quiz file is an object with metadata plus a non-empty `questions` array:

```jsonc
{
  "id": "my-quiz",                      // unique slug across all quiz files
  "title": "My Quiz Title",             // shown in the menu and results
  "source": "where-it-came-from.pdf",   // free text (any string)
  "createdAt": "2026-06-22",            // free text date string
  "questions": [ /* see below */ ]
}
```

Fields `id` and `title` must be non-empty. `questions` must contain at least one
question. Files that fail validation are skipped and surfaced as a load error in
the menu, so the rest of the app keeps working.

### Fields common to every question

| Field         | Type                            | Notes                                  |
| ------------- | ------------------------------- | -------------------------------------- |
| `id`          | string (non-empty)              | Unique within the quiz.                |
| `type`        | `"single_choice"` \| `"multi_select"` \| `"true_false"` | Determines the extra fields. |
| `difficulty`  | `"easy"` \| `"medium"` \| `"hard"` | Used for the per-difficulty breakdown. |
| `topic`       | string (non-empty)              | Groups questions in **By topic** mode. |
| `prompt`      | string (non-empty)              | The question text.                     |
| `explanation` | string (non-empty)              | Shown on the results screen.           |

### Question type: `single_choice`

Exactly one correct option. Needs `options` (≥ 2) and `correctOptionId`, which
**must** match one of the option `id`s.

```json
{
  "id": "q1",
  "type": "single_choice",
  "difficulty": "easy",
  "topic": "Astronomy",
  "prompt": "Which planet is closest to the Sun?",
  "options": [
    { "id": "a", "text": "Venus" },
    { "id": "b", "text": "Mercury" },
    { "id": "c", "text": "Earth" }
  ],
  "correctOptionId": "b",
  "explanation": "Mercury is the innermost planet."
}
```

### Question type: `multi_select`

One or more correct options. Needs `options` (≥ 2) and `correctOptionIds` (≥ 1).
Every id in `correctOptionIds` **must** match an option `id`.

```json
{
  "id": "q2",
  "type": "multi_select",
  "difficulty": "medium",
  "topic": "Chemistry",
  "prompt": "Which of these are noble gases?",
  "options": [
    { "id": "a", "text": "Helium" },
    { "id": "b", "text": "Oxygen" },
    { "id": "c", "text": "Neon" }
  ],
  "correctOptionIds": ["a", "c"],
  "explanation": "Helium and neon are noble gases (group 18)."
}
```

### Question type: `true_false`

Needs a boolean `correctValue`. No `options`.

```json
{
  "id": "q3",
  "type": "true_false",
  "difficulty": "easy",
  "topic": "Physics",
  "prompt": "Water boils at 100°C at standard atmospheric pressure.",
  "correctValue": true,
  "explanation": "At 1 atm, water's boiling point is 100°C."
}
```

### Validate your file

The schema is enforced at runtime, but you can sanity-check the whole folder:

```bash
npm test            # the suite covers schema validation and app behaviour
```

`src/quizzes/example.json` is a complete reference file with all three question
types.

---

## Project structure

```
quizgen/
├─ index.html                 # Vite entry HTML
├─ vite.config.ts             # Vite config + /api dev proxy + Vitest setup
├─ server/
│  └─ index.mjs               # attempts API (node:http + node:sqlite)
│                             # creates server/attempts.db (gitignored)
└─ src/
   ├─ main.tsx                # React entry
   ├─ App.tsx                 # composition root: loads quizzes, wires screens
   ├─ app.css                 # styles
   ├─ quizzes/                # ← add quiz JSON files here
   │  └─ *.json
   ├─ domain/
   │  ├─ schema.ts            # Zod schema + types for quizzes/questions
   │  ├─ models.ts            # Attempt / result types
   │  ├─ topics.ts            # topic & source grouping, even-split assembly
   │  ├─ shuffle.ts           # seedable shuffle
   │  └─ grading/             # per-type graders + scoring
   ├─ session/                # quiz session state machine (reducer + hook)
   ├─ data/
   │  ├─ QuizRepository.ts        # quiz loading interface + errors
   │  ├─ GlobQuizRepository.ts    # loads src/quizzes/*.json via import.meta.glob
   │  ├─ AttemptRepository.ts     # async persistence interface
   │  ├─ HttpAttemptRepository.ts # talks to the API server (default)
   │  ├─ LocalStorageAttemptRepository.ts  # browser-only alternative
   │  ├─ NullAttemptRepository.ts # no-op fallback
   │  └─ createAttemptRepository.ts
   └─ ui/components/          # QuizMenu, selectors, QuizRunner, Results, History…
```

---

## Persistence & the API

Attempt history is stored in SQLite at `server/attempts.db` (auto-created, and
git-ignored). The API:

| Method & path                | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `POST /api/attempts`         | Save one attempt (JSON body).                        |
| `GET  /api/attempts`         | All attempts grouped as `{ [quizId]: Attempt[] }`.   |
| `GET  /api/attempts/:quizId` | All attempts for one quiz, oldest first.             |

`createAttemptRepository()` returns an `HttpAttemptRepository` by default. Because
persistence is behind the `AttemptRepository` interface, you can swap in
`LocalStorageAttemptRepository` (browser-only, no server) or a different backend
without touching the UI.

---

## Testing

```bash
npm test
```

Tests run under Vitest + Testing Library (jsdom). They cover the schema, grading,
the session reducer, quiz assembly, the persistence repositories, and the React
components.
