import type { Quiz, Difficulty } from "../schema";
import type { Answer, QuizResult, QuestionResult, DifficultyTally } from "../models";
import { gradeQuestion } from "./graderRegistry";

function emptyTallies(): Record<Difficulty, DifficultyTally> {
  return {
    easy: { score: 0, total: 0 },
    medium: { score: 0, total: 0 },
    hard: { score: 0, total: 0 },
  };
}

export function aggregate(quiz: Quiz, perQuestion: QuestionResult[]): QuizResult {
  const byId = new Map(perQuestion.map((r) => [r.questionId, r]));
  const byDifficulty = emptyTallies();
  let rawScore = 0;
  for (const q of quiz.questions) {
    const score = byId.get(q.id)?.score ?? 0;
    rawScore += score;
    byDifficulty[q.difficulty].score += score;
    byDifficulty[q.difficulty].total += 1;
  }
  const total = quiz.questions.length;
  const pct = total > 0 ? (rawScore / total) * 100 : 0;
  return { rawScore, total, pct, byDifficulty, perQuestion };
}

export function gradeQuiz(quiz: Quiz, answers: Record<string, Answer | undefined>): QuizResult {
  const perQuestion = quiz.questions.map((q) => gradeQuestion(q, answers[q.id]));
  return aggregate(quiz, perQuestion);
}
