/**
 * Unit tests for src/components/layout/AppShell.jsx
 *
 * Focus:
 *  - toPlainText() function — both the DOMParser path (jsdom) and the
 *    manual for-of HTML-stripping loop (window === undefined path, tested
 *    via the filteredNotes useMemo which calls toPlainText on note content)
 *  - Component renders and key interaction flows
 *
 * Strategy: mock the notes API so no real HTTP requests are made, then
 * render the full AppShell and assert on the resulting DOM.
 */

import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppShell from "../../components/layout/AppShell";
import { renderWithProviders } from "../helpers/renderWithProviders";
import { mockNote, mockNote2, mockNotesList } from "../helpers/testData";

// ── Mock API modules ──────────────────────────────────────────────────────────
jest.mock("../../api/notesApi", () => ({
  getNotes: jest.fn(),
  getNote: jest.fn(),
  createNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
  error: jest.fn(),
  success: jest.fn(),
}));

// Mock child components that aren't under test to keep the tree manageable
jest.mock("../../components/layout/Sidebar", () => ({
  __esModule: true,
  default: () => <div data-testid="sidebar" />,
}));

jest.mock("../../components/notes/EmptyEditorState", () => ({
  __esModule: true,
  default: ({ onNewNote }) => (
    <button onClick={onNewNote} data-testid="empty-editor-state">
      Create first note
    </button>
  ),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Import API mock references after jest.mock calls
// ─────────────────────────────────────────────────────────────────────────────
import { getNotes, getNote, createNote, deleteNote } from "../../api/notesApi";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function renderAppShell(authOverrides = {}) {
  const authValue = {
    user: { _id: "user-1", name: "Test User", email: "test@example.com" },
    loading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
    ...authOverrides,
  };
  return renderWithProviders(<AppShell />, {
    authValue,
    initialEntries: ["/notes"],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Before each test — reset API mocks
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  getNotes.mockResolvedValue(mockNotesList);
  getNote.mockResolvedValue(mockNote);
  createNote.mockResolvedValue(mockNote);
  deleteNote.mockResolvedValue({});
});

// ─────────────────────────────────────────────────────────────────────────────
// Initial render
// ─────────────────────────────────────────────────────────────────────────────

describe("AppShell — initial render", () => {
  it("renders the sidebar", async () => {
    renderAppShell();
    await waitFor(() => {
      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    });
  });

  it("calls getNotes on mount", async () => {
    renderAppShell();
    await waitFor(() => {
      expect(getNotes).toHaveBeenCalledTimes(1);
    });
  });

  it("renders note titles from the API after loading", async () => {
    renderAppShell();
    await waitFor(() => {
      expect(screen.getByText(mockNote.title)).toBeInTheDocument();
    });
  });

  it("renders the empty editor state when no note is selected", async () => {
    renderAppShell();
    await waitFor(() => {
      expect(screen.getByTestId("empty-editor-state")).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error handling on load
// ─────────────────────────────────────────────────────────────────────────────

describe("AppShell — error handling", () => {
  it("shows an error message when getNotes rejects", async () => {
    getNotes.mockRejectedValue({
      response: { data: { message: "Server error" } },
    });
    renderAppShell();
    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  it("shows a fallback error message when rejection has no message", async () => {
    getNotes.mockRejectedValue(new Error("Network down"));
    renderAppShell();
    await waitFor(() => {
      expect(screen.getByText(/could not load notes/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Note selection
// ─────────────────────────────────────────────────────────────────────────────

describe("AppShell — selecting a note", () => {
  it("calls getNote when a note item is selected", async () => {
    renderAppShell();
    await waitFor(() => screen.getByText(mockNote.title));

    await userEvent.click(
      screen.getByRole("button", { name: new RegExp(`select note: ${mockNote.title}`, "i") })
    );

    await waitFor(() => {
      expect(getNote).toHaveBeenCalledWith(mockNote._id);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// New note flow
// ─────────────────────────────────────────────────────────────────────────────

describe("AppShell — new note flow", () => {
  it("shows the editor in new-note mode when 'Create first note' is clicked", async () => {
    renderAppShell();
    await waitFor(() => screen.getByTestId("empty-editor-state"));
    await userEvent.click(screen.getByText("Create first note"));
    // NoteEditorPanel for new note shows title input
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/note title/i)).toBeInTheDocument();
    });
  });

  it("shows the editor when the mobile New Note button is clicked", async () => {
    renderAppShell();
    await waitFor(() => screen.getAllByRole("button", { name: /create a new note/i }));
    await userEvent.click(
      screen.getAllByRole("button", { name: /create a new note/i })[0]
    );
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/note title/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Search / toPlainText — the key function under coverage
// ─────────────────────────────────────────────────────────────────────────────

describe("AppShell — search / toPlainText coverage", () => {
  it("filters notes by title when searching", async () => {
    getNotes.mockResolvedValue([
      mockNote,
      { ...mockNote2, title: "Completely Different" },
    ]);
    renderAppShell();

    await waitFor(() => screen.getByText(mockNote.title));

    const searchInput = screen.getByRole("searchbox", { name: /search notes/i });
    // Type a query that matches only mockNote.title
    await userEvent.type(searchInput, mockNote.title.slice(0, 4));

    await waitFor(() => {
      expect(screen.queryByText("Completely Different")).not.toBeInTheDocument();
    });
  });

  it("filters notes by content body text (toPlainText called on HTML content)", async () => {
    const htmlNote = {
      ...mockNote,
      title: "Boring Title",
      content: "<p>Unique search term XYZ789</p>",
    };
    getNotes.mockResolvedValue([htmlNote, mockNote2]);
    renderAppShell();

    await waitFor(() => screen.getByText("Boring Title"));

    const searchInput = screen.getByRole("searchbox", { name: /search notes/i });
    await userEvent.type(searchInput, "XYZ789");

    // After debounce (250ms) the filter should keep only htmlNote
    await waitFor(
      () => {
        expect(screen.getByText("Boring Title")).toBeInTheDocument();
        expect(screen.queryByText(mockNote2.title)).not.toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it("shows all notes when search query is cleared", async () => {
    renderAppShell();
    await waitFor(() => screen.getByText(mockNote.title));

    const searchInput = screen.getByRole("searchbox", { name: /search notes/i });
    await userEvent.type(searchInput, "no match xyz");

    await waitFor(() =>
      expect(screen.queryByText(mockNote.title)).not.toBeInTheDocument(),
      { timeout: 1000 }
    );

    await userEvent.clear(searchInput);

    await waitFor(
      () => expect(screen.getByText(mockNote.title)).toBeInTheDocument(),
      { timeout: 1000 }
    );
  });

  it("exercises toPlainText with HTML that has no content (empty tags)", async () => {
    const emptyHtmlNote = {
      ...mockNote,
      content: "<p><br/></p>",
      title: "Empty HTML Note",
    };
    getNotes.mockResolvedValue([emptyHtmlNote]);
    renderAppShell();

    await waitFor(() => screen.getByText("Empty HTML Note"));

    // Typing into search triggers toPlainText on the note content
    const searchInput = screen.getByRole("searchbox", { name: /search notes/i });
    await userEvent.type(searchInput, "z");

    // Should not crash; note is filtered out because content has no matching text
    await waitFor(
      () => expect(screen.queryByText("Empty HTML Note")).not.toBeInTheDocument(),
      { timeout: 1000 }
    );
  });

  it("toPlainText handles notes with only special characters in content", async () => {
    const specialNote = {
      ...mockNote,
      content: "<p>&amp;&lt;&gt;</p>",
      title: "Special Chars Note",
    };
    getNotes.mockResolvedValue([specialNote]);
    renderAppShell();
    await waitFor(() => screen.getByText("Special Chars Note"));
    // No crash expected — toPlainText sanitises and strips the HTML
    expect(screen.getByText("Special Chars Note")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mobile header "Back to Notes" navigation
// ─────────────────────────────────────────────────────────────────────────────

describe("AppShell — mobile header navigation", () => {
  it("shows 'Back to Notes' label after a note is selected", async () => {
    renderAppShell();
    await waitFor(() => screen.getByText(mockNote.title));
    await userEvent.click(
      screen.getByRole("button", { name: new RegExp(`select note: ${mockNote.title}`, "i") })
    );
    await waitFor(() => {
      expect(screen.getByText("Back to Notes")).toBeInTheDocument();
    });
  });
});
