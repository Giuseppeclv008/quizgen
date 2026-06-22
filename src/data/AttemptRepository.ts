import type { Attempt } from "../domain/models";

export interface AttemptRepository {
  save(attempt: Attempt): Promise<void>;
  listByQuiz(quizId: string): Promise<Attempt[]>;
  allByQuiz(): Promise<Record<string, Attempt[]>>;
}
