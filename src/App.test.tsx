import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    window.location.hash = "#/";
  });

  it("shows a card per course on the home page", async () => {
    render(<App />);
    expect(
      await screen.findByRole("link", { name: /Software Design and Architecture/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New Course/ })).toBeInTheDocument();
  });

  it("navigates into a course and shows its PDF checkboxes", async () => {
    render(<App />);
    await userEvent.click(
      await screen.findByRole("link", { name: /Software Design and Architecture/ }),
    );
    expect(
      await screen.findByRole("checkbox", { name: /Demo — Mixed Question Types/ }),
    ).toBeInTheDocument();
  });

  it("starts a quiz from a selected PDF inside a course", async () => {
    render(<App />);
    await userEvent.click(
      await screen.findByRole("link", { name: /Software Design and Architecture/ }),
    );
    await userEvent.click(
      await screen.findByRole("checkbox", { name: /Demo — Mixed Question Types/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(await screen.findByText(/Question 1 of/)).toBeInTheDocument();
  });

  it("opens per-course history and returns", async () => {
    render(<App />);
    await userEvent.click(
      await screen.findByRole("link", { name: /Software Design and Architecture/ }),
    );
    await userEvent.click(await screen.findByRole("button", { name: /past attempts/i }));
    expect(await screen.findByRole("heading", { name: /past attempts/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByRole("tab", { name: /by pdf/i })).toBeInTheDocument();
  });

  it("shows the placeholder course as empty", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("link", { name: /New Course/ }));
    expect(await screen.findByText(/no quizzes found/i)).toBeInTheDocument();
  });

  it("shows a not-found page for an unmatched route", async () => {
    window.location.hash = "#/nonsense";
    render(<App />);
    expect(await screen.findByText(/page not found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to courses/i })).toBeInTheDocument();
  });
});
