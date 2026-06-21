import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PdfSelector } from "./PdfSelector";
import type { SourceGroup } from "../../domain/topics";

function tf(id: string): SourceGroup["questions"][number] {
  return { id, type: "true_false", difficulty: "easy", topic: "T", prompt: "p", correctValue: true, explanation: "e" };
}

const sources: SourceGroup[] = [
  { quizId: "demo", title: "Demo Quiz", questions: [tf("1"), tf("2")] },
  { quizId: "micro", title: "Microservices", questions: [tf("3")] },
];

describe("PdfSelector", () => {
  it("shows each PDF title with its question count", () => {
    render(<PdfSelector sources={sources} onStart={vi.fn()} />);
    expect(screen.getByText("Demo Quiz")).toBeInTheDocument();
    expect(screen.getByText("Microservices")).toBeInTheDocument();
    expect(screen.getByText("2 questions")).toBeInTheDocument();
  });

  it("starts with the selected quiz ids and chosen max", async () => {
    const onStart = vi.fn();
    render(<PdfSelector sources={sources} onStart={onStart} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Demo Quiz/ }));
    const max = screen.getByRole("spinbutton");
    await userEvent.clear(max);
    await userEvent.type(max, "2");
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(onStart).toHaveBeenCalledWith(["demo"], 2);
  });

  it("disables Start until a PDF is selected", () => {
    render(<PdfSelector sources={sources} onStart={vi.fn()} />);
    expect(screen.getByRole("button", { name: /start/i })).toBeDisabled();
  });
});
