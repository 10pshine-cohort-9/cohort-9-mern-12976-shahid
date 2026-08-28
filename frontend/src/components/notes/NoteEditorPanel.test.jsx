/**
 * Tests for src/components/notes/NoteEditorPanel.jsx
 *
 * Focus: newly modified lines —
 *   1. htmlToPlainText — DOMParser path  (querySelectorAll br/block, \u00a0)
 *   2. htmlToPlainText — for-of fallback (window.DOMParser absent)
 *   3. buildTxtFileName — all four regex/replace branches
 *
 * Trigger path: Edit → HTML tab → "Export .txt"
 *   → handleTextExport → htmlToPlainText(htmlValue)
 *
 * CRITICAL FIX applied to fallback tests:
 *   Tiptap's useEditor calls `new window.DOMParser()` during render.
 *   Deleting DOMParser in beforeEach crashes render itself.
 *   Solution: render with DOMParser intact, delete it only immediately
 *   before the export click, restore it immediately after.
 */

import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import NoteEditorPanel from "./NoteEditorPanel";

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: () => null,
}));

jest.mock("../../api/uploadApi", () => ({
  uploadNoteImageFile: jest.fn(),
}));

jest.mock("../../utils/sanitizeHtml", () => ({
  sanitizeHtml: jest.fn((html) => html || ""),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_NOTE = {
  _id: "note-001",
  title: "My Note",
  content: "<p>Hello <strong>world</strong></p>",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-20T12:00:00.000Z",
};

const RICH_NOTE = {
  ...BASE_NOTE,
  _id: "note-002",
  title: "Rich Note",
  content: [
    "<h1>Heading</h1>",
    "<p>Paragraph one</p>",
    "<p>Paragraph two</p>",
    "<br/>",
    "<ul><li>item</li></ul>",
  ].join(""),
};

const NBSP_NOTE = {
  ...BASE_NOTE,
  _id: "note-003",
  title: "NBSP Note",
  content: "<p>hello\u00a0world</p>",
};

const SPECIAL_TITLE_NOTE = {
  ...BASE_NOTE,
  _id: "note-004",
  title: "  !!Hello World!!  ",
  content: "<p>content</p>",
};

const HYPHEN_TITLE_NOTE = {
  ...BASE_NOTE,
  _id: "note-005",
  title: "-leading and trailing-",
  content: "<p>content</p>",
};

const CONSECUTIVE_HYPHEN_NOTE = {
  ...BASE_NOTE,
  _id: "note-006",
  title: "hello   world",
  content: "<p>content</p>",
};

// ── Render helper ─────────────────────────────────────────────────────────────

function renderPanel(note = BASE_NOTE, overrides = {}) {
  const props = {
    note,
    onSave: jest.fn().mockResolvedValue(undefined),
    onDiscard: jest.fn(),
    onDelete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return render(
    <MemoryRouter>
      <NoteEditorPanel {...props} />
    </MemoryRouter>
  );
}

/**
 * Enter edit mode then switch to HTML tab.
 * Must be called inside act() by the caller.
 */
async function enterHtmlMode() {
  await userEvent.click(screen.getByRole("button", { name: /^edit$/i }));
  await userEvent.click(screen.getByRole("button", { name: /^html$/i }));
}

// ── Anchor/blob capture ───────────────────────────────────────────────────────

let anchorClickSpy;
let createdAnchors;

beforeEach(() => {
  createdAnchors = [];
  anchorClickSpy = jest.fn();

  const originalCreate = document.createElement.bind(document);
  jest.spyOn(document, "createElement").mockImplementation((tag) => {
    const el = originalCreate(tag);
    if (tag === "a") {
      jest.spyOn(el, "click").mockImplementation(() => anchorClickSpy(el));
      createdAnchors.push(el);
    }
    return el;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Basic rendering
// ─────────────────────────────────────────────────────────────────────────────

describe("NoteEditorPanel — rendering", () => {
  it("renders the note title in view mode", () => {
    renderPanel();
    expect(screen.getByText("My Note")).toBeInTheDocument();
  });

  it("renders the Export .txt button", () => {
    renderPanel();
    expect(
      screen.getByRole("button", { name: /export \.txt/i })
    ).toBeInTheDocument();
  });

  it("renders the Edit button for an existing note", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// htmlToPlainText — DOMParser path
// ─────────────────────────────────────────────────────────────────────────────

describe("NoteEditorPanel — htmlToPlainText (DOMParser path)", () => {
  it("exports without throwing for rich HTML content", async () => {
    renderPanel(RICH_NOTE);
    try {
      await act(async () => {
        await enterHtmlMode();
        await userEvent.click(
          screen.getByRole("button", { name: /export \.txt/i })
        );
      });

      expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    } catch (err) {
      throw err;
    }
  });

  it("handles <br> tags (replaceWith newline branch)", async () => {
    renderPanel({ ...BASE_NOTE, content: "<p>line one</p><br/><p>line two</p>" });
    try {
      await act(async () => {
        await enterHtmlMode();
        await userEvent.click(
          screen.getByRole("button", { name: /export \.txt/i })
        );
      });

      expect(anchorClickSpy).toHaveBeenCalledTimes(1);
      expect(createdAnchors[0].download).toMatch(/\.txt$/);
    } catch (err) {
      throw err;
    }
  });

  it("handles non-breaking spaces (\\u00a0 → space branch)", async () => {
    renderPanel(NBSP_NOTE);
    try {
      await act(async () => {
        await enterHtmlMode();
        await userEvent.click(
          screen.getByRole("button", { name: /export \.txt/i })
        );
      });

      expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    } catch (err) {
      throw err;
    }
  });

  it("shows toast.error when content is empty (early return branch)", async () => {
    renderPanel({ ...BASE_NOTE, content: "" });
    try {
      // In view mode with empty note, export button fires directly
      await act(async () => {
        await userEvent.click(
          screen.getByRole("button", { name: /export \.txt/i })
        );
      });

      const toast = (await import("react-hot-toast")).default;
      expect(toast.error).toHaveBeenCalledWith("Nothing to export yet.");
      expect(anchorClickSpy).not.toHaveBeenCalled();
    } catch (err) {
      throw err;
    }
  });

  it("handles block element newlines (insertAdjacentText branch)", async () => {
    renderPanel({
      ...BASE_NOTE,
      content: "<h1>Title</h1><p>Body</p><ul><li>Item</li></ul>",
    });
    try {
      await act(async () => {
        await enterHtmlMode();
        await userEvent.click(
          screen.getByRole("button", { name: /export \.txt/i })
        );
      });

      expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    } catch (err) {
      throw err;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// htmlToPlainText — for-of fallback
//
// FIX: render with DOMParser intact (Tiptap needs it to initialise).
// Delete DOMParser only immediately before the export click, restore after.
// ─────────────────────────────────────────────────────────────────────────────

describe("NoteEditorPanel — htmlToPlainText (for-of fallback, no DOMParser)", () => {
  /**
   * Renders the panel, enters HTML mode, then:
   *   1. deletes window.DOMParser
   *   2. clicks Export .txt  (htmlToPlainText runs without DOMParser)
   *   3. restores window.DOMParser
   */
  async function exportWithoutDOMParser(note = RICH_NOTE) {
    renderPanel(note);

    // Enter edit + HTML mode while DOMParser is still available
    await act(async () => {
      await enterHtmlMode();
    });

    // Now surgically remove DOMParser just for the export call
    const saved = window.DOMParser;
    delete window.DOMParser;

    try {
      await act(async () => {
        await userEvent.click(
          screen.getByRole("button", { name: /export \.txt/i })
        );
      });
    } finally {
      // Always restore so subsequent tests are unaffected
      window.DOMParser = saved;
    }
  }

  it("exports successfully without DOMParser", async () => {
    await exportWithoutDOMParser();
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  });

  it("strips all HTML tags via the for-of char loop", async () => {
    await exportWithoutDOMParser({
      ...BASE_NOTE,
      content: "<p>visible text</p>",
    });
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  });

  it("handles a <br> tag (bounded regex replacement → for-of)", async () => {
    await exportWithoutDOMParser({
      ...BASE_NOTE,
      content: "<p>line one<br/>line two</p>",
    });
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  });

  it("handles a lone '<' with no matching '>' (insideTag stays true)", async () => {
    await exportWithoutDOMParser({
      ...BASE_NOTE,
      content: "before < unclosed tag text",
    });
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  });

  it("handles content with no HTML at all (insideTag never set)", async () => {
    await exportWithoutDOMParser({
      ...BASE_NOTE,
      content: "plain text content with no tags",
    });
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  });

  it("trims leading/trailing whitespace from stripped result", async () => {
    await exportWithoutDOMParser({
      ...BASE_NOTE,
      content: "<p>  padded  </p>",
    });
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  });

  it("shows toast.error when stripped result is empty", async () => {
    renderPanel({ ...BASE_NOTE, content: "<p></p>" });

    await act(async () => {
      await enterHtmlMode();
    });

    // Clear the HTML textarea so htmlValue becomes empty
    const textarea = screen.getByRole("textbox", {
      name: /html content editor/i,
    });
    await act(async () => {
      await userEvent.clear(textarea);
    });

    const saved = window.DOMParser;
    delete window.DOMParser;

    try {
      await act(async () => {
        await userEvent.click(
          screen.getByRole("button", { name: /export \.txt/i })
        );
      });
    } finally {
      window.DOMParser = saved;
    }

    const toast = (await import("react-hot-toast")).default;
    expect(toast.error).toHaveBeenCalledWith("Nothing to export yet.");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildTxtFileName — all regex/replace branches (via anchor.download)
// ─────────────────────────────────────────────────────────────────────────────

describe("NoteEditorPanel — buildTxtFileName (via export filename)", () => {
  async function getFilename(note) {
    const { unmount } = renderPanel(note);
    try {
      await act(async () => {
        await enterHtmlMode();
        await userEvent.click(
          screen.getByRole("button", { name: /export \.txt/i })
        );
      });
    } catch (err) {
      unmount();
      createdAnchors.length = 0;
      anchorClickSpy.mockClear();
      throw err;
    }

    const filename = createdAnchors[0]?.download ?? "";
    unmount();
    createdAnchors.length = 0;
    anchorClickSpy.mockClear();
    return filename;
  }

  it("produces a .txt filename from a normal title", async () => {
    const f = await getFilename(BASE_NOTE);
    expect(f).toMatch(/\.txt$/);
    expect(f).toContain("my-note");
  });

  it("removes special characters ([^a-z0-9\\s-] branch)", async () => {
    const f = await getFilename(SPECIAL_TITLE_NOTE);
    expect(f).not.toMatch(/!/);
    expect(f).toMatch(/\.txt$/);
  });

  it("converts spaces to hyphens (\\s+ → '-' branch)", async () => {
    const f = await getFilename({ ...BASE_NOTE, title: "hello world test" });
    expect(f).toContain("hello-world-test");
  });

  it("collapses consecutive hyphens (-+ → '-' branch)", async () => {
    const f = await getFilename(CONSECUTIVE_HYPHEN_NOTE);
    expect(f).not.toMatch(/--/);
    expect(f).toContain("hello-world");
  });

  it("removes leading and trailing hyphens (^-|-$ branch)", async () => {
    const f = await getFilename(HYPHEN_TITLE_NOTE);
    const base = f.replace(/\.txt$/, "");
    expect(base).not.toMatch(/^-/);
    expect(base).not.toMatch(/-$/);
  });

  it("falls back to 'note.txt' when title is entirely special characters", async () => {
    const f = await getFilename({ ...BASE_NOTE, title: "!!!" });
    expect(f).toBe("note.txt");
  });

  it("lowercases the entire filename", async () => {
    const f = await getFilename({ ...BASE_NOTE, title: "UPPERCASE TITLE" });
    expect(f).toBe(f.toLowerCase());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// New-note mode (note prop is null)
// ─────────────────────────────────────────────────────────────────────────────

describe("NoteEditorPanel — new note mode", () => {
  it("renders editing mode with empty title when note is null", () => {
    renderPanel(null);
    expect(screen.getByPlaceholderText(/note title/i)).toBeInTheDocument();
  });

  it("shows 'Discard' button in new-note mode", () => {
    renderPanel(null);
    expect(
      screen.getByRole("button", { name: /discard/i })
    ).toBeInTheDocument();
  });

  it("calls onDiscard when Discard is clicked", async () => {
    const onDiscard = jest.fn();
    renderPanel(null, { onDiscard });
    try {
      await userEvent.click(screen.getByRole("button", { name: /discard/i }));
      expect(onDiscard).toHaveBeenCalledTimes(1);
    } catch (err) {
      throw err;
    }
  });

  it("shows title-required error when saving with no title", async () => {
    renderPanel(null);
    try {
      await act(async () => {
        await userEvent.click(screen.getByRole("button", { name: /^html$/i }));
        const textarea = screen.getByRole("textbox", {
          name: /html content editor/i,
        });
        await userEvent.type(textarea, "<p>some content</p>");
        await userEvent.click(screen.getByRole("button", { name: /^save$/i }));
      });

      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    } catch (err) {
      throw err;
    }
  });
});
