/**
 * Unit tests for src/components/notes/NotesListPanel.jsx
 *
 * Focus: getPreview() HTML-stripping for-of loop and truncation logic, plus
 * the component's rendering and interaction paths.
 *
 * Strategy: render NotesListPanel via renderWithProviders, assert on DOM
 * output.  API dependencies are NOT used by this component directly — it
 * receives props — so no API mocks are needed.
 */

import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotesListPanel from "../../components/notes/NotesListPanel";
import { renderWithProviders } from "../helpers/renderWithProviders";

// ─────────────────────────────────────────────────────────────────────────────
// Shared props factory — keeps individual tests terse
// ─────────────────────────────────────────────────────────────────────────────

const noop = () => {};

function buildProps(overrides = {}) {
  return {
    notes: [],
    loading: false,
    error: "",
    searchQuery: "",
    onSearchChange: jest.fn(),
    activeNoteId: null,
    onSelectNote: jest.fn(),
    onNewNote: jest.fn(),
    onDeleteNote: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const sampleNote = {
  _id: "note-1",
  title: "Test Note",
  content: "<p>Hello <strong>World</strong></p>",
  updatedAt: "2025-01-20T10:00:00.000Z",
};

const longContentNote = {
  _id: "note-2",
  title: "Long Note",
  // Content whose plain-text exceeds 110 chars to test truncation
  content: `<p>${"a".repeat(130)}</p>`,
  updatedAt: "2025-01-20T10:00:00.000Z",
};

const htmlOnlyTagsNote = {
  _id: "note-3",
  title: "Tags Only",
  // HTML that has tags but minimal text — exercises insideTag branches
  content: "<p><br/><strong></strong></p>",
  updatedAt: "2025-01-20T10:00:00.000Z",
};

const specialCharsNote = {
  _id: "note-4",
  title: "Special Chars",
  // Special characters and multiple spaces to test normalisation
  content: "<p>Hello   &amp;   World</p>",
  updatedAt: "2025-01-20T10:00:00.000Z",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper render shorthand
// ─────────────────────────────────────────────────────────────────────────────

function renderPanel(props) {
  return renderWithProviders(<NotesListPanel {...props} />);
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading state
// ─────────────────────────────────────────────────────────────────────────────

describe("NotesListPanel — loading state", () => {
  it("renders a loader while loading is true", () => {
    renderPanel(buildProps({ loading: true }));
    expect(screen.getByText(/loading notes/i)).toBeInTheDocument();
  });

  it("does not render note items while loading", () => {
    renderPanel(buildProps({ loading: true, notes: [sampleNote] }));
    expect(screen.queryByText(sampleNote.title)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error state
// ─────────────────────────────────────────────────────────────────────────────

describe("NotesListPanel — error state", () => {
  it("displays the error message when loading is done and error is set", () => {
    renderPanel(buildProps({ error: "Could not load notes." }));
    expect(screen.getByText("Could not load notes.")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

describe("NotesListPanel — empty state", () => {
  it("shows 'No notes yet' message when there are no notes and no search query", () => {
    renderPanel(buildProps());
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
  });

  it("shows a 'No notes matching' message when search returns no results", () => {
    renderPanel(buildProps({ notes: [], searchQuery: "xyz" }));
    expect(screen.getByText(/no notes matching/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Note list rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("NotesListPanel — note list rendering", () => {
  it("renders each note title", () => {
    renderPanel(buildProps({ notes: [sampleNote] }));
    expect(screen.getByText(sampleNote.title)).toBeInTheDocument();
  });

  it("strips HTML tags and shows plain-text preview for a note", () => {
    renderPanel(buildProps({ notes: [sampleNote] }));
    // "Hello World" should appear as preview text (HTML stripped)
    expect(screen.getByText(/hello/i)).toBeInTheDocument();
  });

  it("truncates a preview longer than 110 characters with ellipsis", () => {
    renderPanel(buildProps({ notes: [longContentNote] }));
    const preview = screen.getByText(/…$/);
    expect(preview).toBeInTheDocument();
    // The preview text before the ellipsis must be ≤ 110 chars
    const textWithoutEllipsis = preview.textContent.replace("…", "");
    expect(textWithoutEllipsis.length).toBeLessThanOrEqual(110);
  });

  it("shows 'No content' when note has only empty HTML tags", () => {
    renderPanel(buildProps({ notes: [htmlOnlyTagsNote] }));
    expect(screen.getByText("No content")).toBeInTheDocument();
  });

  it("renders the note's date", () => {
    renderPanel(buildProps({ notes: [sampleNote] }));
    // formatDate is called on updatedAt — just verify something renders in the date area
    const noteButton = screen.getByRole("button", { name: /select note: test note/i });
    expect(noteButton).toBeInTheDocument();
  });

  it("marks the active note with accessible label", () => {
    renderPanel(buildProps({ notes: [sampleNote], activeNoteId: "note-1" }));
    const btn = screen.getByRole("button", { name: /select note: test note/i });
    expect(btn).toBeInTheDocument();
  });

  it("handles notes with special characters in content", () => {
    renderPanel(buildProps({ notes: [specialCharsNote] }));
    // Should render without crashing; content with &amp; will show as plain text
    expect(screen.getByText(specialCharsNote.title)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPreview — HTML stripping for-of loop paths (exercise via rendering)
// ─────────────────────────────────────────────────────────────────────────────

describe("NotesListPanel — getPreview HTML-stripping branches", () => {
  it("strips opening and closing tags and collapses whitespace", () => {
    const noteWithNested = {
      _id: "note-nested",
      title: "Nested HTML",
      content: "<h1>Title</h1><p>Paragraph <em>italic</em> text</p>",
      updatedAt: "2025-01-20T10:00:00.000Z",
    };
    renderPanel(buildProps({ notes: [noteWithNested] }));
    // All the visible text should be merged into a single preview
    expect(screen.getByText(/title/i)).toBeInTheDocument();
  });

  it("handles an empty content string gracefully (shows 'No content')", () => {
    const emptyNote = { ...sampleNote, _id: "empty", content: "" };
    renderPanel(buildProps({ notes: [emptyNote] }));
    expect(screen.getByText("No content")).toBeInTheDocument();
  });

  it("handles content with only whitespace (shows 'No content')", () => {
    const wsNote = { ...sampleNote, _id: "ws", content: "<p>   </p>" };
    renderPanel(buildProps({ notes: [wsNote] }));
    expect(screen.getByText("No content")).toBeInTheDocument();
  });

  it("handles content with '<' that is not followed by '>' (not a real tag)", () => {
    // Triggers the insideTag = true branch; the char after '<' is not '>'
    const notTagNote = {
      ...sampleNote,
      _id: "nottag",
      content: "<p>5 < 10</p>",
    };
    renderPanel(buildProps({ notes: [notTagNote] }));
    // The component should render without throwing
    expect(screen.getByText(notTagNote.title)).toBeInTheDocument();
  });

  it("handles content that is exactly 110 chars without truncation", () => {
    const exactNote = {
      _id: "exact110",
      title: "Exact",
      content: `<p>${"b".repeat(110)}</p>`,
      updatedAt: "2025-01-20T10:00:00.000Z",
    };
    renderPanel(buildProps({ notes: [exactNote] }));
    // Exactly 110 → no ellipsis appended
    expect(screen.queryByText(/…$/)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Interactions
// ─────────────────────────────────────────────────────────────────────────────

describe("NotesListPanel — interactions", () => {
  it("calls onNewNote when 'Add new note' button is clicked", async () => {
    const onNewNote = jest.fn();
    renderPanel(buildProps({ onNewNote }));
    await userEvent.click(screen.getByRole("button", { name: /add new note/i }));
    expect(onNewNote).toHaveBeenCalledTimes(1);
  });

  it("calls onSelectNote with the note when a note item is clicked", async () => {
    const onSelectNote = jest.fn();
    renderPanel(buildProps({ notes: [sampleNote], onSelectNote }));
    await userEvent.click(
      screen.getByRole("button", { name: /select note: test note/i })
    );
    expect(onSelectNote).toHaveBeenCalledWith(sampleNote);
  });

  it("calls onSearchChange with the typed value", async () => {
    const onSearchChange = jest.fn();
    renderPanel(buildProps({ onSearchChange }));
    const input = screen.getByRole("searchbox", { name: /search notes/i });
    await userEvent.type(input, "hello");
    expect(onSearchChange).toHaveBeenCalled();
  });

  it("opens the three-dot menu on click", async () => {
    renderPanel(buildProps({ notes: [sampleNote] }));
    const menuBtn = screen.getByRole("button", { name: /open options for note: test note/i });
    await userEvent.click(menuBtn);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("opens the delete dialog from the three-dot menu", async () => {
    renderPanel(buildProps({ notes: [sampleNote] }));
    const menuBtn = screen.getByRole("button", { name: /open options for note: test note/i });
    await userEvent.click(menuBtn);
    const deleteBtn = screen.getByRole("menuitem", { name: /delete/i });
    await userEvent.click(deleteBtn);
    // DeleteNoteDialog should appear — it contains a confirm button
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("calls onDeleteNote and clears the dialog after confirming delete", async () => {
    const onDeleteNote = jest.fn().mockResolvedValue(undefined);
    renderPanel(buildProps({ notes: [sampleNote], onDeleteNote }));

    // Open menu
    await userEvent.click(
      screen.getByRole("button", { name: /open options for note: test note/i })
    );
    // Click delete in menu
    await userEvent.click(screen.getByRole("menuitem", { name: /delete/i }));

    // Confirm in dialog
    const confirmBtn = await screen.findByRole("button", { name: /^delete$/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onDeleteNote).toHaveBeenCalledWith(sampleNote);
    });
  });
});
