import { describe, it, expect } from "vitest";
import { quizSchema } from "./schema";

const validQuiz = {
  id: "q",
  title: "Sample",
  source: "x.pdf",
  createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "single_choice", difficulty: "easy", topic: "T1", prompt: "p",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctOptionId: "b", explanation: "e" },
    { id: "2", type: "multi_select", difficulty: "hard", topic: "T2", prompt: "p",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctOptionIds: ["a"], explanation: "e" },
    { id: "3", type: "true_false", difficulty: "medium", topic: "T1", prompt: "p",
      correctValue: true, explanation: "e" },
  ],
};

describe("quizSchema", () => {
  it("accepts a valid quiz of all three types", () => {
    expect(quizSchema.safeParse(validQuiz).success).toBe(true);
  });

  it("rejects single_choice whose correctOptionId is not an option", () => {
    const bad = structuredClone(validQuiz);
    (bad.questions[0] as { correctOptionId: string }).correctOptionId = "zzz";
    expect(quizSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects multi_select with an unknown correctOptionId", () => {
    const bad = structuredClone(validQuiz);
    (bad.questions[1] as { correctOptionIds: string[] }).correctOptionIds = ["zzz"];
    expect(quizSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown question type", () => {
    const bad = structuredClone(validQuiz);
    (bad.questions[2] as { type: string }).type = "essay";
    expect(quizSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an empty questions array", () => {
    const bad = { ...validQuiz, questions: [] };
    expect(quizSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a question with no topic", () => {
    const bad = structuredClone(validQuiz);
    delete (bad.questions[0] as { topic?: string }).topic;
    expect(quizSchema.safeParse(bad).success).toBe(false);
  });
});
