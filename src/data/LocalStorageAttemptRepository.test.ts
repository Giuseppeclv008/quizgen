import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorageAttemptRepository } from "./LocalStorageAttemptRepository";
import type { Attempt } from "../domain/models";

function makeAttempt(quizId: string, pct: number): Attempt {
  return {
    quizId, quizTitle: "T", timestamp: new Date().toISOString(),
    rawScore: pct / 100, total: 1, pct,
    byDifficulty: { easy: { score: 0, total: 0 }, medium: { score: 0, total: 0 }, hard: { score: 0, total: 0 } },
  };
}

describe("LocalStorageAttemptRepository", () => {
  beforeEach(() => localStorage.clear());

  it("saves and lists attempts per quiz", () => {
    const repo = new LocalStorageAttemptRepository(localStorage);
    repo.save(makeAttempt("a", 50));
    repo.save(makeAttempt("a", 80));
    repo.save(makeAttempt("b", 10));
    expect(repo.listByQuiz("a").map((x) => x.pct)).toEqual([50, 80]);
    expect(repo.listByQuiz("b")).toHaveLength(1);
    expect(repo.listByQuiz("missing")).toEqual([]);
  });

  it("persists under the quizgen:attempts key", () => {
    const repo = new LocalStorageAttemptRepository(localStorage);
    repo.save(makeAttempt("a", 50));
    expect(localStorage.getItem("quizgen:attempts")).toContain("\"a\"");
  });

  it("tolerates corrupt stored JSON", () => {
    localStorage.setItem("quizgen:attempts", "{not json");
    const repo = new LocalStorageAttemptRepository(localStorage);
    expect(repo.allByQuiz()).toEqual({});
  });
});
