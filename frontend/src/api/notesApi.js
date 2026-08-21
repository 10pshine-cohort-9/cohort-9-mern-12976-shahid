import apiClient from "./apiClient";
import { normalizeApiError } from "../utils/errorUtils";

/** @typedef {{ _id: string, title: string, content: string, userId?: string, createdAt?: string, updatedAt?: string }} Note */
/** @typedef {{ title: string, content: string }} NotePayload */
/** @typedef {{ data?: Record<string, unknown>, notes?: Note[], note?: Note }} NotesApiResponse */

/**
 * @param {{ data: NotesApiResponse }} response
 * @param {"notes"|"note"} key
 * @returns {Note[]|Note|NotesApiResponse}
 */
function unwrap(response, key) {
  return response.data?.data?.[key] ?? response.data?.[key] ?? response.data;
}

/** @param {string} [search] @param {AbortSignal} [signal] @returns {Promise<Note[]>} */
export async function getNotes(search = "", signal) {
  try {
    const response = await apiClient.get("/notes", {
      params: search.trim() ? { search: search.trim() } : {},
      signal,
    });

    return unwrap(response, "notes");
  } catch (error) {
    throw normalizeApiError(error, "Could not load notes.");
  }
}

/** @param {string} id @returns {Promise<Note>} */
export async function getNote(id) {
  try {
    const response = await apiClient.get(`/notes/${id}`);
    return unwrap(response, "note");
  } catch (error) {
    throw normalizeApiError(error, "Could not load note.");
  }
}

/** @param {NotePayload} note @returns {Promise<Note>} */
export async function createNote(note) {
  try {
    const response = await apiClient.post("/notes", note);
    return unwrap(response, "note");
  } catch (error) {
    throw normalizeApiError(error, "Could not create note.");
  }
}

/** @param {string} id @param {NotePayload} note @returns {Promise<Note>} */
export async function updateNote(id, note) {
  try {
    const response = await apiClient.put(`/notes/${id}`, note);
    return unwrap(response, "note");
  } catch (error) {
    throw normalizeApiError(error, "Could not update note.");
  }
}

/** @param {string} id */
export function deleteNote(id) {
  return apiClient.delete(`/notes/${id}`);
}
