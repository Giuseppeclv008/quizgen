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

  it("saves and lists attempts per quiz", async () => {
    const repo = new LocalStorageAttemptRepository(localStorage);
    await repo.save(makeAttempt("a", 50));
    await repo.save(makeAttempt("a", 80));
    await repo.save(makeAttempt("b", 10));
    expect((await repo.listByQuiz("a")).map((x) => x.pct)).toEqual([50, 80]);
    expect(await repo.listByQuiz("b")).toHaveLength(1);
    expect(await repo.listByQuiz("missing")).toEqual([]);
  });

  it("persists under the quizgen:attempts key", async () => {
    const repo = new LocalStorageAttemptRepository(localStorage);
    await repo.save(makeAttempt("a", 50));
    expect(localStorage.getItem("quizgen:attempts")).toContain("\"a\"");
  });

  it("tolerates corrupt stored JSON", async () => {
    localStorage.setItem("quizgen:attempts", "{not json");
    const repo = new LocalStorageAttemptRepository(localStorage);
    expect(await repo.allByQuiz()).toEqual({});
  });
});
