import { describe, it, expect } from "vitest";
import { courseMetaSchema } from "./course";

describe("courseMetaSchema", () => {
  it("accepts valid course metadata", () => {
    const parsed = courseMetaSchema.safeParse({
      id: "software-design-architecture",
      title: "Software Design and Architecture",
      description: "Design principles, patterns, and architecture.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing or empty required fields", () => {
    expect(courseMetaSchema.safeParse({ id: "", title: "T", description: "" }).success).toBe(false);
    expect(courseMetaSchema.safeParse({ title: "T", description: "" }).success).toBe(false);
    expect(courseMetaSchema.safeParse({ id: "x", description: "" }).success).toBe(false);
  });

  it("allows an empty description", () => {
    expect(courseMetaSchema.safeParse({ id: "x", title: "T", description: "" }).success).toBe(true);
  });
});
