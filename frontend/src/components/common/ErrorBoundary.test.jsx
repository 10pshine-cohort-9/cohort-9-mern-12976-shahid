import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "./ErrorBoundary";

// A component that throws on demand
function Bomb({ shouldThrow = false }) {
  if (shouldThrow) {
    throw new Error("Test explosion");
  }
  return <div>Normal content</div>;
}

// Silence the expected console.error from React's error boundary
let errorSpy;
beforeEach(() => {
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
});

describe("ErrorBoundary", () => {
  describe("normal rendering", () => {
    it("renders children when no error is thrown", () => {
      render(
        <ErrorBoundary>
          <Bomb shouldThrow={false} />
        </ErrorBoundary>
      );
      expect(screen.getByText("Normal content")).toBeInTheDocument();
    });

    it("renders multiple children without error", () => {
      render(
        <ErrorBoundary>
          <span>Child A</span>
          <span>Child B</span>
        </ErrorBoundary>
      );
      expect(screen.getByText("Child A")).toBeInTheDocument();
      expect(screen.getByText("Child B")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("catches a thrown error and shows the fallback UI", () => {
      render(
        <ErrorBoundary>
          <Bomb shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("hides the child content when an error occurs", () => {
      render(
        <ErrorBoundary>
          <Bomb shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.queryByText("Normal content")).not.toBeInTheDocument();
    });

    it("shows the 'Refresh Page' button in the fallback UI", () => {
      render(
        <ErrorBoundary>
          <Bomb shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(
        screen.getByRole("button", { name: /refresh page/i })
      ).toBeInTheDocument();
    });

    it("shows a helpful description message", () => {
      render(
        <ErrorBoundary>
          <Bomb shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText(/trouble loading this page/i)).toBeInTheDocument();
    });

    it("Refresh Page button is rendered and clickable without crashing", async () => {
      // jsdom's window.location is a non-spreadable Location object.
      // We verify the button is present and that clicking it does not throw.
      // The component calls window.location.reload() — jsdom logs "not implemented"
      // (suppressed by our console.error mock above) but does not throw.
      render(
        <ErrorBoundary>
          <Bomb shouldThrow={true} />
        </ErrorBoundary>
      );

      const refreshBtn = screen.getByRole("button", { name: /refresh page/i });
      expect(refreshBtn).toBeInTheDocument();
      await expect(userEvent.click(refreshBtn)).resolves.not.toThrow();
    });
  });
});
