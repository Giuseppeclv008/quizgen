import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App", () => {
  it("shows PDF checkboxes from the bundled quizzes by default", async () => {
    render(<App />);
    expect(await screen.findByRole("checkbox", { name: /Demo — Mixed Question Types/ })).toBeInTheDocument();
  });

  it("starts a quiz from a selected PDF", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("checkbox", { name: /Demo — Mixed Question Types/ }));
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(await screen.findByText(/Question 1 of/)).toBeInTheDocument();
  });

  it("starts a quiz from a selected topic via the By topic tab", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("tab", { name: /by topic/i }));
    await userEvent.click(await screen.findByRole("checkbox", { name: /Astronomy/ }));
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(await screen.findByText(/Question 1 of/)).toBeInTheDocument();
  });

  it("opens the past-attempts screen from the menu and returns", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: /past attempts/i }));
    expect(screen.getByRole("heading", { name: /past attempts/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByRole("tab", { name: /by pdf/i })).toBeInTheDocument();
  });
});
