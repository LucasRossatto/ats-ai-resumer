import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("exposes the checkbox role with aria-checked and its label as the name", () => {
    render(<Checkbox checked={false} onChange={() => {}} label="Remember me" />);
    const box = screen.getByRole("checkbox", { name: "Remember me" });
    expect(box).toHaveAttribute("aria-checked", "false");
  });

  it("reports the toggled value on click", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<Checkbox checked={false} onChange={onChange} label="A" />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenLastCalledWith(true);

    rerender(<Checkbox checked onChange={onChange} label="A" />);
    expect(screen.getByRole("checkbox")).toBeChecked();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("toggles with the Space key", async () => {
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} label="A" />);
    await userEvent.tab();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
