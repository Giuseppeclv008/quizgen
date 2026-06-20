import type { Quiz } from "../domain/schema";

export interface LoadError {
  source: string;
  message: string;
}

export interface QuizListing {
  quizzes: Quiz[];
  errors: LoadError[];
}

export interface QuizRepository {
  list(): Promise<QuizListing>;
  get(id: string): Promise<Quiz | undefined>;
}
