import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App", () => {
  it("shows topic checkboxes from the bundled quizzes", async () => {
    render(<App />);
    expect(await screen.findByRole("checkbox", { name: /Astronomy/ })).toBeInTheDocument();
  });

  it("starts a combined quiz from a selected topic", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("checkbox", { name: /Astronomy/ }));
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(await screen.findByText(/Question 1 of/)).toBeInTheDocument();
  });
});
