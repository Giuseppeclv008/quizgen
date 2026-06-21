import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryScreen } from "./HistoryScreen";
import type { Attempt } from "../../domain/models";

const zeroDiff = { easy: { score: 0, total: 0 }, medium: { score: 0, total: 0 }, hard: { score: 0, total: 0 } };

function attempt(quizId: string, quizTitle: string, timestamp: string, pct: number): Attempt {
  return { quizId, quizTitle, timestamp, rawScore: 0, total: 1, pct, byDifficulty: zeroDiff };
}

describe("HistoryScreen", () => {
  it("shows an empty state when there are no attempts", () => {
    render(<HistoryScreen groups={{}} onBack={vi.fn()} />);
    expect(screen.getByText(/no past attempts/i)).toBeInTheDocument();
  });

  it("shows the empty state when groups contain only empty arrays", () => {
    render(<HistoryScreen groups={{ quiz1: [] }} onBack={vi.fn()} />);
    expect(screen.getByText(/no past attempts/i)).toBeInTheDocument();
  });

  it("labels the combined group 'Combined quizzes'", () => {
    const groups = { combined: [attempt("combined", "Astronomy, Physics", "2026-06-21T10:00:00.000Z", 80)] };
    render(<HistoryScreen groups={groups} onBack={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Combined quizzes" })).toBeInTheDocument();
    // the per-attempt title is still shown via the title column
    expect(screen.getByText("Astronomy, Physics")).toBeInTheDocument();
  });

  it("uses the most recent attempt's title as a non-combined group heading", () => {
    const groups = {
      "demo-mixed": [
        attempt("demo-mixed", "Demo Quiz", "2026-06-20T10:00:00.000Z", 50),
        attempt("demo-mixed", "Demo Quiz", "2026-06-21T10:00:00.000Z", 70),
      ],
    };
    render(<HistoryScreen groups={groups} onBack={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Demo Quiz" })).toBeInTheDocument();
  });

  it("orders rows within a group newest first", () => {
    const groups = {
      "demo-mixed": [
        attempt("demo-mixed", "Demo Quiz", "2026-06-20T10:00:00.000Z", 50),
        attempt("demo-mixed", "Demo Quiz", "2026-06-21T10:00:00.000Z", 70),
      ],
    };
    render(<HistoryScreen groups={groups} onBack={vi.fn()} />);
    const rows = screen.getAllByRole("row").filter((r) => within(r).queryByText(/%$/));
    // first data row is the newest (70%)
    expect(within(rows[0]).getByText("70%")).toBeInTheDocument();
    expect(within(rows[1]).getByText("50%")).toBeInTheDocument();
  });

  it("fires onBack when Back is clicked", async () => {
    const onBack = vi.fn();
    render(<HistoryScreen groups={{}} onBack={onBack} />);
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("orders groups by their most recent attempt, newest first", () => {
    const groups = {
      "quiz-old": [attempt("quiz-old", "Old Quiz", "2026-06-19T10:00:00.000Z", 40)],
      "quiz-new": [attempt("quiz-new", "New Quiz", "2026-06-21T10:00:00.000Z", 90)],
    };
    render(<HistoryScreen groups={groups} onBack={vi.fn()} />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["New Quiz", "Old Quiz"]);
  });

  it("falls back to the quizId when a non-combined group's title is empty", () => {
    const groups = { "quiz-x": [attempt("quiz-x", "", "2026-06-21T10:00:00.000Z", 60)] };
    render(<HistoryScreen groups={groups} onBack={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "quiz-x" })).toBeInTheDocument();
  });
});
