import { quizSchema, type Quiz } from "../domain/schema";
import type { QuizRepository, QuizListing, LoadError } from "./QuizRepository";

export type QuizModuleMap = Record<string, () => Promise<unknown>>;

export class GlobQuizRepository implements QuizRepository {
  constructor(private readonly modules: QuizModuleMap) {}

  async list(): Promise<QuizListing> {
    const quizzes: Quiz[] = [];
    const errors: LoadError[] = [];
    for (const [source, loader] of Object.entries(this.modules)) {
      try {
        const mod = (await loader()) as { default?: unknown };
        const data = mod && "default" in mod ? mod.default : mod;
        const parsed = quizSchema.safeParse(data);
        if (parsed.success) {
          quizzes.push(parsed.data);
        } else {
          errors.push({ source, message: parsed.error.issues.map((i) => i.message).join("; ") });
        }
      } catch (e) {
        errors.push({ source, message: e instanceof Error ? e.message : String(e) });
      }
    }
    quizzes.sort((a, b) => a.title.localeCompare(b.title));
    return { quizzes, errors };
  }

  async get(id: string): Promise<Quiz | undefined> {
    const { quizzes } = await this.list();
    return quizzes.find((q) => q.id === id);
  }
}
