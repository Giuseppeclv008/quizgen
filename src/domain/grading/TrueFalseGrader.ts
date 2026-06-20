import type { Grader } from "./Grader";
import type { Question } from "../schema";
import type { Answer, QuestionResult } from "../models";

export class TrueFalseGrader implements Grader {
  grade(question: Question, answer: Answer | undefined): QuestionResult {
    if (question.type !== "true_false") throw new Error("TrueFalseGrader: wrong question type");
    const value = answer?.type === "true_false" ? answer.value : null;
    const score = value === question.correctValue ? 1 : 0;
    return { questionId: question.id, score, correct: score === 1 };
  }
}
