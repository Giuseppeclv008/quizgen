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
