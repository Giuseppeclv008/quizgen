import type { Grader } from "./Grader";
import type { Question, QuestionType } from "../schema";
import type { Answer, QuestionResult } from "../models";
import { SingleChoiceGrader } from "./SingleChoiceGrader";
import { MultiSelectGrader } from "./MultiSelectGrader";
import { TrueFalseGrader } from "./TrueFalseGrader";

export const graderRegistry: Record<QuestionType, Grader> = {
  single_choice: new SingleChoiceGrader(),
  multi_select: new MultiSelectGrader(),
  true_false: new TrueFalseGrader(),
};

export function gradeQuestion(question: Question, answer: Answer | undefined): QuestionResult {
  return graderRegistry[question.type].grade(question, answer);
}
