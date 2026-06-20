import type { Difficulty } from "./schema";

export type Answer =
  | { type: "single_choice"; optionId: string | null }
  | { type: "multi_select"; optionIds: string[] }
  | { type: "true_false"; value: boolean | null };

export interface QuestionResult {
  questionId: string;
  score: number; // 0..1
  correct: boolean; // score === 1
}

export interface DifficultyTally {
  score: number;
  total: number;
}

export interface QuizResult {
  rawScore: number;
  total: number;
  pct: number;
  byDifficulty: Record<Difficulty, DifficultyTally>;
  perQuestion: QuestionResult[];
}

export interface Attempt {
  quizId: string;
  quizTitle: string;
  timestamp: string; // ISO
  rawScore: number;
  total: number;
  pct: number;
  byDifficulty: Record<Difficulty, DifficultyTally>;
}
