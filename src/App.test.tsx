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

  it("opens the past-attempts screen from the menu and returns", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: /past attempts/i }));
    expect(screen.getByRole("heading", { name: /past attempts/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByRole("checkbox", { name: /Astronomy/ })).toBeInTheDocument();
  });
});
