import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "./Button";

describe("Button", () => {
  describe("rendering", () => {
    it("renders children text", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
    });

    it("renders as a <button> element", () => {
      render(<Button>Save</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("variants", () => {
    it("applies primary (blue) styles by default", () => {
      render(<Button>Primary</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toMatch(/bg-blue-600/);
    });

    it("applies secondary (gray) styles when variant='secondary'", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toMatch(/bg-gray-100/);
    });

    it("applies danger (red) styles when variant='danger'", () => {
      render(<Button variant="danger">Delete</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toMatch(/bg-red-600/);
    });

    it("merges extra className onto the button", () => {
      render(<Button className="my-custom-class">Custom</Button>);
      expect(screen.getByRole("button").className).toMatch(/my-custom-class/);
    });
  });

  describe("interactions", () => {
    it("calls onClick handler when clicked", async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      await userEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not fire onClick when disabled", async () => {
      const handleClick = jest.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );
      await userEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("is disabled when the disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("applies disabled styles (opacity)", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button").className).toMatch(/disabled:opacity-50/);
    });

    it("is not disabled by default", () => {
      render(<Button>Active</Button>);
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  describe("additional props", () => {
    it("forwards arbitrary props like type and aria-label", () => {
      render(
        <Button type="submit" aria-label="Submit the form">
          Submit
        </Button>
      );
      const btn = screen.getByRole("button");
      expect(btn).toHaveAttribute("type", "submit");
      expect(btn).toHaveAttribute("aria-label", "Submit the form");
    });
  });
});
