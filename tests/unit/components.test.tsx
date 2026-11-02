import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ExternalLink } from "@/components/ui/text-link";
import { Switch } from "@/components/ui/toggles";

describe("Button", () => {
  it("is disabled and busy while loading", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("gives icon-only buttons an accessible name", () => {
    render(<IconButton label="Close">×</IconButton>);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});

describe("Field", () => {
  it("labels the input and links the hint and error to it", () => {
    render(
      <Field label="Title" hint="Shown as the heading." error="Required" required>
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText(/Title/);
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Shown as the heading. Required");
  });

  it("does not mark a valid field invalid", () => {
    render(
      <Field label="Slug">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Slug")).not.toHaveAttribute("aria-invalid");
  });
});

describe("ExternalLink", () => {
  it("adds noopener noreferrer and announces new tabs", () => {
    render(
      <ExternalLink href="https://example.test" newTab>
        Example
      </ExternalLink>,
    );
    const link = screen.getByRole("link", { name: /Example/ });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveTextContent("(opens in a new tab)");
  });

  it("renders an unsafe URL as plain text, not a link", () => {
    render(<ExternalLink href="javascript:alert(1)">Bad</ExternalLink>);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Bad")).toBeInTheDocument();
  });
});

describe("Switch", () => {
  it("reports its state and toggles on click", async () => {
    const onChange = vi.fn();
    render(<Switch label="Featured" checked={false} onCheckedChange={onChange} />);
    const control = screen.getByRole("switch", { name: "Featured" });
    expect(control).toHaveAttribute("aria-checked", "false");
    await userEvent.click(control);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("ConfirmDialog", () => {
  function setup(onConfirm: () => Promise<void>) {
    render(
      <ConfirmDialog
        trigger={<Button>Delete</Button>}
        title="Delete this item?"
        description="This cannot be undone."
        confirmLabel="Delete permanently"
        onConfirm={onConfirm}
      />,
    );
  }

  it("does nothing until confirmed, then runs the action and closes", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    setup(onConfirm);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("alertdialog", { name: "Delete this item?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("cancel closes without running the action", async () => {
    const onConfirm = vi.fn();
    setup(onConfirm);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("stays open and shows the error when the action fails", async () => {
    setup(() => Promise.reject(new Error("Could not delete: item is in use.")));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("item is in use");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});

describe("ThemeToggle", () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    document.cookie = "theme=; Max-Age=0; Path=/";
  });

  it("switches the page theme and remembers the choice in a cookie", async () => {
    document.documentElement.dataset.theme = "light";
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.cookie).toContain("theme=dark");
    expect(
      await screen.findByRole("button", { name: "Switch to light theme" }),
    ).toBeInTheDocument();
  });
});
