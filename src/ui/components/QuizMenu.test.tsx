import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizMenu } from "./QuizMenu";
import type { TopicGroup, SourceGroup } from "../../domain/topics";

function tf(id: string, topic: string): TopicGroup["questions"][number] {
  return { id, type: "true_false", difficulty: "easy", topic, prompt: "p", correctValue: true, explanation: "e" };
}

const topics: TopicGroup[] = [{ topic: "Alpha", questions: [tf("1", "Alpha")] }];
const sources: SourceGroup[] = [{ quizId: "demo", title: "Demo Quiz", questions: [tf("1", "Alpha")] }];

function renderMenu(overrides: Partial<React.ComponentProps<typeof QuizMenu>> = {}) {
  return render(
    <QuizMenu
      topics={topics}
      sources={sources}
      errors={[]}
      onShowHistory={vi.fn()}
      onStartTopics={vi.fn()}
      onStartPdfs={vi.fn()}
      {...overrides}
    />,
  );
}

describe("QuizMenu", () => {
  it("shows the PDF selector by default", () => {
    renderMenu();
    expect(screen.getByRole("checkbox", { name: /Demo Quiz/ })).toBeInTheDocument();
  });

  it("switches to the topic selector when the By topic tab is clicked", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("tab", { name: /by topic/i }));
    expect(screen.getByRole("checkbox", { name: /Alpha/ })).toBeInTheDocument();
  });

  it("shows the Past attempts button", () => {
    renderMenu();
    expect(screen.getByRole("button", { name: /past attempts/i })).toBeInTheDocument();
  });

  it("shows an empty state when there are no sources", () => {
    renderMenu({ sources: [], topics: [] });
    expect(screen.getByText(/drop a quiz/i)).toBeInTheDocument();
  });

  it("surfaces load errors", () => {
    renderMenu({ sources: [], topics: [], errors: [{ source: "bad.json", message: "boom" }] });
    expect(screen.getByText(/bad\.json/)).toBeInTheDocument();
  });
});
