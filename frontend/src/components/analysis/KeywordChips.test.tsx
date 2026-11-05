import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { KeywordChips } from "./KeywordChips";

describe("KeywordChips", () => {
  it("renders present and missing keywords with the coverage percentage", () => {
    render(<KeywordChips present={["React", "TypeScript", "SQL"]} missing={["Docker"]} />);
    for (const k of ["React", "TypeScript", "SQL", "Docker"]) {
      expect(screen.getByText(k)).toBeInTheDocument();
    }
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("/ 4")).toBeInTheDocument();
  });

  it("shows 0% instead of NaN when there are no keywords", () => {
    render(<KeywordChips />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.queryByText("NaN%")).not.toBeInTheDocument();
  });

  it("shows 100% when nothing is missing", () => {
    render(<KeywordChips present={["Go"]} missing={[]} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
