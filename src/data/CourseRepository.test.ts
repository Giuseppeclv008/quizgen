import { describe, it, expect } from "vitest";
import { GlobCourseRepository, type QuizModuleMap } from "./CourseRepository";

const validQuiz = {
  id: "valid", title: "Valid", source: "s.pdf", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "true_false", difficulty: "easy", topic: "General", prompt: "p",
      correctValue: true, explanation: "e" },
  ],
};

const courseMeta = { id: "swda", title: "SW Design", description: "desc" };

function courseModules(): QuizModuleMap {
  return {
    "./quizzes/swda/course.json": () => Promise.resolve({ default: courseMeta }),
    "./quizzes/empty/course.json": () =>
      Promise.resolve({ default: { id: "empty", title: "Empty Course", description: "" } }),
    "./quizzes/badmeta/course.json": () => Promise.resolve({ default: { id: "" } }),
  };
}

function quizModules(): QuizModuleMap {
  return {
    "./quizzes/swda/course.json": () => Promise.resolve({ default: courseMeta }),
    "./quizzes/swda/valid.json": () => Promise.resolve({ default: validQuiz }),
    "./quizzes/swda/broken.json": () => Promise.resolve({ default: { id: "x" } }),
    "./quizzes/orphan/lost.json": () => Promise.resolve({ default: validQuiz }),
  };
}

describe("GlobCourseRepository", () => {
  it("groups quizzes into their course by folder", async () => {
    const repo = new GlobCourseRepository(courseModules(), quizModules());
    const { courses } = await repo.list();
    const swda = courses.find((c) => c.id === "swda");
    expect(swda?.quizzes.map((q) => q.id)).toEqual(["valid"]);
  });

  it("lists a course with zero quizzes", async () => {
    const repo = new GlobCourseRepository(courseModules(), quizModules());
    const { courses } = await repo.list();
    expect(courses.find((c) => c.id === "empty")?.quizzes).toEqual([]);
  });

  it("collects errors for invalid course.json, invalid quizzes, and orphan quizzes", async () => {
    const repo = new GlobCourseRepository(courseModules(), quizModules());
    const { courses, errors } = await repo.list();
    expect(courses.map((c) => c.id).sort()).toEqual(["empty", "swda"]);
    const sources = errors.map((e) => e.source);
    expect(sources).toContainEqual(expect.stringContaining("badmeta/course.json"));
    expect(sources).toContainEqual(expect.stringContaining("swda/broken.json"));
    expect(sources).toContainEqual(expect.stringContaining("orphan/lost.json"));
    expect(errors).toHaveLength(3);
  });

  it("does not treat course.json entries in the quiz glob as quizzes", async () => {
    const repo = new GlobCourseRepository(courseModules(), quizModules());
    const { courses, errors } = await repo.list();
    const swda = courses.find((c) => c.id === "swda");
    expect(swda?.quizzes).toHaveLength(1);
    expect(errors.map((e) => e.source)).not.toContainEqual(
      expect.stringContaining("swda/course.json"),
    );
  });

  it("collects errors when a loader throws", async () => {
    const repo = new GlobCourseRepository(courseModules(), {
      "./quizzes/swda/throws.json": () => Promise.reject(new Error("network error")),
    });
    const { errors } = await repo.list();
    expect(errors.map((e) => e.message)).toContainEqual(expect.stringContaining("network error"));
  });

  it("sorts courses and quizzes by title", async () => {
    const repo = new GlobCourseRepository(
      {
        "./quizzes/b/course.json": () =>
          Promise.resolve({ default: { id: "b", title: "Zeta", description: "" } }),
        "./quizzes/a/course.json": () =>
          Promise.resolve({ default: { id: "a", title: "Alpha", description: "" } }),
      },
      {
        "./quizzes/a/z.json": () =>
          Promise.resolve({ default: { ...validQuiz, id: "z", title: "Zed" } }),
        "./quizzes/a/a.json": () =>
          Promise.resolve({ default: { ...validQuiz, id: "a", title: "Abc" } }),
      },
    );
    const { courses } = await repo.list();
    expect(courses.map((c) => c.title)).toEqual(["Alpha", "Zeta"]);
    expect(courses[0].quizzes.map((q) => q.title)).toEqual(["Abc", "Zed"]);
  });
});
