import type { Quiz } from "../domain/schema";
import type { Answer, QuizResult } from "../domain/models";
import { shuffleQuizOptions, type Rng } from "../domain/shuffle";
import { gradeQuiz } from "../domain/grading/score";

export interface QuizSessionState {
  quiz: Quiz;
  currentIndex: number;
  answers: Record<string, Answer>;
  submitted: boolean;
  result?: QuizResult;
}

export type SessionAction =
  | { kind: "answer"; questionId: string; answer: Answer }
  | { kind: "goto"; index: number }
  | { kind: "next" }
  | { kind: "prev" }
  | { kind: "submit" };

export function initSession(quiz: Quiz, rng: Rng = Math.random): QuizSessionState {
  return {
    quiz: shuffleQuizOptions(quiz, rng),
    currentIndex: 0,
    answers: {},
    submitted: false,
  };
}

function clamp(index: number, length: number): number {
  return Math.max(0, Math.min(index, length - 1));
}

export function sessionReducer(state: QuizSessionState, action: SessionAction): QuizSessionState {
  if (state.submitted) return state;
  const last = state.quiz.questions.length;
  switch (action.kind) {
    case "answer":
      return { ...state, answers: { ...state.answers, [action.questionId]: action.answer } };
    case "goto":
      return { ...state, currentIndex: clamp(action.index, last) };
    case "next":
      return { ...state, currentIndex: clamp(state.currentIndex + 1, last) };
    case "prev":
      return { ...state, currentIndex: clamp(state.currentIndex - 1, last) };
    case "submit":
      return { ...state, submitted: true, result: gradeQuiz(state.quiz, state.answers) };
  }
}

export function answeredCount(state: QuizSessionState): number {
  return Object.keys(state.answers).length;
}
