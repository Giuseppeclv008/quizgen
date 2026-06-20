import type { Grader } from "./Grader";
import type { Question } from "../schema";
import type { Answer, QuestionResult } from "../models";

export class SingleChoiceGrader implements Grader {
  grade(question: Question, answer: Answer | undefined): QuestionResult {
    if (question.type !== "single_choice") throw new Error("SingleChoiceGrader: wrong question type");
    const picked = answer?.type === "single_choice" ? answer.optionId : null;
    const score = picked === question.correctOptionId ? 1 : 0;
    return { questionId: question.id, score, correct: score === 1 };
  }
}
