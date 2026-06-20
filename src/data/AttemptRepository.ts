import type { Attempt } from "../domain/models";

export interface AttemptRepository {
  save(attempt: Attempt): void;
  listByQuiz(quizId: string): Attempt[];
  allByQuiz(): Record<string, Attempt[]>;
}
