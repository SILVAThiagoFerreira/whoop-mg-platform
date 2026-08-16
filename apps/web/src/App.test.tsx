import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";
describe("WHOOP MG Lab demo shell", () => {
  it("labels demo data and does not present unavailable metrics as values", () => {
    render(<App />);
    expect(screen.getAllByText("DEMO DATA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not available yet").length).toBeGreaterThan(0);
  });
});
