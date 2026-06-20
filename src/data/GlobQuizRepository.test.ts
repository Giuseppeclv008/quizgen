import { describe, it, expect } from "vitest";
import { GlobQuizRepository, type QuizModuleMap } from "./GlobQuizRepository";

const validQuiz = {
  id: "valid", title: "Valid", source: "s.pdf", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "true_false", difficulty: "easy", prompt: "p",
      correctValue: true, explanation: "e" },
  ],
};

function modules(): QuizModuleMap {
  return {
    "./quizzes/valid.json": () => Promise.resolve({ default: validQuiz }),
    "./quizzes/broken.json": () => Promise.resolve({ default: { id: "x" } }),
  };
}

describe("GlobQuizRepository", () => {
  it("returns valid quizzes and collects errors for invalid ones", async () => {
    const repo = new GlobQuizRepository(modules());
    const { quizzes, errors } = await repo.list();
    expect(quizzes.map((q) => q.id)).toEqual(["valid"]);
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toContain("broken.json");
  });

  it("get() returns a quiz by id, or undefined", async () => {
    const repo = new GlobQuizRepository(modules());
    expect((await repo.get("valid"))?.title).toBe("Valid");
    expect(await repo.get("nope")).toBeUndefined();
  });
});
