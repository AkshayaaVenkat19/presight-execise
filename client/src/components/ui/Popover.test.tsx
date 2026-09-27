import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Popover } from "./Popover";

function renderPopover(portal = false) {
  render(
    <>
      <Popover label="Settings" trigger="Open settings" portal={portal}>
        <button type="button">Change theme</button>
        <button type="button">Sign out</button>
      </Popover>
      <button type="button">Outside</button>
    </>,
  );
  return screen.getByRole("button", { name: "Settings" });
}

describe.each([false, true])("Popover (portal=%s)", (portal) => {
  it("opens with the keyboard, focuses content and restores focus on Escape", async () => {
    const user = userEvent.setup();
    const trigger = renderPopover(portal);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "id",
      trigger.getAttribute("aria-controls"),
    );
    expect(screen.getByRole("button", { name: "Change theme" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("toggles on trigger clicks and dismisses on outside clicks", async () => {
    const user = userEvent.setup();
    const trigger = renderPopover(portal);
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Change theme" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows tabbing through content and dismisses when focus leaves", async () => {
    const user = userEvent.setup();
    renderPopover(portal);
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.tab();
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveFocus();
    await user.tab();
    expect(
      portal ? document.body : screen.getByRole("button", { name: "Outside" }),
    ).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
