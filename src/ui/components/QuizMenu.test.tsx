import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizMenu } from "./QuizMenu";
import type { TopicGroup } from "../../domain/topics";

function tf(id: string, topic: string): TopicGroup["questions"][number] {
  return { id, type: "true_false", difficulty: "easy", topic, prompt: "p", correctValue: true, explanation: "e" };
}

const topics: TopicGroup[] = [
  { topic: "Alpha", questions: [tf("1", "Alpha"), tf("2", "Alpha")] },
  { topic: "Beta", questions: [tf("3", "Beta")] },
];

describe("QuizMenu", () => {
  it("starts with the selected topics and chosen max", async () => {
    const onStart = vi.fn();
    render(<QuizMenu topics={topics} errors={[]} onStart={onStart} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Alpha/ }));
    const max = screen.getByRole("spinbutton");
    await userEvent.clear(max);
    await userEvent.type(max, "1");
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(onStart).toHaveBeenCalledWith(["Alpha"], 1);
  });

  it("disables Start until a topic is selected", () => {
    render(<QuizMenu topics={topics} errors={[]} onStart={vi.fn()} />);
    expect(screen.getByRole("button", { name: /start/i })).toBeDisabled();
  });

  it("shows an empty state when there are no topics", () => {
    render(<QuizMenu topics={[]} errors={[]} onStart={vi.fn()} />);
    expect(screen.getByText(/drop a quiz/i)).toBeInTheDocument();
  });

  it("surfaces load errors", () => {
    render(<QuizMenu topics={[]} errors={[{ source: "bad.json", message: "boom" }]} onStart={vi.fn()} />);
    expect(screen.getByText(/bad\.json/)).toBeInTheDocument();
  });
});
