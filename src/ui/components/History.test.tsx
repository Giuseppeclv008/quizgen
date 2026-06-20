import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { History } from "./History";
import type { Attempt } from "../../domain/models";

const attempts: Attempt[] = [
  { quizId: "a", quizTitle: "T", timestamp: "2026-06-20T10:00:00.000Z",
    rawScore: 1, total: 2, pct: 50,
    byDifficulty: { easy: { score: 0, total: 0 }, medium: { score: 0, total: 0 }, hard: { score: 0, total: 0 } } },
];

describe("History", () => {
  it("lists past attempts with their percentage", () => {
    render(<History attempts={attempts} />);
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it("shows an empty state when there are no attempts", () => {
    render(<History attempts={[]} />);
    expect(screen.getByText(/no past attempts/i)).toBeInTheDocument();
  });
});
