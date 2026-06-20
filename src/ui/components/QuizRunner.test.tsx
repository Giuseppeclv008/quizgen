import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizRunner } from "./QuizRunner";
import { NullAttemptRepository } from "../../data/NullAttemptRepository";
import type { Quiz } from "../../domain/schema";

const quiz: Quiz = {
  id: "q", title: "Demo", source: "s", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "true_false", difficulty: "easy", prompt: "Sky is blue?",
      correctValue: true, explanation: "Yes." },
  ],
};

describe("QuizRunner", () => {
  it("runs the quiz, submits, saves an attempt, and shows results", async () => {
    const repo = new NullAttemptRepository();
    const saveSpy = vi.spyOn(repo, "save");
    render(<QuizRunner quiz={quiz} attemptRepo={repo} onExit={vi.fn()} />);

    await userEvent.click(screen.getByLabelText("True"));
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByText(/Results — Demo/)).toBeInTheDocument();
    expect(screen.getByText(/100%/)).toBeInTheDocument();
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy.mock.calls[0][0]).toMatchObject({ quizId: "q", pct: 100 });
  });
});
