# quizgen — project notes for Claude

## Quiz generation workflow

- Quizzes are organized by course: `src/quizzes/<course-folder>/` with a `course.json` (id, title, description) per folder.
- **When the user provides a folder of course material (PDFs, slides, notes) to generate quizzes from, ALWAYS ask which course the material belongs to before generating.** Place the resulting quiz JSON files in that course's folder; if the course does not exist yet, create the folder plus its `course.json` after confirming the course name with the user.
