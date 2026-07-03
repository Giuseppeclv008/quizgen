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
