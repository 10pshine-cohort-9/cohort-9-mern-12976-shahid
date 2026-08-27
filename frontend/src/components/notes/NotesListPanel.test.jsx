import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import NotesListPanel from "./NotesListPanel";
import { mockNotesList, mockNote, mockNote2 } from "../../__tests__/helpers/testData";

const defaultProps = {
  notes: mockNotesList,
  loading: false,
  error: "",
  searchQuery: "",
  debouncedSearchQuery: "",
  onSearchChange: jest.fn(),
  activeNoteId: null,
  onSelectNote: jest.fn(),
  onNewNote: jest.fn(),
  onDeleteNote: jest.fn(),
};

function renderPanel(overrides = {}) {
  return render(
    <MemoryRouter>
      <NotesListPanel {...defaultProps} {...overrides} />
    </MemoryRouter>
  );
}

describe("NotesListPanel", () => {
  describe("loading state", () => {
    it("shows the Loader when loading is true", () => {
      renderPanel({ loading: true, notes: [] });
      expect(screen.getByText(/loading notes/i)).toBeInTheDocument();
    });

    it("hides notes while loading", () => {
      renderPanel({ loading: true });
      expect(screen.queryByText(mockNote.title)).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows the error message when error prop is set", () => {
      renderPanel({ error: "Could not load notes.", notes: [] });
      expect(screen.getByText("Could not load notes.")).toBeInTheDocument();
    });

    it("does not show notes when an error is present", () => {
      renderPanel({ error: "Failed", notes: [] });
      expect(screen.queryByText(mockNote.title)).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows 'No notes yet' message when notes array is empty", () => {
      renderPanel({ notes: [] });
      expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
    });

    it("shows search-specific empty message when searchQuery is set", () => {
      renderPanel({ notes: [], searchQuery: "react" });
      expect(screen.getByText(/no notes matching/i)).toBeInTheDocument();
      expect(screen.getByText(/react/i)).toBeInTheDocument();
    });
  });

  describe("notes list rendering", () => {
    it("renders all note titles", () => {
      renderPanel();
      expect(screen.getByText(mockNote.title)).toBeInTheDocument();
      expect(screen.getByText(mockNote2.title)).toBeInTheDocument();
    });

    it("renders the 'My Notes' section heading", () => {
      renderPanel();
      expect(screen.getByText("My Notes")).toBeInTheDocument();
    });

    it("renders the 'Add new note' button", () => {
      renderPanel();
      expect(
        screen.getByRole("button", { name: /add new note/i })
      ).toBeInTheDocument();
    });

    it("renders the search input", () => {
      renderPanel();
      expect(
        screen.getByRole("searchbox", { name: /search notes/i })
      ).toBeInTheDocument();
    });

    it("applies active styling to the currently active note", () => {
      renderPanel({ activeNoteId: mockNote._id });
      // The active note's button has aria-label containing the title
      const activeBtn = screen.getByLabelText(`Select note: ${mockNote.title}`);
      // Its parent container should have the active border class
      expect(activeBtn.closest("[class*='border-l']")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("calls onSelectNote with the correct note when a note is clicked", async () => {
      const onSelectNote = jest.fn();
      renderPanel({ onSelectNote });
      await userEvent.click(
        screen.getByLabelText(`Select note: ${mockNote.title}`)
      );
      expect(onSelectNote).toHaveBeenCalledWith(mockNote);
    });

    it("calls onNewNote when 'Add new note' button is clicked", async () => {
      const onNewNote = jest.fn();
      renderPanel({ onNewNote });
      await userEvent.click(screen.getByRole("button", { name: /add new note/i }));
      expect(onNewNote).toHaveBeenCalledTimes(1);
    });

    it("calls onSearchChange with the typed value", async () => {
      const onSearchChange = jest.fn();
      renderPanel({ onSearchChange });
      const input = screen.getByRole("searchbox", { name: /search notes/i });
      // The input is controlled — the component fires onChange(e.target.value)
      // which in a controlled component sends whatever the current input character is
      await userEvent.type(input, "m");
      expect(onSearchChange).toHaveBeenCalledWith("m");
    });
  });

  describe("three-dot menu", () => {
    it("opens the options menu when the three-dot button is clicked", async () => {
      renderPanel();
      const menuBtn = screen.getByLabelText(
        `Open options for note: ${mockNote.title}`
      );
      await userEvent.click(menuBtn);
      // The delete option appears — check by text since it's a button inside a div
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("closes the menu when clicked a second time", async () => {
      renderPanel();
      const menuBtn = screen.getByLabelText(
        `Open options for note: ${mockNote.title}`
      );
      await userEvent.click(menuBtn);
      await userEvent.click(menuBtn);
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });

    it("opens the DeleteNoteDialog when Delete is clicked in the menu", async () => {
      renderPanel();
      const menuBtn = screen.getByLabelText(
        `Open options for note: ${mockNote.title}`
      );
      await userEvent.click(menuBtn);

      // The menu is now open — find the Delete option by its text content
      const deleteOption = screen.getByRole("menuitem");
      await userEvent.click(deleteOption);

      // Dialog should now be visible
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("calls onDeleteNote after confirming deletion in the dialog", async () => {
      const onDeleteNote = jest.fn().mockResolvedValue(undefined);
      renderPanel({ onDeleteNote });

      const menuBtn = screen.getByLabelText(
        `Open options for note: ${mockNote.title}`
      );
      await userEvent.click(menuBtn);

      // Open delete dialog via the menuitem
      await userEvent.click(screen.getByRole("menuitem"));

      // Confirm deletion in the dialog
      const dialog = screen.getByRole("dialog");
      await userEvent.click(
        within(dialog).getByRole("button", { name: /^delete$/i })
      );

      expect(onDeleteNote).toHaveBeenCalledWith(mockNote);
    });
  });
});
