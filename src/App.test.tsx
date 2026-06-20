import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders the menu with the bundled example quiz", async () => {
    render(<App />);
    expect(await screen.findByRole("button", { name: /Demo — Mixed Question Types/ })).toBeInTheDocument();
  });
});
