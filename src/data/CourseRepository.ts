import { quizSchema } from "../domain/schema";
import { courseMetaSchema, type Course } from "../domain/course";
import type { LoadError } from "./QuizRepository";

export type QuizModuleMap = Record<string, () => Promise<unknown>>;

export interface CourseListing {
  courses: Course[];
  errors: LoadError[];
}

function folderOf(path: string): string {
  return path.slice(0, path.lastIndexOf("/"));
}

async function loadJson(loader: () => Promise<unknown>): Promise<unknown> {
  const mod = (await loader()) as { default?: unknown };
  return mod && typeof mod === "object" && "default" in mod ? mod.default : mod;
}

export class GlobCourseRepository {
  constructor(
    private readonly courseModules: QuizModuleMap,
    private readonly quizModules: QuizModuleMap,
  ) {}

  async list(): Promise<CourseListing> {
    const errors: LoadError[] = [];
    const byFolder = new Map<string, Course>();

    for (const [source, loader] of Object.entries(this.courseModules)) {
      try {
        const parsed = courseMetaSchema.safeParse(await loadJson(loader));
        if (parsed.success) {
          byFolder.set(folderOf(source), { ...parsed.data, quizzes: [] });
        } else {
          errors.push({ source, message: parsed.error.issues.map((i) => i.message).join("; ") });
        }
      } catch (e) {
        errors.push({ source, message: e instanceof Error ? e.message : String(e) });
      }
    }

    for (const [source, loader] of Object.entries(this.quizModules)) {
      if (source.endsWith("/course.json")) continue;
      const course = byFolder.get(folderOf(source));
      if (!course) {
        errors.push({ source, message: "no valid course.json in this folder" });
        continue;
      }
      try {
        const parsed = quizSchema.safeParse(await loadJson(loader));
        if (parsed.success) {
          course.quizzes.push(parsed.data);
        } else {
          errors.push({ source, message: parsed.error.issues.map((i) => i.message).join("; ") });
        }
      } catch (e) {
        errors.push({ source, message: e instanceof Error ? e.message : String(e) });
      }
    }

    const courses = [...byFolder.values()].sort((a, b) => a.title.localeCompare(b.title));
    for (const c of courses) c.quizzes.sort((a, b) => a.title.localeCompare(b.title));
    return { courses, errors };
  }
}
