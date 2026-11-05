import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./Select";

function setup(onValueChange = vi.fn()) {
  render(
    <Select onValueChange={onValueChange}>
      <SelectTrigger aria-label="Role">
        <SelectValue placeholder="Pick a role" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="dev">Developer</SelectItem>
          <SelectItem value="pm">Manager</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
  return onValueChange;
}

describe("Select", () => {
  it("keeps options hidden until the trigger is clicked", async () => {
    setup();
    expect(screen.queryByText("Developer")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Role" }));
    expect(screen.getByText("Developer")).toBeInTheDocument();
  });

  it("emits the item value and closes after selecting", async () => {
    const onValueChange = setup();
    await userEvent.click(screen.getByRole("button", { name: "Role" }));
    await userEvent.click(screen.getByText("Manager"));
    expect(onValueChange).toHaveBeenCalledWith("pm");
    expect(screen.queryByText("Developer")).not.toBeInTheDocument();
  });

  it("closes when clicking outside", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Role" }));
    await userEvent.click(document.body);
    expect(screen.queryByText("Developer")).not.toBeInTheDocument();
  });
});
