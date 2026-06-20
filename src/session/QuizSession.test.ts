import { describe, it, expect } from "vitest";
import { initSession, sessionReducer, answeredCount } from "./QuizSession";
import type { Quiz } from "../domain/schema";

const quiz: Quiz = {
  id: "q", title: "t", source: "s", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "single_choice", difficulty: "easy", prompt: "p",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctOptionId: "a", explanation: "e" },
    { id: "2", type: "true_false", difficulty: "easy", prompt: "p",
      correctValue: true, explanation: "e" },
  ],
};

const noShuffle = () => 0;

describe("QuizSession", () => {
  it("initializes at index 0 with no answers", () => {
    const s = initSession(quiz, noShuffle);
    expect(s.currentIndex).toBe(0);
    expect(s.answers).toEqual({});
    expect(s.submitted).toBe(false);
  });

  it("records and overwrites answers", () => {
    let s = initSession(quiz, noShuffle);
    s = sessionReducer(s, { kind: "answer", questionId: "1", answer: { type: "single_choice", optionId: "b" } });
    s = sessionReducer(s, { kind: "answer", questionId: "1", answer: { type: "single_choice", optionId: "a" } });
    expect(s.answers["1"]).toEqual({ type: "single_choice", optionId: "a" });
    expect(answeredCount(s)).toBe(1);
  });

  it("navigates and clamps within bounds", () => {
    let s = initSession(quiz, noShuffle);
    s = sessionReducer(s, { kind: "next" });
    expect(s.currentIndex).toBe(1);
    s = sessionReducer(s, { kind: "next" });
    expect(s.currentIndex).toBe(1); // clamped at last
    s = sessionReducer(s, { kind: "prev" });
    s = sessionReducer(s, { kind: "prev" });
    expect(s.currentIndex).toBe(0); // clamped at first
    s = sessionReducer(s, { kind: "goto", index: 1 });
    expect(s.currentIndex).toBe(1);
  });

  it("submit grades and sets result", () => {
    let s = initSession(quiz, noShuffle);
    s = sessionReducer(s, { kind: "answer", questionId: "1", answer: { type: "single_choice", optionId: "a" } });
    s = sessionReducer(s, { kind: "answer", questionId: "2", answer: { type: "true_false", value: true } });
    s = sessionReducer(s, { kind: "submit" });
    expect(s.submitted).toBe(true);
    expect(s.result?.rawScore).toBe(2);
    expect(s.result?.pct).toBe(100);
  });

  it("reducer is frozen after submit — further actions return the same state reference", () => {
    let s = initSession(quiz, noShuffle);
    s = sessionReducer(s, { kind: "submit" });
    expect(s.submitted).toBe(true);
    expect(sessionReducer(s, { kind: "next" })).toBe(s);
    expect(sessionReducer(s, { kind: "answer", questionId: "1", answer: { type: "single_choice", optionId: "b" } })).toBe(s);
  });
});
