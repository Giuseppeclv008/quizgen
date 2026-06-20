import { describe, it, expect } from "vitest";
import { gradeQuestion } from "./graderRegistry";
import type { Question } from "../schema";
import type { Answer } from "../models";

const single: Question = {
  id: "1", type: "single_choice", difficulty: "easy", prompt: "p",
  options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
  correctOptionId: "b", explanation: "e",
};
const multi: Question = {
  id: "2", type: "multi_select", difficulty: "hard", prompt: "p",
  options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }, { id: "d", text: "D" }],
  correctOptionIds: ["a", "c"], explanation: "e",
};
const tf: Question = {
  id: "3", type: "true_false", difficulty: "medium", prompt: "p",
  correctValue: true, explanation: "e",
};

describe("single_choice grading", () => {
  it("scores 1 when correct", () => {
    const a: Answer = { type: "single_choice", optionId: "b" };
    expect(gradeQuestion(single, a)).toEqual({ questionId: "1", score: 1, correct: true });
  });
  it("scores 0 when wrong or unanswered", () => {
    expect(gradeQuestion(single, { type: "single_choice", optionId: "a" }).score).toBe(0);
    expect(gradeQuestion(single, undefined).score).toBe(0);
  });
});

describe("multi_select partial credit", () => {
  it("scores 1 for exactly the correct set", () => {
    const a: Answer = { type: "multi_select", optionIds: ["a", "c"] };
    expect(gradeQuestion(multi, a)).toEqual({ questionId: "2", score: 1, correct: true });
  });
  it("gives partial credit for one of two correct", () => {
    const a: Answer = { type: "multi_select", optionIds: ["a"] };
    expect(gradeQuestion(multi, a).score).toBeCloseTo(0.5);
    expect(gradeQuestion(multi, a).correct).toBe(false);
  });
  it("subtracts incorrect selections", () => {
    const a: Answer = { type: "multi_select", optionIds: ["a", "b"] }; // +1 correct, -1 wrong
    expect(gradeQuestion(multi, a).score).toBeCloseTo(0);
  });
  it("floors at zero when wrong selections exceed correct", () => {
    const a: Answer = { type: "multi_select", optionIds: ["b", "d"] };
    expect(gradeQuestion(multi, a).score).toBe(0);
  });
});

describe("true_false grading", () => {
  it("scores 1 when matching", () => {
    expect(gradeQuestion(tf, { type: "true_false", value: true }).score).toBe(1);
  });
  it("scores 0 when not matching or unanswered", () => {
    expect(gradeQuestion(tf, { type: "true_false", value: false }).score).toBe(0);
    expect(gradeQuestion(tf, undefined).score).toBe(0);
  });
});
