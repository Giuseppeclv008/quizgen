import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQuizSession } from "./useQuizSession";
import type { Quiz } from "../domain/schema";

const quiz: Quiz = {
  id: "q", title: "t", source: "s", createdAt: "2026-06-20",
  questions: [
    { id: "1", type: "true_false", difficulty: "easy", prompt: "p", correctValue: true, explanation: "e" },
  ],
};

describe("useQuizSession", () => {
  it("exposes state and dispatch, and updates on answer", () => {
    const { result } = renderHook(() => useQuizSession(quiz));
    expect(result.current.state.currentIndex).toBe(0);
    act(() => {
      result.current.dispatch({ kind: "answer", questionId: "1", answer: { type: "true_false", value: true } });
    });
    expect(result.current.state.answers["1"]).toEqual({ type: "true_false", value: true });
  });
});
