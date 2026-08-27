import { Plus } from "lucide-react";
import PropTypes from "prop-types";

export default function EmptyEditorState({ onNewNote }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-center px-8 transition-colors">
      <div className="text-5xl mb-4 select-none">📝</div>
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
        Select a note or create a new one
      </h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">
        Your note will appear here
      </p>
      <button
        type="button"
        onClick={onNewNote}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        New Note
      </button>
    </div>
  );
}

EmptyEditorState.propTypes = {
  onNewNote: PropTypes.func.isRequired,
};
