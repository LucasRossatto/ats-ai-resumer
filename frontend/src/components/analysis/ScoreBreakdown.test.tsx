import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBreakdown } from "./ScoreBreakdown";

describe("ScoreBreakdown", () => {
  it("renders nothing without data", () => {
    const { container } = render(<ScoreBreakdown />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows each axis score out of 25", () => {
    render(<ScoreBreakdown breakdown={{ keywords: 20, formatting: 18, impact: 12, clarity: 25 }} />);
    const scores = { "Job keywords": "20/25", Formatting: "18/25", Impact: "12/25", Clarity: "25/25" };
    for (const [axis, text] of Object.entries(scores)) {
      const label = screen.getAllByText(axis).find((el) => el.nextElementSibling);
      expect(label?.nextElementSibling).toHaveTextContent(text);
    }
  });
});
