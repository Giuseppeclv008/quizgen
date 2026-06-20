import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionView } from "./QuestionView";
import type { Question } from "../../domain/schema";

const single: Question = {
  id: "1", type: "single_choice", difficulty: "easy", prompt: "Pick B",
  options: [{ id: "a", text: "Apple" }, { id: "b", text: "Banana" }],
  correctOptionId: "b", explanation: "e",
};
const multi: Question = {
  id: "2", type: "multi_select", difficulty: "easy", prompt: "Pick A and C",
  options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }],
  correctOptionIds: ["a", "c"], explanation: "e",
};
const tf: Question = {
  id: "3", type: "true_false", difficulty: "easy", prompt: "True please",
  correctValue: true, explanation: "e",
};

describe("QuestionView", () => {
  it("renders single_choice and reports the picked option", async () => {
    const onAnswer = vi.fn();
    render(<QuestionView question={single} answer={undefined} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByLabelText("Banana"));
    expect(onAnswer).toHaveBeenCalledWith({ type: "single_choice", optionId: "b" });
  });

  it("renders multi_select and accumulates selections", async () => {
    const onAnswer = vi.fn();
    render(<QuestionView question={multi} answer={{ type: "multi_select", optionIds: ["a"] }} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByLabelText("C"));
    expect(onAnswer).toHaveBeenCalledWith({ type: "multi_select", optionIds: ["a", "c"] });
  });

  it("renders true_false and reports the boolean", async () => {
    const onAnswer = vi.fn();
    render(<QuestionView question={tf} answer={undefined} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByLabelText("True"));
    expect(onAnswer).toHaveBeenCalledWith({ type: "true_false", value: true });
  });
});
