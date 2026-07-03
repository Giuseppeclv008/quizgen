import { z } from "zod";
import type { Quiz } from "./schema";

export const courseMetaSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
});

export type CourseMeta = z.infer<typeof courseMetaSchema>;

export interface Course extends CourseMeta {
  quizzes: Quiz[];
}
