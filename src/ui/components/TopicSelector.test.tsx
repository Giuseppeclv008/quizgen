import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopicSelector } from "./TopicSelector";
import type { TopicGroup } from "../../domain/topics";

function tf(id: string, topic: string): TopicGroup["questions"][number] {
  return { id, type: "true_false", difficulty: "easy", topic, prompt: "p", correctValue: true, explanation: "e" };
}

const topics: TopicGroup[] = [
  { topic: "Alpha", questions: [tf("1", "Alpha"), tf("2", "Alpha")] },
  { topic: "Beta", questions: [tf("3", "Beta")] },
];

describe("TopicSelector", () => {
  it("starts with the selected topics and chosen max", async () => {
    const onStart = vi.fn();
    render(<TopicSelector topics={topics} onStart={onStart} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Alpha/ }));
    const max = screen.getByRole("spinbutton");
    await userEvent.clear(max);
    await userEvent.type(max, "1");
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(onStart).toHaveBeenCalledWith(["Alpha"], 1);
  });

  it("disables Start until a topic is selected", () => {
    render(<TopicSelector topics={topics} onStart={vi.fn()} />);
    expect(screen.getByRole("button", { name: /start/i })).toBeDisabled();
  });
});
