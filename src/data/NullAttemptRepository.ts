import type { Attempt } from "../domain/models";
import type { AttemptRepository } from "./AttemptRepository";

export class NullAttemptRepository implements AttemptRepository {
  save(_attempt: Attempt): void {}
  listByQuiz(_quizId: string): Attempt[] {
    return [];
  }
  allByQuiz(): Record<string, Attempt[]> {
    return {};
  }
}
