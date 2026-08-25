// ─────────────────────────────────────────────────────────────────────────────
// Shared test fixtures — import these in any test that needs mock data.
// Shapes match the actual backend response structure.
// ─────────────────────────────────────────────────────────────────────────────

export const mockUser = {
  _id: "user-abc-123",
  name: "Test User",
  email: "test@example.com",
  avatarUrl: "",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

export const mockUserWithAvatar = {
  ...mockUser,
  avatarUrl: "https://example.com/avatar.jpg",
};

export const mockNote = {
  _id: "note-abc-001",
  title: "My Test Note",
  content: "<p>Hello <strong>World</strong></p>",
  userId: "user-abc-123",
  createdAt: "2025-01-15T10:00:00.000Z",
  updatedAt: "2025-01-20T15:30:00.000Z",
};

export const mockNote2 = {
  _id: "note-abc-002",
  title: "Second Note",
  content: "<p>Another note with some content</p>",
  userId: "user-abc-123",
  createdAt: "2025-01-16T10:00:00.000Z",
  updatedAt: "2025-01-21T09:00:00.000Z",
};

export const mockNotesList = [mockNote, mockNote2];

// ── API response shapes (match backend controllers) ───────────────────────────

export const mockLoginResponse = {
  data: {
    data: {
      token: "mock-jwt-token-xyz",
      user: mockUser,
    },
  },
};

export const mockProfileResponse = {
  data: {
    data: {
      user: mockUser,
    },
  },
};

export const mockNotesListResponse = {
  data: {
    data: {
      notes: mockNotesList,
    },
  },
};

export const mockNoteResponse = {
  data: {
    data: {
      note: mockNote,
    },
  },
};

export const mockApiError = (message = "Something went wrong", status = 400) => ({
  response: {
    status,
    data: { message },
  },
  message,
});
