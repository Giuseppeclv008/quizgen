import type { Question } from "../schema";
import type { Answer, QuestionResult } from "../models";

export interface Grader {
  grade(question: Question, answer: Answer | undefined): QuestionResult;
}
