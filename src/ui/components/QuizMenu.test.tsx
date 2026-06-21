import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizMenu } from "./QuizMenu";
import type { QuizRepository, QuizListing } from "../../data/QuizRepository";
import type { Quiz } from "../../domain/schema";

const quiz: Quiz = {
  id: "demo", title: "Demo Quiz", source: "s", createdAt: "2026-06-20",
  questions: [{ id: "1", type: "true_false", difficulty: "easy", topic: "General", prompt: "p", correctValue: true, explanation: "e" }],
};

function repoWith(listing: QuizListing): QuizRepository {
  return {
    list: () => Promise.resolve(listing),
    get: (id) => Promise.resolve(listing.quizzes.find((q) => q.id === id)),
  };
}

describe("QuizMenu", () => {
  it("lists quizzes and fires onSelect", async () => {
    const onSelect = vi.fn();
    render(<QuizMenu repository={repoWith({ quizzes: [quiz], errors: [] })} onSelect={onSelect} />);
    const btn = await screen.findByRole("button", { name: /Demo Quiz/ });
    await userEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith(quiz);
  });

  it("shows an empty state when there are no quizzes", async () => {
    render(<QuizMenu repository={repoWith({ quizzes: [], errors: [] })} onSelect={vi.fn()} />);
    expect(await screen.findByText(/drop a quiz/i)).toBeInTheDocument();
  });

  it("surfaces load errors", async () => {
    render(<QuizMenu repository={repoWith({ quizzes: [], errors: [{ source: "bad.json", message: "boom" }] })} onSelect={vi.fn()} />);
    expect(await screen.findByText(/bad\.json/)).toBeInTheDocument();
  });
});
