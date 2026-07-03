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
