import { describe, it, expect } from "vitest";
import { shuffle, shuffleQuizOptions } from "./shuffle";
import type { Quiz } from "./schema";

describe("shuffle", () => {
  it("preserves every element exactly once", () => {
    const input = ["a", "b", "c", "d"];
    const out = shuffle(input, () => 0.42);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it("does not mutate the input array", () => {
    const input = ["a", "b", "c"];
    shuffle(input, () => 0);
    expect(input).toEqual(["a", "b", "c"]);
  });
});

describe("shuffleQuizOptions", () => {
  const quiz: Quiz = {
    id: "q", title: "t", source: "s", createdAt: "2026-06-20",
    questions: [
      { id: "1", type: "single_choice", difficulty: "easy", topic: "General", prompt: "p",
        options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
        correctOptionId: "a", explanation: "e" },
      { id: "2", type: "true_false", difficulty: "easy", topic: "General", prompt: "p",
        correctValue: true, explanation: "e" },
    ],
  };

  it("keeps the same option ids (only order may change)", () => {
    const out = shuffleQuizOptions(quiz, () => 0.9);
    const q1 = out.questions[0];
    if (q1.type !== "single_choice") throw new Error("type changed");
    expect(q1.options.map((o) => o.id).sort()).toEqual(["a", "b"]);
  });

  it("leaves true_false questions untouched", () => {
    const out = shuffleQuizOptions(quiz, () => 0);
    expect(out.questions[1]).toEqual(quiz.questions[1]);
  });
});
