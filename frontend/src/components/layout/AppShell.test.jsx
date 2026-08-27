/**
 * Tests for src/components/layout/AppShell.jsx
 *
 * Focus: the `toPlainText` helper and the search-filter pipeline that calls it.
 *
 * toPlainText has two branches:
 *   A) DOMParser path  — window.DOMParser is available (normal jsdom env)
 *   B) for-of fallback — window.DOMParser is removed AFTER render (see below)
 *
 * Timer strategy
 * ─────────────
 * AppShell debounces the search query with a 250 ms setTimeout.
 * We use jest.useFakeTimers({ advanceTimers: true }) so that:
 *   - Promise microtasks (getNotes resolution) still run automatically, and
 *   - We can manually advance the 250 ms debounce timer.
 *
 * ThemeContext exports only ThemeProvider, not ThemeContext itself.
 * Use <ThemeProvider> as the theme wrapper (matches Sidebar.test.jsx pattern).
 */

import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthContext } from "../../context/AuthContext";
import { ThemeProvider } from "../../context/ThemeContext";
import AppShell from "./AppShell";

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), loading: jest.fn() },
  Toaster: () => null,
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

jest.mock("../../api/notesApi", () => ({
  getNotes: jest.fn(),
  getNote: jest.fn(),
  createNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
}));

