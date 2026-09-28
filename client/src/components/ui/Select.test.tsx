import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Select } from "./Select";

it("anchors options below the field and supports keyboard selection and dismissal", async () => {
  const user = userEvent.setup();
  const onValueChange = vi.fn();
  render(
    <>
      <label htmlFor="sort">Sort by</label>
      <Select
        id="sort"
        value="first_name"
        options={[
          { value: "first_name", label: "First name" },
          { value: "age", label: "Age" },
        ]}
        onValueChange={onValueChange}
      />
    </>,
  );
  const trigger = screen.getByRole("combobox", { name: "Sort by" });
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
    top: 20,
    bottom: 64,
    left: 100,
    right: 260,
    width: 160,
    height: 44,
    x: 100,
    y: 20,
    toJSON() {},
  });
  await user.click(trigger);
  expect(screen.getByRole("listbox")).toHaveStyle({
    top: "68px",
    left: "100px",
    width: "160px",
  });
  await user.keyboard("{ArrowDown}{Enter}");
  expect(onValueChange).toHaveBeenCalledWith("age");
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  await user.click(trigger);
  await user.click(document.body);
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});
