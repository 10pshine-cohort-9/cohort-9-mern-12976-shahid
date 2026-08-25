import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeleteNoteDialog from "./DeleteNoteDialog";
import { mockNote } from "../../__tests__/helpers/testData";

const defaultProps = {
  note: mockNote,
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
  deleting: false,
};

describe("DeleteNoteDialog", () => {
  describe("when note is null", () => {
    it("renders nothing when note prop is null", () => {
      const { container } = render(
        <DeleteNoteDialog
          note={null}
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
          deleting={false}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("rendering with a note", () => {
    it("renders a dialog with role='dialog'", () => {
      render(<DeleteNoteDialog {...defaultProps} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("shows the note title in the dialog body", () => {
      render(<DeleteNoteDialog {...defaultProps} />);
      expect(screen.getByText(`"${mockNote.title}"`)).toBeInTheDocument();
    });

    it("shows the 'Delete note?' heading", () => {
      render(<DeleteNoteDialog {...defaultProps} />);
      expect(screen.getByText(/delete note\?/i)).toBeInTheDocument();
    });

    it("renders a Cancel button", () => {
      render(<DeleteNoteDialog {...defaultProps} />);
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("renders a Delete button", () => {
      render(<DeleteNoteDialog {...defaultProps} />);
      expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
    });

    it("has aria-modal='true' on the dialog element", () => {
      render(<DeleteNoteDialog {...defaultProps} />);
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });
  });

  describe("button interactions", () => {
    it("calls onCancel when Cancel button is clicked", async () => {
      const onCancel = jest.fn();
      render(<DeleteNoteDialog {...defaultProps} onCancel={onCancel} />);
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("calls onConfirm when Delete button is clicked", async () => {
      const onConfirm = jest.fn();
      render(<DeleteNoteDialog {...defaultProps} onConfirm={onConfirm} />);
      await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleting state", () => {
    it("disables both buttons when deleting is true", () => {
      render(<DeleteNoteDialog {...defaultProps} deleting={true} />);
      expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /deleting/i })).toBeDisabled();
    });

    it("shows 'Deleting…' text on the Delete button while deleting", () => {
      render(<DeleteNoteDialog {...defaultProps} deleting={true} />);
      expect(screen.getByRole("button", { name: /deleting/i })).toBeInTheDocument();
    });

    it("shows 'Delete' text when not deleting", () => {
      render(<DeleteNoteDialog {...defaultProps} deleting={false} />);
      expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
    });
  });

  describe("keyboard interactions", () => {
    it("calls onCancel when Escape key is pressed", () => {
      const onCancel = jest.fn();
      render(<DeleteNoteDialog {...defaultProps} onCancel={onCancel} />);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("does NOT call onCancel on Escape when deleting is true", () => {
      const onCancel = jest.fn();
      render(
        <DeleteNoteDialog {...defaultProps} onCancel={onCancel} deleting={true} />
      );
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onCancel).not.toHaveBeenCalled();
    });

    it("does not call onCancel for other keys", () => {
      const onCancel = jest.fn();
      render(<DeleteNoteDialog {...defaultProps} onCancel={onCancel} />);
      fireEvent.keyDown(document, { key: "Enter" });
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe("focus management", () => {
    it("moves focus into the dialog when it opens", () => {
      render(<DeleteNoteDialog {...defaultProps} />);
      // First focusable element (Cancel button) should receive focus
      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      expect(document.activeElement).toBe(cancelBtn);
    });
  });
});
