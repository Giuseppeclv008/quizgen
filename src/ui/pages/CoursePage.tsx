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
