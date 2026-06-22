import type { Attempt } from "../domain/models";
import type { AttemptRepository } from "./AttemptRepository";

/**
 * Talks to the quiz attempts backend (see server/index.mjs).
 * Reads degrade gracefully to empty results when the server is unreachable,
 * so the UI never crashes if persistence is offline.
 */
export class HttpAttemptRepository implements AttemptRepository {
  constructor(private readonly baseUrl: string = "/api") {}

  async save(attempt: Attempt): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/attempts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(attempt),
      });
    } catch {
      // best-effort: swallow network errors so a finished quiz still shows results
    }
  }

  async listByQuiz(quizId: string): Promise<Attempt[]> {
    try {
      const res = await fetch(`${this.baseUrl}/attempts/${encodeURIComponent(quizId)}`);
      if (!res.ok) return [];
      return (await res.json()) as Attempt[];
    } catch {
      return [];
    }
  }

  async allByQuiz(): Promise<Record<string, Attempt[]>> {
    try {
      const res = await fetch(`${this.baseUrl}/attempts`);
      if (!res.ok) return {};
      return (await res.json()) as Record<string, Attempt[]>;
    } catch {
      return {};
    }
  }
}
