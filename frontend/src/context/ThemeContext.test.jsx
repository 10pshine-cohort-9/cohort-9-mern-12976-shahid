import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./ThemeContext";

// ── Test consumer component ───────────────────────────────────────────────────
function TestConsumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme} data-testid="toggle">
        Toggle
      </button>
    </div>
  );
}

function renderThemeProvider() {
  return render(
    <ThemeProvider>
      <TestConsumer />
    </ThemeProvider>
  );
}

// Clean up html class and matchMedia mock between every test so state doesn't bleed
beforeEach(() => {
  document.documentElement.classList.remove("dark");
  // Restore the default matchMedia mock (no dark preference)
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ThemeProvider — initial theme", () => {
  it("defaults to light when localStorage has no stored value", () => {
    renderThemeProvider();
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("reads 'dark' from localStorage on mount", () => {
    localStorage.setItem("theme", "dark");
    renderThemeProvider();
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("reads 'light' from localStorage on mount", () => {
    localStorage.setItem("theme", "light");
    renderThemeProvider();
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("falls back to light when localStorage has an invalid value", () => {
    localStorage.setItem("theme", "solarized");
    renderThemeProvider();
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("reads system preference (dark) when no localStorage value is set", () => {
    // Override matchMedia to simulate a dark-mode system preference
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));
    renderThemeProvider();
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ThemeProvider — toggleTheme()", () => {
  it("switches from light to dark", async () => {
    // Ensure we start clean (no dark stored)
    localStorage.removeItem("theme");
    renderThemeProvider();

    // Should start light (no system dark pref, no stored pref)
    expect(screen.getByTestId("theme").textContent).toBe("light");

    await act(async () => {
      await userEvent.click(screen.getByTestId("toggle"));
    });

    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("switches from dark back to light", async () => {
    localStorage.setItem("theme", "dark");
    renderThemeProvider();

    await act(async () => {
      await userEvent.click(screen.getByTestId("toggle"));
    });

    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("adds the 'dark' class to document.documentElement when switching to dark", async () => {
    localStorage.removeItem("theme");
    renderThemeProvider();

    await act(async () => {
      await userEvent.click(screen.getByTestId("toggle"));
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes the 'dark' class from document.documentElement when switching to light", async () => {
    localStorage.setItem("theme", "dark");
    renderThemeProvider();
    // At this point html has dark class
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await act(async () => {
      await userEvent.click(screen.getByTestId("toggle"));
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists the new theme to localStorage after toggling to dark", async () => {
    localStorage.removeItem("theme");
    renderThemeProvider();

    await act(async () => {
      await userEvent.click(screen.getByTestId("toggle"));
    });

    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("persists light when toggling back from dark", async () => {
    localStorage.setItem("theme", "dark");
    renderThemeProvider();

    await act(async () => {
      await userEvent.click(screen.getByTestId("toggle"));
    });

    expect(localStorage.getItem("theme")).toBe("light");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ThemeProvider — html class on mount", () => {
  it("adds dark class to html when stored theme is dark", () => {
    localStorage.setItem("theme", "dark");
    renderThemeProvider();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does not add dark class when stored theme is light", () => {
    localStorage.setItem("theme", "light");
    renderThemeProvider();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
