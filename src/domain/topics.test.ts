import { describe, it, expect } from "vitest";
import { collectTopics, assembleQuiz } from "./topics";
import type { Quiz } from "./schema";
import type { TopicGroup } from "./topics";

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

// Deterministic Rng: returns 0 so shuffle keeps relative order (Fisher–Yates
// with j=floor(0*(i+1))=0 swaps each element with index 0, but order of the
// *set* of taken questions is what we assert, not their sequence).
const rng0 = () => 0;

function group(topic: string, n: number): TopicGroup {
  return {
    topic,
    questions: Array.from({ length: n }, (_, i) => ({
      id: `${topic}-${i}`, type: "true_false", difficulty: "easy",
      topic, prompt: "p", correctValue: true, explanation: "e",
    })),
  };
}

describe("assembleQuiz", () => {
  it("splits the cap evenly across selected topics", () => {
    const groups = [group("A", 10), group("B", 10), group("C", 10)];
    const quiz = assembleQuiz(groups, ["A", "B", "C"], 6, rng0);
    const counts = countByTopic(quiz);
    expect(counts).toEqual({ A: 2, B: 2, C: 2 });
    expect(quiz.questions).toHaveLength(6);
  });

  it("redistributes leftover slots from topics that run out", () => {
    const groups = [group("A", 1), group("B", 10), group("C", 10)];
    const quiz = assembleQuiz(groups, ["A", "B", "C"], 9, rng0);
    const counts = countByTopic(quiz);
    expect(counts.A).toBe(1);
    expect(counts.B + counts.C).toBe(8);
    expect(counts.B).toBe(4);
    expect(counts.C).toBe(4);
    expect(quiz.questions).toHaveLength(9);
  });

  it("ignores unselected topics", () => {
    const groups = [group("A", 5), group("B", 5)];
    const quiz = assembleQuiz(groups, ["A"], 3, rng0);
    expect(countByTopic(quiz)).toEqual({ A: 3 });
  });

  it("caps at the total available when cap exceeds the pool", () => {
    const groups = [group("A", 2), group("B", 2)];
    const quiz = assembleQuiz(groups, ["A", "B"], 100, rng0);
    expect(quiz.questions).toHaveLength(4);
  });

  it("sets synthetic combined metadata", () => {
    const quiz = assembleQuiz([group("A", 2)], ["A"], 1, rng0);
    expect(quiz.id).toBe("combined");
    expect(quiz.source).toBe("combined");
    expect(quiz.title).toBe("A");
    expect(quiz.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

function countByTopic(quiz: { questions: { topic: string }[] }): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of quiz.questions) out[q.topic] = (out[q.topic] ?? 0) + 1;
  return out;
}
