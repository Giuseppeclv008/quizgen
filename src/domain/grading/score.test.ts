import { describe, it, expect } from "vitest";
import { gradeQuiz } from "./score";
import type { Quiz } from "../schema";
import type { Answer } from "../models";

const quiz: Quiz = {
  id: "q", title: "t", source: "s", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "single_choice", difficulty: "easy", prompt: "p",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctOptionId: "a", explanation: "e" },
    { id: "2", type: "multi_select", difficulty: "hard", prompt: "p",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctOptionIds: ["a", "b"], explanation: "e" },
    { id: "3", type: "true_false", difficulty: "hard", prompt: "p",
      correctValue: true, explanation: "e" },
  ],
};

describe("gradeQuiz", () => {
  it("aggregates raw score, pct, and per-difficulty tallies", () => {
    const answers: Record<string, Answer> = {
      "1": { type: "single_choice", optionId: "a" }, // 1
      "2": { type: "multi_select", optionIds: ["a"] }, // 0.5
      "3": { type: "true_false", value: false }, // 0
    };
    const result = gradeQuiz(quiz, answers);
    expect(result.rawScore).toBeCloseTo(1.5);
    expect(result.total).toBe(3);
    expect(result.pct).toBeCloseTo(50);
    expect(result.byDifficulty.easy).toEqual({ score: 1, total: 1 });
    expect(result.byDifficulty.hard.score).toBeCloseTo(0.5);
    expect(result.byDifficulty.hard.total).toBe(2);
    expect(result.perQuestion).toHaveLength(3);
  });

  it("treats missing answers as zero", () => {
    const result = gradeQuiz(quiz, {});
    expect(result.rawScore).toBe(0);
    expect(result.pct).toBe(0);
  });
});
