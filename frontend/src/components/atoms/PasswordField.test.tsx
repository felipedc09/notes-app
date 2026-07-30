import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PasswordField } from "./PasswordField";

describe("PasswordField", () => {
  it("hides the eye icon until the field has text (FR-03)", () => {
    render(<PasswordField label="Password" name="password" />);
    expect(
      screen.queryByRole("button", { name: /show password/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the eye icon once text is entered and toggles masked/visible", async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" name="password" />);

    const input = screen.getByLabelText("Password");
    await user.type(input, "secret123");

    expect(input).toHaveAttribute("type", "password");

    const toggle = await screen.findByRole("button", { name: /show password/i });
    await user.click(toggle);

    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("hides the eye icon again once the field is cleared", async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" name="password" />);

    const input = screen.getByLabelText("Password");
    await user.type(input, "a");
    expect(screen.getByRole("button", { name: /show password/i })).toBeInTheDocument();

    await user.clear(input);
    expect(
      screen.queryByRole("button", { name: /show password/i }),
    ).not.toBeInTheDocument();
  });
});
