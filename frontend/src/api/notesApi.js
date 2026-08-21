import apiClient from "./apiClient";

function unwrap(response, key) {
  return response.data?.data?.[key] ?? response.data?.[key] ?? response.data;
}

export async function getNotes(search = "", signal) {
  const response = await apiClient.get("/notes", {
    params: search.trim() ? { search: search.trim() } : {},
    signal,
  });

  return unwrap(response, "notes");
}

export async function getNote(id) {
  const response = await apiClient.get(`/notes/${id}`);
  return unwrap(response, "note");
}

export async function createNote(note) {
  const response = await apiClient.post("/notes", note);
  return unwrap(response, "note");
}

export async function updateNote(id, note) {
  const response = await apiClient.put(`/notes/${id}`, note);
  return unwrap(response, "note");
}

export function deleteNote(id) {
  return apiClient.delete(`/notes/${id}`);
}
