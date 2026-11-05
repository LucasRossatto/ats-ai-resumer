import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IssuesList } from "./IssuesList";
import type { AnalysisIssue } from "@/types/api";

const issues = [
  { title: "No metrics", severity: "high", explanation: "Bullets lack numbers.", fix: "Add percentages." },
  { title: "Long summary", severity: "low", explanation: "Summary is verbose." },
] as AnalysisIssue[];

describe("IssuesList", () => {
  it("lists every issue and the total count", () => {
    render(<IssuesList issues={issues} />);
    expect(screen.getByText("No metrics")).toBeInTheDocument();
    expect(screen.getByText("Long summary")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("hides details until an issue is expanded", async () => {
    render(<IssuesList issues={issues} />);
    expect(screen.queryByText("Bullets lack numbers.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /No metrics/ }));
    expect(screen.getByText("Bullets lack numbers.")).toBeInTheDocument();
    expect(screen.getByText("Add percentages.")).toBeInTheDocument();
  });

  it("omits the fix box when the issue has no fix", async () => {
    render(<IssuesList issues={issues} />);
    await userEvent.click(screen.getByRole("button", { name: /Long summary/ }));
    expect(screen.getByText("Summary is verbose.")).toBeInTheDocument();
    expect(screen.queryByText("Add percentages.")).not.toBeInTheDocument();
  });
});
