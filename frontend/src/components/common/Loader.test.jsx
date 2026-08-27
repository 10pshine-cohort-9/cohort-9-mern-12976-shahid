import { render, screen } from "@testing-library/react";
import Loader from "./Loader";

describe("Loader", () => {
  it("renders the default message 'Loading...' when no prop is passed", () => {
    render(<Loader />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders a custom message passed via the message prop", () => {
    render(<Loader message="Fetching notes..." />);
    expect(screen.getByText("Fetching notes...")).toBeInTheDocument();
  });

  it("renders a different custom message", () => {
    render(<Loader message="Checking session…" />);
    expect(screen.getByText("Checking session…")).toBeInTheDocument();
  });

  it("renders the spinning element in the DOM", () => {
    const { container } = render(<Loader />);
    // The spinner is a div with animate-spin class
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders a wrapper with column-direction flex layout", () => {
    const { container } = render(<Loader />);
    const wrapper = container.firstChild;
    expect(wrapper.className).toMatch(/flex/);
    expect(wrapper.className).toMatch(/flex-col/);
  });
});
