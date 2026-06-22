import type { Attempt } from "../domain/models";
import type { AttemptRepository } from "./AttemptRepository";

export class NullAttemptRepository implements AttemptRepository {
  async save(_attempt: Attempt): Promise<void> {}
  async listByQuiz(_quizId: string): Promise<Attempt[]> {
    return [];
  }
  async allByQuiz(): Promise<Record<string, Attempt[]>> {
    return {};
  }
}