import { getNotes } from "../../api/notesApi";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOTE_WITH_HTML = {
  _id: "n1",
  title: "HTML Note",
  content: "<p>Hello <strong>world</strong></p><br/>Just > a < test",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const NOTE_PLAIN = {
  _id: "n2",
  title: "Plain Note",
  content: "No markup here",
  createdAt: "2025-01-02T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
};

const NOTE_ONLY_TAGS = {
  _id: "n3",
  title: "Tags Only",
  content: "<div><span></span></div>",
  createdAt: "2025-01-03T00:00:00.000Z",
  updatedAt: "2025-01-03T00:00:00.000Z",
};

const NOTE_EMPTY_CONTENT = {
  _id: "n4",
  title: "Empty Content",
  content: "",
  createdAt: "2025-01-04T00:00:00.000Z",
  updatedAt: "2025-01-04T00:00:00.000Z",
};

// ── Auth value ────────────────────────────────────────────────────────────────

const AUTH_VALUE = {
  user: { _id: "u1", name: "Tester", email: "t@test.com", avatarUrl: "" },
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  updateUser: jest.fn(),
};

// ── Render helper ─────────────────────────────────────────────────────────────

function renderAppShell(notes = [NOTE_WITH_HTML, NOTE_PLAIN]) {
  getNotes.mockResolvedValue(notes);

  return render(
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>
          <AuthContext.Provider value={AUTH_VALUE}>
            <AppShell />
          </AuthContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

/**
 * Wait for at least one note title (or the empty/error state) to appear.
 * Uses real async — does not depend on fake timers.
 */
async function waitForNotesToLoad(firstNoteTitle = "HTML Note") {
  await waitFor(() => {
    expect(screen.getByText(firstNoteTitle)).toBeInTheDocument();
  }, { timeout: 3000 });
}

async function waitForEmptyLoad() {
  await waitFor(() => {
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
  }, { timeout: 3000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMParser path (normal jsdom)
// ─────────────────────────────────────────────────────────────────────────────

describe("AppShell — toPlainText (DOMParser path)", () => {
  beforeEach(() => {
    // advanceTimers:true lets Promise microtasks resolve automatically
    // while still giving us manual control over setTimeout
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders both notes after loading", async () => {
    renderAppShell();
    await waitForNotesToLoad("HTML Note");

    expect(screen.getByText("HTML Note")).toBeInTheDocument();
    expect(screen.getByText("Plain Note")).toBeInTheDocument();
  });

  it("filters notes by title (DOMParser path)", async () => {
    renderAppShell();
    await waitForNotesToLoad("HTML Note");

    const input = screen.getByRole("searchbox", { name: /search notes/i });

    await act(async () => {
      await userEvent.type(input, "plain");
    });
    // Advance past the 250 ms debounce
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.queryByText("HTML Note")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Plain Note")).toBeInTheDocument();
  });

  it("finds a note by its HTML body text (DOMParser strips tags)", async () => {
    renderAppShell();
    await waitForNotesToLoad("HTML Note");

    const input = screen.getByRole("searchbox", { name: /search notes/i });

    await act(async () => {
      await userEvent.type(input, "world");
    });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.queryByText("Plain Note")).not.toBeInTheDocument();
    });
    expect(screen.getByText("HTML Note")).toBeInTheDocument();
  });

  it("shows empty state when search matches nothing", async () => {
    renderAppShell();
    await waitForNotesToLoad("HTML Note");

    const input = screen.getByRole("searchbox", { name: /search notes/i });

    await act(async () => {
      await userEvent.type(input, "zzznomatch");
    });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.getByText(/no notes matching/i)).toBeInTheDocument();
    });
  });

  it("restores all notes when search is cleared", async () => {
    renderAppShell();
    await waitForNotesToLoad("HTML Note");

    const input = screen.getByRole("searchbox", { name: /search notes/i });

    await act(async () => { await userEvent.type(input, "plain"); });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => {
      expect(screen.queryByText("HTML Note")).not.toBeInTheDocument();
    });

    await act(async () => { await userEvent.clear(input); });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.getByText("HTML Note")).toBeInTheDocument();
    });
    expect(screen.getByText("Plain Note")).toBeInTheDocument();
  });

  it("handles a note with empty content without crashing", async () => {
    renderAppShell([NOTE_EMPTY_CONTENT]);
    await waitForNotesToLoad("Empty Content");

    expect(screen.getByText("Empty Content")).toBeInTheDocument();
  });

  it("handles a note whose content is only HTML tags (no visible text)", async () => {
    renderAppShell([NOTE_ONLY_TAGS, NOTE_PLAIN]);
    await waitForNotesToLoad("Tags Only");

    const input = screen.getByRole("searchbox", { name: /search notes/i });

    await act(async () => { await userEvent.type(input, "span"); });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.getByText(/no notes matching/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// for-of fallback (window.DOMParser deleted AFTER component renders)
//
// Key: render + waitForLoad with DOMParser intact, then delete it, then type
// the search query so toPlainText hits the for-of branch.
// ─────────────────────────────────────────────────────────────────────────────

describe("AppShell — toPlainText (for-of fallback, no DOMParser)", () => {
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    // Safety: restore DOMParser if not already restored
    if (!window.DOMParser && global.__savedDOMParser) {
      window.DOMParser = global.__savedDOMParser;
      global.__savedDOMParser = undefined;
    }
  });

  /**
   * Renders, waits for notes, then deletes DOMParser.
   * Returns a restore() function to be called after assertions.
   */
  async function setupFallback(notes = [NOTE_WITH_HTML, NOTE_PLAIN]) {
    renderAppShell(notes);
    const firstTitle = notes[0]?.title ?? "HTML Note";
    await waitForNotesToLoad(firstTitle);

    const saved = window.DOMParser;
    global.__savedDOMParser = saved;
    delete window.DOMParser;

    return () => {
      window.DOMParser = saved;
      global.__savedDOMParser = undefined;
    };
  }

  it("filters notes correctly via the for-of loop", async () => {
    const restore = await setupFallback();

    const input = screen.getByRole("searchbox", { name: /search notes/i });
    await act(async () => { await userEvent.type(input, "world"); });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.queryByText("Plain Note")).not.toBeInTheDocument();
    });
    expect(screen.getByText("HTML Note")).toBeInTheDocument();

    restore();
  });

  it("handles a lone '<' with no closing '>' (insideTag stays true)", async () => {
    const noteUnclosed = {
      _id: "n5",
      title: "Unclosed Note",
      content: "before <unclosed",
      createdAt: "2025-01-05T00:00:00.000Z",
      updatedAt: "2025-01-05T00:00:00.000Z",
    };
    const restore = await setupFallback([noteUnclosed]);

    const input = screen.getByRole("searchbox", { name: /search notes/i });
    await act(async () => { await userEvent.type(input, "before"); });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.getByText("Unclosed Note")).toBeInTheDocument();
    });

    restore();
  });

  it("handles plain text with no HTML (insideTag never set)", async () => {
    const restore = await setupFallback([NOTE_PLAIN]);

    const input = screen.getByRole("searchbox", { name: /search notes/i });
    await act(async () => { await userEvent.type(input, "markup"); });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.getByText("Plain Note")).toBeInTheDocument();
    });

    restore();
  });

  it("handles empty content (early return branch in toPlainText)", async () => {
    renderAppShell([NOTE_EMPTY_CONTENT]);
    await waitForNotesToLoad("Empty Content");

    const saved = window.DOMParser;
    delete window.DOMParser;

    const input = screen.getByRole("searchbox", { name: /search notes/i });
    await act(async () => { await userEvent.type(input, "anything"); });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.getByText(/no notes matching/i)).toBeInTheDocument();
    });

    window.DOMParser = saved;
  });

  it("strips tags and extracts text from closed tags correctly", async () => {
    const restore = await setupFallback([NOTE_WITH_HTML, NOTE_PLAIN]);

    const input = screen.getByRole("searchbox", { name: /search notes/i });
    await act(async () => { await userEvent.type(input, "plain"); });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(screen.getByText("Plain Note")).toBeInTheDocument();
    });

    restore();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API error handling
// ─────────────────────────────────────────────────────────────────────────────

describe("AppShell — load error handling", () => {
  it("shows an error message when getNotes rejects", async () => {
    getNotes.mockRejectedValue({
      response: { data: { message: "Server error" } },
    });

    render(
      <HelmetProvider>
        <MemoryRouter>
          <ThemeProvider>
            <AuthContext.Provider value={AUTH_VALUE}>
              <AppShell />
            </AuthContext.Provider>
          </ThemeProvider>
        </MemoryRouter>
      </HelmetProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
