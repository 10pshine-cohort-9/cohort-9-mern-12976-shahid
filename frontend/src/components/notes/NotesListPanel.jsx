import { useState } from "react";
import { Search, Plus, MoreVertical, Trash2 } from "lucide-react";
import { formatDate } from "../../utils/formatDate";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import DeleteNoteDialog from "./DeleteNoteDialog";
import Loader from "../common/Loader";
import PropTypes from "prop-types";
import { noteShape } from "../../utils/propTypes";

// Strip HTML and truncate to a short preview string
function getPreview(html) {
  const sanitized = sanitizeHtml(html);

  let strippedHtml = "";
  let insideTag = false;

  // Modern ES6 for-of loop (fixes the SonarQube code smell)
  for (const char of sanitized) {
    if (char === "<") {
      insideTag = true;
      strippedHtml += " ";
    } else if (char === ">" && insideTag) {
      insideTag = false;
    } else if (!insideTag) {
      strippedHtml += char;
    }
  }

  const clean = strippedHtml.replace(/\s+/g, " ").trim();

  return clean.length > 110 ? clean.slice(0, 110) + "…" : clean;
}
export default function NotesListPanel({
  notes,
  loading,
  error,
  searchQuery,
  onSearchChange,
  activeNoteId,
  onSelectNote,
  onNewNote,
  onDeleteNote,
}) {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function toggleMenu(e, id) {
    e.stopPropagation();
    setMenuOpenId((prev) => (prev === id ? null : id));
  }

  function openDeleteDialog(e, note) {
    e.stopPropagation();
    setMenuOpenId(null);
    setNoteToDelete(note);
  }

  async function confirmDelete() {
    if (!noteToDelete) return;
    setDeleting(true);
    try {
      await onDeleteNote(noteToDelete);
    } finally {
      setDeleting(false);
      setNoteToDelete(null);
    }
  }

  return (
    <section
      aria-label="Notes list"
      className="flex h-full w-screen flex-shrink-0 flex-col bg-white transition-colors dark:bg-gray-900 md:w-80 md:border-r md:border-gray-100 md:dark:border-gray-800"
    >
      {/* Header */}
      <div className="border-b border-gray-100 px-4 pb-3 pt-4 dark:border-gray-800 md:pt-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
          My Notes
        </h2>

        {/* Search */}
        <div className="relative mb-3">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes..."
            aria-label="Search notes"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-colors"
          />
        </div>

        {/* Add new note button */}
        <button
          type="button"
          onClick={onNewNote}
          aria-label="Add new note"
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:cursor-pointer
          "
        >
          <Plus className="w-4 h-4" />
          Add new note
        </button>
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="py-8">
            <Loader message="Loading notes..." />
          </div>
        )}

        {!loading && error && (
          <p className="px-4 py-6 text-sm text-red-500 dark:text-red-400">
            {error}
          </p>
        )}

        {!loading && !error && notes.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {searchQuery
                ? `No notes matching "${searchQuery}"`
                : "No notes yet. Create your first one!"}
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          notes.map((note) => {
            const isActive = note._id === activeNoteId;
            const preview = getPreview(note.content).slice(0, 50);         

            return (
              <div
                key={note._id}
                className={`relative border-b border-gray-50 dark:border-gray-800 group transition-colors ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-l-indigo-500"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                }`}
              >
                {/* Accessible Note Selection Button */}
                <button
                  type="button"
                  onClick={() => onSelectNote(note)}
                  className="w-full text-left px-4 py-3.5 block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500/50"
                  aria-label={`Select note: ${note.title}`}
                >
                  {/* Date */}
                  <span className="block text-xs text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wide">
                    {formatDate(note.updatedAt)}
                  </span>

                  {/* Title */}
                  <span
                    className={`block text-sm font-semibold mb-1 line-clamp-1 ${
                      isActive
                        ? "text-indigo-800 dark:text-indigo-300"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {note.title}
                  </span>

                  {/* Preview */}
                  <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {preview || "No content"}
                  </span>
                </button>

                {/* Three-dot menu (Sibling, not nested) */}
                <button
                  type="button"
                  onClick={(e) => toggleMenu(e, note._id)}
                  aria-expanded={menuOpenId === note._id}
                  aria-haspopup="true"
                  className="absolute right-3 top-3 rounded p-1 text-gray-400 transition-opacity hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 hover:cursor-pointer"
                  aria-label={`Open options for note: ${note.title}`}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {menuOpenId === note._id && (
                  <div
                    role="menu"
                    tabIndex={0}
                    aria-label={`Options for ${note.title}`}
                    className="absolute right-3 top-8 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md py-1 w-36"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => openDeleteDialog(e, note)}
                      className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 hover:cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <DeleteNoteDialog
        note={noteToDelete}
        onConfirm={confirmDelete}
        onCancel={() => setNoteToDelete(null)}
        deleting={deleting}
      />
    </section>
  );
}

NotesListPanel.propTypes = {
  notes: PropTypes.arrayOf(noteShape).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string.isRequired,
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  activeNoteId: PropTypes.string,
  onSelectNote: PropTypes.func.isRequired,
  onNewNote: PropTypes.func.isRequired,
  onDeleteNote: PropTypes.func.isRequired,
};
