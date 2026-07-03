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
