import { describe, it, expect, vi, afterEach } from "vitest";
import { HttpAttemptRepository } from "./HttpAttemptRepository";
import type { Attempt } from "../domain/models";

function makeAttempt(quizId: string, pct: number): Attempt {
  return {
    quizId, quizTitle: "T", timestamp: new Date().toISOString(),
    rawScore: pct / 100, total: 1, pct,
    byDifficulty: { easy: { score: 0, total: 0 }, medium: { score: 0, total: 0 }, hard: { score: 0, total: 0 } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("HttpAttemptRepository", () => {
  it("POSTs the attempt as JSON to /api/attempts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await new HttpAttemptRepository().save(makeAttempt("a", 50));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/attempts",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ quizId: "a", pct: 50 });
  });

  it("returns the parsed list for a quiz", async () => {
    const rows = [makeAttempt("a", 70)];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(rows)));
    expect(await new HttpAttemptRepository().listByQuiz("a")).toEqual(rows);
  });

  it("degrades to empty results when the server is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const repo = new HttpAttemptRepository();
    expect(await repo.listByQuiz("a")).toEqual([]);
    expect(await repo.allByQuiz()).toEqual({});
    await expect(repo.save(makeAttempt("a", 1))).resolves.toBeUndefined();
  });
});
