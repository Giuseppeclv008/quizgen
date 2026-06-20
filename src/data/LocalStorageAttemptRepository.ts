import type { Attempt } from "../domain/models";
import type { AttemptRepository } from "./AttemptRepository";

const KEY = "quizgen:attempts";

export class LocalStorageAttemptRepository implements AttemptRepository {
  constructor(private readonly storage: Storage) {}

  private readAll(): Record<string, Attempt[]> {
    const raw = this.storage.getItem(KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, Attempt[]>;
    } catch {
      return {};
    }
  }

  private writeAll(data: Record<string, Attempt[]>): void {
    this.storage.setItem(KEY, JSON.stringify(data));
  }

  save(attempt: Attempt): void {
    const all = this.readAll();
    (all[attempt.quizId] ??= []).push(attempt);
    this.writeAll(all);
  }

  listByQuiz(quizId: string): Attempt[] {
    return this.readAll()[quizId] ?? [];
  }

  allByQuiz(): Record<string, Attempt[]> {
    return this.readAll();
  }
}
