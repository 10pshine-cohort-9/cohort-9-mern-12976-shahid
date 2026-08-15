import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Trash2 } from "lucide-react";
import Button from "../common/Button";

export default function DeleteNoteDialog({
  note,
  onConfirm,
  onCancel,
  deleting,
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Keep refs for handlers so the keydown listener doesn't need to re-register
  const onCancelRef = useRef(onCancel);
  const deletingRef = useRef(deleting);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    deletingRef.current = deleting;
  }, [deleting]);

  // Effect: focus management only
  useEffect(() => {
    if (!note) return;

    previousFocusRef.current = document.activeElement;

    if (dialogRef.current) {
      const firstFocusable = dialogRef.current.querySelector("button");
      if (firstFocusable) firstFocusable.focus();
    }

    return () => {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [note]);

  // Effect: keydown handling (trap focus + Escape) uses refs to avoid rebinds
  useEffect(() => {
    if (!note) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (deletingRef.current) return; // prevent closing while deleting
        onCancelRef.current?.();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [note]);

  if (!note) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 max-w-sm w-full p-6 transition-colors"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h2
            id="delete-dialog-title"
            className="text-base font-semibold text-gray-900 dark:text-white"
          >
            Delete note?
          </h2>
        </div>
        <p
          id="delete-dialog-desc"
          className="text-sm text-gray-600 dark:text-gray-400 mb-6 pl-13"
        >
          Are you sure you want to delete{" "}
          <strong className="text-gray-800 dark:text-gray-200">
            "{note.title}"
          </strong>
          ? This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

DeleteNoteDialog.propTypes = {
  note: PropTypes.object,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  deleting: PropTypes.bool,
};
