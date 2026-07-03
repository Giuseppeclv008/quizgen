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
