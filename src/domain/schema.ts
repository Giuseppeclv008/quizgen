import { z } from "zod";

export const difficultySchema = z.enum(["easy", "medium", "hard"]);

export const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const baseFields = {
  id: z.string().min(1),
  difficulty: difficultySchema,
  prompt: z.string().min(1),
  explanation: z.string().min(1),
};

export const singleChoiceObject = z.object({
  ...baseFields,
  type: z.literal("single_choice"),
  options: z.array(optionSchema).min(2),
  correctOptionId: z.string().min(1),
});

export const multiSelectObject = z.object({
  ...baseFields,
  type: z.literal("multi_select"),
  options: z.array(optionSchema).min(2),
  correctOptionIds: z.array(z.string().min(1)).min(1),
});

export const trueFalseObject = z.object({
  ...baseFields,
  type: z.literal("true_false"),
  correctValue: z.boolean(),
});

export const questionSchema = z
  .discriminatedUnion("type", [singleChoiceObject, multiSelectObject, trueFalseObject])
  .superRefine((q, ctx) => {
    if (q.type === "single_choice" && !q.options.some((o) => o.id === q.correctOptionId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "correctOptionId must match an option id" });
    }
    if (q.type === "multi_select") {
      const ids = new Set(q.options.map((o) => o.id));
      if (!q.correctOptionIds.every((id) => ids.has(id))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "every correctOptionId must match an option id" });
      }
    }
  });

export const quizSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source: z.string(),
  createdAt: z.string(),
  questions: z.array(questionSchema).min(1),
});

export type Difficulty = z.infer<typeof difficultySchema>;
export type Option = z.infer<typeof optionSchema>;
export type SingleChoiceQuestion = z.infer<typeof singleChoiceObject>;
export type MultiSelectQuestion = z.infer<typeof multiSelectObject>;
export type TrueFalseQuestion = z.infer<typeof trueFalseObject>;
export type Question = z.infer<typeof questionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type QuestionType = Question["type"];
