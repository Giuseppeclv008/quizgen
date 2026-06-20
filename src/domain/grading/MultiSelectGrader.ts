import type { Grader } from "./Grader";
import type { Question } from "../schema";
import type { Answer, QuestionResult } from "../models";

export class MultiSelectGrader implements Grader {
  grade(question: Question, answer: Answer | undefined): QuestionResult {
    if (question.type !== "multi_select") throw new Error("MultiSelectGrader: wrong question type");
    const selected = answer?.type === "multi_select" ? new Set(answer.optionIds) : new Set<string>();
    const correctSet = new Set(question.correctOptionIds);
    let correctSelected = 0;
    let incorrectSelected = 0;
    for (const id of selected) {
      if (correctSet.has(id)) correctSelected++;
      else incorrectSelected++;
    }
    const total = question.correctOptionIds.length;
    const score = Math.max(0, (correctSelected - incorrectSelected) / total);
    return { questionId: question.id, score, correct: score === 1 };
  }
}
