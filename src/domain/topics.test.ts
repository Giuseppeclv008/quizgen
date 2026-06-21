import { describe, it, expect } from "vitest";
import { collectTopics } from "./topics";
import type { Quiz } from "./schema";

function tf(id: string, topic: string): Quiz["questions"][number] {
  return { id, type: "true_false", difficulty: "easy", topic, prompt: "p", correctValue: true, explanation: "e" };
}

function quiz(id: string, questions: Quiz["questions"]): Quiz {
  return { id, title: id, source: "s", createdAt: "2026-06-21", questions };
}

describe("collectTopics", () => {
  it("groups questions by topic across quizzes, sorted by topic", () => {
    const a = quiz("a", [tf("1", "Beta"), tf("2", "Alpha")]);
    const b = quiz("b", [tf("3", "Alpha")]);
    const groups = collectTopics([a, b]);
    expect(groups.map((g) => g.topic)).toEqual(["Alpha", "Beta"]);
    expect(groups[0].questions.map((q) => q.id)).toEqual(["2", "3"]);
    expect(groups[1].questions.map((q) => q.id)).toEqual(["1"]);
  });

  it("returns an empty array for no quizzes", () => {
    expect(collectTopics([])).toEqual([]);
  });
});
