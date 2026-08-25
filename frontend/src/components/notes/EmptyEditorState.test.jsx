import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmptyEditorState from "./EmptyEditorState";

describe("EmptyEditorState", () => {
  describe("rendering", () => {
    it("renders the instructional heading", () => {
      render(<EmptyEditorState onNewNote={jest.fn()} />);
      expect(
        screen.getByText(/select a note or create a new one/i)
      ).toBeInTheDocument();
    });

    it("renders the supporting description text", () => {
      render(<EmptyEditorState onNewNote={jest.fn()} />);
      expect(screen.getByText(/your note will appear here/i)).toBeInTheDocument();
    });

    it("renders the 'New Note' button", () => {
      render(<EmptyEditorState onNewNote={jest.fn()} />);
      expect(
        screen.getByRole("button", { name: /new note/i })
      ).toBeInTheDocument();
    });

    it("renders the notepad emoji decoration", () => {
      const { container } = render(<EmptyEditorState onNewNote={jest.fn()} />);
      expect(container.textContent).toContain("📝");
    });
  });

  describe("interactions", () => {
    it("calls onNewNote when the 'New Note' button is clicked", async () => {
      const onNewNote = jest.fn();
      render(<EmptyEditorState onNewNote={onNewNote} />);

      await userEvent.click(screen.getByRole("button", { name: /new note/i }));

      expect(onNewNote).toHaveBeenCalledTimes(1);
    });

    it("calls onNewNote only once per click", async () => {
      const onNewNote = jest.fn();
      render(<EmptyEditorState onNewNote={onNewNote} />);

      await userEvent.click(screen.getByRole("button", { name: /new note/i }));
      await userEvent.click(screen.getByRole("button", { name: /new note/i }));

      expect(onNewNote).toHaveBeenCalledTimes(2);
    });
  });

  describe("accessibility", () => {
    it("the New Note button is focusable", () => {
      render(<EmptyEditorState onNewNote={jest.fn()} />);
      const btn = screen.getByRole("button", { name: /new note/i });
      btn.focus();
      expect(btn).toHaveFocus();
    });
  });
});
