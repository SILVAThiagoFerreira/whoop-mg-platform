import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";
describe("WHOOP MG Lab demo shell", () => {
  it("does not expose health data before account authentication", () => {
    render(<App />);
    expect(screen.getByText("Train smarter.")).toBeTruthy();
    expect(screen.getByText("Private by design")).toBeTruthy();
    expect(screen.queryByText("Recovery")).toBeNull();
  });
});
