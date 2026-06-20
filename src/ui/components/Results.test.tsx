import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Results } from "./Results";
import type { Quiz } from "../../domain/schema";
import type { Answer, QuizResult } from "../../domain/models";

const quiz: Quiz = {
  id: "q", title: "t", source: "s", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "single_choice", difficulty: "easy", prompt: "Pick B",
      options: [{ id: "a", text: "Apple" }, { id: "b", text: "Banana" }],
      correctOptionId: "b", explanation: "Bananas are best." },
  ],
};
const answers: Record<string, Answer> = { "1": { type: "single_choice", optionId: "a" } };
const result: QuizResult = {
  rawScore: 0, total: 1, pct: 0,
  byDifficulty: { easy: { score: 0, total: 1 }, medium: { score: 0, total: 0 }, hard: { score: 0, total: 0 } },
  perQuestion: [{ questionId: "1", score: 0, correct: false }],
};

describe("Results", () => {
  it("shows the percentage, the explanation, and the correct answer", () => {
    render(<Results quiz={quiz} answers={answers} result={result} onBackToMenu={vi.fn()} />);
    expect(screen.getByText(/0%/)).toBeInTheDocument();
    expect(screen.getByText(/Bananas are best\./)).toBeInTheDocument();
    expect(screen.getAllByText(/Banana/).length).toBeGreaterThan(0);
  });
});
