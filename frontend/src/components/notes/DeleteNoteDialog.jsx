import { Trash2 } from 'lucide-react';
import Button from '../common/Button';

export default function DeleteNoteDialog({ note, onConfirm, onCancel, deleting }) {
  if (!note) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 max-w-sm w-full p-6 transition-colors">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Delete note?
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 pl-13">
          Are you sure you want to delete{' '}
          <strong className="text-gray-800 dark:text-gray-200">"{note.title}"</strong>?
          This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
