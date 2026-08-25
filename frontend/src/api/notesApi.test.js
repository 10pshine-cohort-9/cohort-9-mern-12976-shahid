// Mock the axios instance BEFORE importing anything that uses it
jest.mock("../api/apiClient");

import apiClient from "../api/apiClient";
import {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
} from "./notesApi";

// Helpers to build the two response shapes the backend can return
const wrapNotes = (notes) => ({ data: { data: { notes } } });
const wrapNote = (note) => ({ data: { data: { note } } });
const wrapFlat = (data) => ({ data });

const MOCK_NOTE = {
  _id: "note-1",
  title: "Test Note",
  content: "<p>Hello</p>",
  userId: "user-1",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
};

const MOCK_NOTES = [MOCK_NOTE, { ...MOCK_NOTE, _id: "note-2", title: "Second" }];

// ─────────────────────────────────────────────────────────────────────────────

describe("getNotes", () => {
  it("calls GET /notes with no params when search is empty", async () => {
    apiClient.get.mockResolvedValueOnce(wrapNotes(MOCK_NOTES));
    await getNotes("");
    expect(apiClient.get).toHaveBeenCalledWith("/notes", expect.objectContaining({ params: {} }));
  });

  it("calls GET /notes with search param when query is provided", async () => {
    apiClient.get.mockResolvedValueOnce(wrapNotes(MOCK_NOTES));
    await getNotes("hello");
    expect(apiClient.get).toHaveBeenCalledWith(
      "/notes",
      expect.objectContaining({ params: { search: "hello" } })
    );
  });

  it("trims whitespace from search query", async () => {
    apiClient.get.mockResolvedValueOnce(wrapNotes(MOCK_NOTES));
    await getNotes("  trimmed  ");
    expect(apiClient.get).toHaveBeenCalledWith(
      "/notes",
      expect.objectContaining({ params: { search: "trimmed" } })
    );
  });

  it("treats a whitespace-only query as empty (no search param)", async () => {
    apiClient.get.mockResolvedValueOnce(wrapNotes(MOCK_NOTES));
    await getNotes("   ");
    expect(apiClient.get).toHaveBeenCalledWith(
      "/notes",
      expect.objectContaining({ params: {} })
    );
  });

  it("returns the notes array from the nested data shape", async () => {
    apiClient.get.mockResolvedValueOnce(wrapNotes(MOCK_NOTES));
    const result = await getNotes();
    expect(result).toEqual(MOCK_NOTES);
  });

  it("returns the notes array from a flat data shape", async () => {
    apiClient.get.mockResolvedValueOnce(wrapFlat({ notes: MOCK_NOTES }));
    const result = await getNotes();
    expect(result).toEqual(MOCK_NOTES);
  });

  it("passes an AbortSignal when provided", async () => {
    apiClient.get.mockResolvedValueOnce(wrapNotes(MOCK_NOTES));
    const controller = new AbortController();
    await getNotes("", controller.signal);
    expect(apiClient.get).toHaveBeenCalledWith(
      "/notes",
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it("throws a normalized error when the request fails", async () => {
    const axiosError = {
      response: { data: { message: "Unauthorized" }, status: 401 },
      message: "Request failed with status 401",
    };
    apiClient.get.mockRejectedValueOnce(axiosError);
    await expect(getNotes()).rejects.toThrow("Unauthorized");
  });

  it("throws with fallback message when error has no response message", async () => {
    apiClient.get.mockRejectedValueOnce(new Error("Network Error"));
    await expect(getNotes()).rejects.toThrow("Network Error");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("getNote", () => {
  it("calls GET /notes/:id with the correct id", async () => {
    apiClient.get.mockResolvedValueOnce(wrapNote(MOCK_NOTE));
    await getNote("note-1");
    expect(apiClient.get).toHaveBeenCalledWith("/notes/note-1");
  });

  it("returns the note object from the nested data shape", async () => {
    apiClient.get.mockResolvedValueOnce(wrapNote(MOCK_NOTE));
    const result = await getNote("note-1");
    expect(result).toEqual(MOCK_NOTE);
  });

  it("returns the note from a flat data shape", async () => {
    apiClient.get.mockResolvedValueOnce(wrapFlat({ note: MOCK_NOTE }));
    const result = await getNote("note-1");
    expect(result).toEqual(MOCK_NOTE);
  });

  it("throws a normalized error when the request fails", async () => {
    apiClient.get.mockRejectedValueOnce({
      response: { data: { message: "Note not found" }, status: 404 },
    });
    await expect(getNote("bad-id")).rejects.toThrow("Note not found");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("createNote", () => {
  const payload = { title: "New Note", content: "<p>Content</p>" };

  it("calls POST /notes with the note payload", async () => {
    apiClient.post.mockResolvedValueOnce(wrapNote(MOCK_NOTE));
    await createNote(payload);
    expect(apiClient.post).toHaveBeenCalledWith("/notes", payload);
  });

  it("returns the created note", async () => {
    apiClient.post.mockResolvedValueOnce(wrapNote(MOCK_NOTE));
    const result = await createNote(payload);
    expect(result).toEqual(MOCK_NOTE);
  });

  it("throws a normalized error on failure", async () => {
    apiClient.post.mockRejectedValueOnce({
      response: { data: { message: "Validation failed" }, status: 422 },
    });
    await expect(createNote(payload)).rejects.toThrow("Validation failed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("updateNote", () => {
  const payload = { title: "Updated", content: "<p>Updated content</p>" };
  const updatedNote = { ...MOCK_NOTE, ...payload };

  it("calls PUT /notes/:id with the correct id and payload", async () => {
    apiClient.put.mockResolvedValueOnce(wrapNote(updatedNote));
    await updateNote("note-1", payload);
    expect(apiClient.put).toHaveBeenCalledWith("/notes/note-1", payload);
  });

  it("returns the updated note", async () => {
    apiClient.put.mockResolvedValueOnce(wrapNote(updatedNote));
    const result = await updateNote("note-1", payload);
    expect(result).toEqual(updatedNote);
  });

  it("throws a normalized error on failure", async () => {
    apiClient.put.mockRejectedValueOnce({
      response: { data: { message: "Not found" }, status: 404 },
    });
    await expect(updateNote("bad-id", payload)).rejects.toThrow("Not found");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("deleteNote", () => {
  it("calls DELETE /notes/:id with the correct id", async () => {
    apiClient.delete.mockResolvedValueOnce({ data: {} });
    await deleteNote("note-1");
    expect(apiClient.delete).toHaveBeenCalledWith("/notes/note-1");
  });

  it("returns the raw axios response", async () => {
    const response = { data: { success: true } };
    apiClient.delete.mockResolvedValueOnce(response);
    const result = await deleteNote("note-1");
    expect(result).toEqual(response);
  });
});
