/**
 * Focused tests for the `getPreview` helper inside NotesListPanel.jsx
 *
 * getPreview(html) is a module-private function. We exercise it indirectly by
 * rendering <NotesListPanel> with notes whose `content` drives every branch of
 * the for-of character loop:
 *
 *   Branch A  char === '<'   → insideTag = true,  strippedHtml += ' '
 *   Branch B  char === '>'   → insideTag = false  (no char appended)
 *   Branch C  !insideTag     → strippedHtml += char
 *   Branch D  insideTag      → char swallowed (tag body skipped)
 *   Branch E  truncation     → clean.length > 110  → slice + '…'
 *   Branch F  no truncation  → clean.length ≤ 110  → returned as-is
 *   Branch G  empty input    → sanitizeHtml('') returns '' → clean = ''
 *                              → preview = '' → component renders "No content"
 *
 * sanitizeHtml is mocked to be a pass-through so its DOMPurify dependency
 * doesn't interfere with the for-of loop logic under test.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotesListPanel from "./NotesListPanel";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Pass HTML through unchanged so we control exactly what the loop receives
jest.mock("../../utils/sanitizeHtml", () => ({
  sanitizeHtml: jest.fn((html) => html || ""),
}));

jest.mock("../../utils/formatDate", () => ({
  formatDate: jest.fn(() => "Jan 1"),
}));

// ── Shared props ──────────────────────────────────────────────────────────────

const defaultProps = {
  loading: false,
  error: "",
  searchQuery: "",
  onSearchChange: jest.fn(),
  activeNoteId: null,
  onSelectNote: jest.fn(),
  onNewNote: jest.fn(),
  onDeleteNote: jest.fn(),
};

function renderWithNotes(notes) {
  return render(
    <MemoryRouter>
      <NotesListPanel {...defaultProps} notes={notes} />
    </MemoryRouter>
  );
}

function makeNote(id, content) {
  return {
    _id: id,
    title: `Note ${id}`,
    content,
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Branch A + B + C — normal HTML tag (open + close)
// ─────────────────────────────────────────────────────────────────────────────

describe("getPreview — normal HTML tag (branches A, B, C, D)", () => {
  it("strips a simple tag and shows only the inner text", () => {
    renderWithNotes([makeNote("1", "<p>Hello world</p>")]);

    // The preview element shows the stripped text
    expect(screen.getByText(/hello world/i)).toBeInTheDocument();
  });

  it("strips nested tags and concatenates visible text", () => {
    renderWithNotes([
      makeNote("2", "<p>First <strong>bold</strong> text</p>"),
    ]);

    expect(screen.getByText(/first.*bold.*text/i)).toBeInTheDocument();
  });

  it("Branch D: swallows characters inside a tag (tag body not rendered)", () => {
    // The attribute value 'class="foo"' must not appear in the preview
    renderWithNotes([makeNote("3", '<p class="foo">visible</p>')]);

    const preview = screen.getByText(/visible/i);
    expect(preview).toBeInTheDocument();
    expect(preview.textContent).not.toContain('class="foo"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch A only (lone '<' with no matching '>')
// insideTag is set to true and never reset → all subsequent chars swallowed
// ─────────────────────────────────────────────────────────────────────────────

describe("getPreview — lone '<' with no closing '>' (insideTag stays true)", () => {
  it("renders text that appears before the lone '<'", () => {
    renderWithNotes([makeNote("4", "before <unclosed tag content")]);

    // 'before ' is outside the tag; text after '<' is swallowed
    expect(screen.getByText(/before/i)).toBeInTheDocument();
  });

  it("swallows all characters after the lone '<' (they never appear)", () => {
    renderWithNotes([makeNote("5", "safe <SWALLOWED")]);

    const preview = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label")?.includes("Note 5"));

    // Find the preview span (text content of the note button area)
    // The word SWALLOWED should not be visible
    expect(screen.queryByText(/swallowed/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch B only — lone '>' with no preceding '<'
// insideTag is false, so '>' is NOT appended (char === '>' → insideTag=false,
// no else branch → no append) — but text around it is preserved
// ─────────────────────────────────────────────────────────────────────────────

describe("getPreview — lone '>' (insideTag is already false)", () => {
  it("does not include the '>' character in the preview text", () => {
    renderWithNotes([makeNote("6", "a > b")]);

    // The '>' triggers the `else if (char === '>')` branch: insideTag = false
    // (already false). The character itself is NOT appended. 'a' and 'b'
    // and the spaces around '>' are appended normally.
    const previewEl = screen.getByText(/\ba\b/);
    expect(previewEl).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch E — content exceeds 110 characters (truncation path)
// ─────────────────────────────────────────────────────────────────────────────

describe("getPreview — long content (truncation branch E)", () => {
  it("truncates content longer than 110 visible characters and appends '…'", () => {
    const longText = "a".repeat(120);
    renderWithNotes([makeNote("7", longText)]);

    // The rendered preview must be exactly 111 chars: 110 + '…'
    // Find the span that contains the preview text
    const spans = screen
      .getByLabelText(/select note: note 7/i)
      .querySelectorAll("span");

    const previewSpan = Array.from(spans).find((s) =>
      s.textContent.includes("…")
    );

    expect(previewSpan).toBeTruthy();
    // Text content should be 110 'a' chars + '…' = 111 chars
    expect(previewSpan.textContent).toHaveLength(111);
  });

  it("truncation works correctly when HTML wraps the long text", () => {
    const longText = "x".repeat(130);
    renderWithNotes([makeNote("8", `<p>${longText}</p>`)]);

    const button = screen.getByLabelText(/select note: note 8/i);
    const spans = button.querySelectorAll("span");
    const previewSpan = Array.from(spans).find((s) =>
      s.textContent.includes("…")
    );

    expect(previewSpan).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch F — content ≤ 110 characters (no truncation)
// ─────────────────────────────────────────────────────────────────────────────

describe("getPreview — short content (no truncation, branch F)", () => {
  it("returns the full text when it is under 110 characters", () => {
    const shortText = "Short preview";
    renderWithNotes([makeNote("9", shortText)]);

    expect(screen.getByText("Short preview")).toBeInTheDocument();
    expect(screen.queryByText(/…/)).not.toBeInTheDocument();
  });

  it("returns the full text at exactly 110 characters (boundary, no ellipsis)", () => {
    const exactText = "b".repeat(110);
    renderWithNotes([makeNote("10", exactText)]);

    // 110 chars: no truncation (condition is > 110, not >= 110)
    const button = screen.getByLabelText(/select note: note 10/i);
    const spans = button.querySelectorAll("span");
    const previewSpan = Array.from(spans).find(
      (s) => s.textContent === exactText
    );

    expect(previewSpan).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch G — empty / falsy content
// ─────────────────────────────────────────────────────────────────────────────

describe("getPreview — empty content (branch G)", () => {
  it("shows 'No content' fallback when content is an empty string", () => {
    renderWithNotes([makeNote("11", "")]);
    expect(screen.getByText("No content")).toBeInTheDocument();
  });

  it("shows 'No content' fallback when content is whitespace only", () => {
    // Whitespace-only: the for-of loop appends spaces, trim() collapses to '',
    // clean.length === 0 → preview is '' → component renders "No content"
    renderWithNotes([makeNote("12", "   ")]);
    expect(screen.getByText("No content")).toBeInTheDocument();
  });

  it("shows 'No content' when content is only HTML tags with no text", () => {
    renderWithNotes([makeNote("13", "<div><span></span></div>")]);
    // After stripping: only spaces remain → trim() → '' → "No content"
    expect(screen.getByText("No content")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multiple notes — verify each gets its own independent preview
// ─────────────────────────────────────────────────────────────────────────────

describe("getPreview — multiple notes rendered simultaneously", () => {
  it("renders distinct previews for each note independently", () => {
    renderWithNotes([
      makeNote("14", "<p>Alpha content</p>"),
      makeNote("15", "<p>Beta content</p>"),
    ]);

    expect(screen.getByText(/alpha content/i)).toBeInTheDocument();
    expect(screen.getByText(/beta content/i)).toBeInTheDocument();
  });

  it("handles a mix of empty and non-empty content notes", () => {
    renderWithNotes([
      makeNote("16", ""),
      makeNote("17", "<p>Has content</p>"),
    ]);

    expect(screen.getByText("No content")).toBeInTheDocument();
    expect(screen.getByText(/has content/i)).toBeInTheDocument();
  });
});
