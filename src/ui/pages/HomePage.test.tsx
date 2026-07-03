import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "./HomePage";
import type { Course } from "../../domain/course";
import type { LoadError } from "../../data/QuizRepository";

const courses: Course[] = [
  { id: "swda", title: "SW Design", description: "Design course", quizzes: [] },
  { id: "new-course", title: "New Course", description: "Placeholder", quizzes: [] },
];

function renderHome(list: Course[] = courses, errors: LoadError[] = []) {
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
