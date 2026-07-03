# Multi-Course Support — Design

Date: 2026-07-03
Status: Approved

## Goal

Organize quizzes by course. Each course has its own page listing its topics and quizzes. Existing Software Design and Architecture quizzes move into a dedicated course folder. A placeholder second course proves the multi-course UI.

## Decisions

- Navigation: URL routing via `react-router-dom` with `HashRouter` (GitHub Pages safe).
- Course metadata: one `course.json` per course folder (`id`, `title`, `description`).
- Attempt history: per-course, filtered to that course's quizzes. The global history screen is removed.
- Courses now: `software-design-architecture` (all existing quizzes) plus a placeholder `new-course` folder to be renamed later.

## File Structure

```
src/quizzes/
  software-design-architecture/
    course.json
    01-design-intro.json
    02-design-patterns.json
    ... (all 19 existing quiz JSONs, including example.json)
  new-course/
    course.json          (placeholder)
```

`course.json` shape:

```json
{
  "id": "software-design-architecture",
  "title": "Software Design and Architecture",
  "description": "Design principles, patterns, and architecture of software systems."
}
```

## Data Layer

- New `Course` domain type: `{ id, title, description, quizzes: Quiz[] }`.
- New zod `courseSchema` validating `course.json` files.
- `GlobQuizRepository` becomes course-aware:
  - Globs `./quizzes/*/course.json` for course metadata and `./quizzes/*/*.json` (excluding `course.json`) for quizzes.
  - Maps each quiz to its course by folder path.
  - `list()` returns `{ courses: Course[], errors: LoadError[] }`.
  - A quiz JSON in a folder without a valid `course.json` produces a `LoadError`.
  - A course folder with zero quizzes is still listed (renders as "no quizzes yet").

## Routing and UI

Routes (HashRouter):

| Route | Component | Content |
|---|---|---|
| `#/` | `HomePage` | Course cards: title, description, quiz/topic counts. Click navigates to course page. |
| `#/course/:courseId` | `CoursePage` | Existing `QuizMenu` scoped to the course's quizzes (topics tab, PDF tab, max-questions cap unchanged) plus back-to-home link. |
| `#/course/:courseId/history` | `CoursePage` (history view) | `HistoryScreen` filtered to the course's quiz ids. |

- Unknown `courseId` renders a "course not found" message with a home link.
- Quiz running remains state-based inside `CoursePage` (active quiz mounts `QuizRunner`); no route change mid-quiz. A refresh abandons the attempt, matching current behavior.
- `App.tsx` slims to a router shell. Topic/source collection (`collectTopics`, `collectSources`) moves into `CoursePage` and operates on the course's quizzes only.

## History

- `HistoryScreen` gains an optional quiz-id filter and is reached at `#/course/:courseId/history`.
- Attempt storage (`AttemptRepository` implementations) is unchanged; filtering happens at display time by matching attempt quiz ids against the course's quiz ids.

## Error Handling

- Invalid `course.json` → `LoadError` surfaced in the existing errors UI on the home page.
- Quizzes in unknown/invalid course folders → `LoadError`, not silently dropped.
- Unknown route/course id → not-found message with navigation back home.

## Testing

- `GlobQuizRepository`: course grouping, quiz-to-course mapping, empty course, invalid `course.json`, quiz without course folder.
- `courseSchema`: valid and invalid metadata.
- `HomePage`: renders two course cards from fixtures.
- `CoursePage`: shows only its own course's topics; unknown id shows not-found.
- Router smoke test: home → course → history navigation.
- Existing tests updated for moved quiz fixtures.

## Out of Scope

- Deep links to individual quizzes or mid-quiz state in the URL.
- Cross-course combined quizzes.
- Migrating attempt storage format.
