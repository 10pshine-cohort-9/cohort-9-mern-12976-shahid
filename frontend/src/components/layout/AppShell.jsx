import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FileText, Plus, User } from "lucide-react";
import apiClient from "../../api/apiClient";
import Sidebar from "./Sidebar";
import Loader from "../common/Loader";
import NotesListPanel from "../notes/NotesListPanel";
import NoteEditorPanel from "../notes/NoteEditorPanel";
import EmptyEditorState from "../notes/EmptyEditorState";

export default function AppShell() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [activeNote, setActiveNote] = useState(null);
  const [loadingNote, setLoadingNote] = useState(false);
  const abortControllerRef = useRef(null);

  const loadNotes = useCallback(async (search = "") => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingNotes(true);
    setFetchError("");

    try {
      const params = search.trim() ? { search: search.trim() } : {};
      const res = await apiClient.get("/notes", {
        params,
        signal: controller.signal,
      });
      const notes = res.data?.data?.notes ?? res.data?.notes ?? [];
      setNotes(notes);
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
        return;
      }
      setFetchError(err.response?.data?.message || "Could not load notes.");
    } finally {
      if (abortControllerRef.current === controller) {
        setLoadingNotes(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadNotes(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery, loadNotes]);

  useEffect(() => {
    if (!activeNoteId || activeNoteId === "new") {
      return;
    }
    let isCancelled = false;

    apiClient
      .get(`/notes/${activeNoteId}`)
      .then((res) => {
        if (isCancelled) {
          return;
        }
        // Support both { data: { note } } and { note } response shapes
        const note = res.data?.data?.note ?? res.data?.note ?? res.data;
        setActiveNote(note);
      })
      .catch((err) => {
        if (isCancelled) {
          return;
        }
        setActiveNoteId(null);
        setActiveNote(null);
        toast.error(err.response?.data?.message || "Could not load that note.");
      })
      .finally(() => {
        if (!isCancelled) {
          setLoadingNote(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeNoteId]);

  function handleSelectNote(note) {
    setActiveNote(null);
    setLoadingNote(true);
    setActiveNoteId(note._id);
  }

  function handleNewNote() {
    setActiveNoteId("new");
    setActiveNote(null);
    setLoadingNote(false);
  }

  function mergeSavedContent(noteFromApi, fallbackFields) {
    return {
      ...fallbackFields,
      ...noteFromApi,
    };
  }

  async function handleSaveNote({ title, content }) {
    if (activeNoteId === "new") {
      const res = await apiClient.post("/notes", { title, content });
      // Support both { data: { note } } and { note } response shapes
      const created = mergeSavedContent(
        res.data?.data?.note ?? res.data?.note ?? res.data,
        { title, content },
      );
      setNotes((prev) => [created, ...prev]);
      setActiveNoteId(created._id);
      setActiveNote(created);
      return;
    }

    const res = await apiClient.put(`/notes/${activeNoteId}`, {
      title,
      content,
    });
    // Support both { data: { note } } and { note } response shapes
    const updated = mergeSavedContent(
      res.data?.data?.note ?? res.data?.note ?? res.data,
      {
        ...(activeNote || {}),
        title,
        content,
      },
    );
    setNotes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
    setActiveNote(updated);
  }

  async function handleDeleteNote(note) {
    try {
      await apiClient.delete(`/notes/${note._id}`);
      setNotes((prev) => prev.filter((n) => n._id !== note._id));
      if (activeNoteId === note._id) {
        setActiveNoteId(null);
        setActiveNote(null);
      }
      toast.success("Note deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete note.");
      throw err;
    }
  }

  const isNewNote = activeNoteId === "new";
  const showEditor = activeNoteId !== null;
  const isExistingNoteLoading = showEditor && !isNewNote && loadingNote;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors lg:h-screen lg:flex-row">
      <header className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 lg:hidden">
        <button
          type="button"
          onClick={() => {
            setActiveNoteId(null);
            setActiveNote(null);
          }}
          className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <span>{showEditor ? "Back to Notes" : "Notes App"}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewNote}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Note</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <Sidebar onNewNote={handleNewNote} />

        {/* Notes list */}
        <div
          className={`${showEditor ? "hidden md:flex" : "flex"} min-h-0 flex-shrink-0`}
        >
          <NotesListPanel
            notes={notes}
            loading={loadingNotes}
            error={fetchError}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeNoteId={activeNoteId}
            onSelectNote={handleSelectNote}
            onNewNote={handleNewNote}
            onDeleteNote={handleDeleteNote}
          />
        </div>

        {/* Editor or empty state */}
        <main
          className={`${showEditor ? "flex" : "hidden md:flex"} min-h-0 flex-1 flex-col overflow-hidden`}
        >
          {showEditor ? (
            isExistingNoteLoading ? (
              <div className="flex flex-1 items-center justify-center bg-white dark:bg-gray-900 transition-colors">
                <Loader message="Loading note..." />
              </div>
            ) : (
              <NoteEditorPanel
                key={activeNoteId}
                note={isNewNote ? null : activeNote}
                onSave={handleSaveNote}
                onDelete={handleDeleteNote}
                onDiscard={() => {
                  setActiveNoteId(null);
                  setActiveNote(null);
                }}
              />
            )
          ) : (
            <EmptyEditorState onNewNote={handleNewNote} />
          )}
        </main>
      </div>
    </div>
  );
}
