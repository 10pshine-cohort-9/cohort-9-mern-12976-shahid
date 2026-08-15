import apiClient from "./apiClient";

async function uploadImage(endpoint, file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await apiClient.post(endpoint, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data?.data ?? response.data;
}

export function uploadProfileImageFile(file) {
  return uploadImage("/upload/profile", file);
}

export function uploadNoteImageFile(file) {
  return uploadImage("/upload/note-image", file);
}
