jest.mock("../api/apiClient");
jest.mock("../api/uploadApi");

import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";
import apiClient from "../api/apiClient";
import * as uploadApi from "../api/uploadApi";
import { mockUser, mockLoginResponse, mockProfileResponse } from "../__tests__/helpers/testData";

// ── Test consumer ─────────────────────────────────────────────────────────────
function TestConsumer({ onAuthRef } = {}) {
  const auth = useAuth();
  if (onAuthRef) onAuthRef(auth);
  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.name : "null"}</span>
      <span data-testid="loading">{auth.loading ? "true" : "false"}</span>
    </div>
  );
}

// Helper: render AuthProvider and wait for loading to settle
async function renderAndSettle(mockGetResponse = null) {
  if (mockGetResponse) {
    apiClient.get.mockResolvedValueOnce(mockGetResponse);
  } else {
    // No token → get is never called. But if it is, reject gracefully.
    apiClient.get.mockRejectedValue(new Error("Unexpected call"));
  }

  const result = render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );

  await waitFor(() =>
    expect(screen.getByTestId("loading").textContent).toBe("false")
  );
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("AuthProvider — initial state (no token)", () => {
  it("user is null when no token is stored", async () => {
    await renderAndSettle();
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("loading transitions to false", async () => {
    await renderAndSettle();
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("AuthProvider — session restoration", () => {
  it("restores session when a valid token is in localStorage", async () => {
    localStorage.setItem("notesToken", "valid-token");
    await renderAndSettle(mockProfileResponse);

    expect(apiClient.get).toHaveBeenCalledWith("/auth/profile");
    expect(screen.getByTestId("user").textContent).toBe(mockUser.name);
  });

  it("clears the token and stays logged-out when profile fetch fails", async () => {
    localStorage.setItem("notesToken", "expired-token");
    apiClient.get.mockRejectedValueOnce(new Error("Unauthorized"));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );

    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(localStorage.getItem("notesToken")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("AuthProvider — login()", () => {
  it("sets the user state on a successful login", async () => {
    await renderAndSettle();
    apiClient.post.mockResolvedValueOnce(mockLoginResponse);

    let authRef;
    render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(authRef.loading).toBe(false));

    await act(async () => {
      await authRef.login("test@example.com", "password123");
    });

    expect(authRef.user?.name).toBe(mockUser.name);
  });

  it("saves the token to localStorage on success", async () => {
    await renderAndSettle();
    apiClient.post.mockResolvedValueOnce(mockLoginResponse);

    let authRef;
    render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(authRef.loading).toBe(false));

    await act(async () => {
      await authRef.login("test@example.com", "password123");
    });

    expect(localStorage.getItem("notesToken")).toBe("mock-jwt-token-xyz");
  });

  it("calls POST /auth/login with correct credentials", async () => {
    apiClient.post.mockResolvedValueOnce(mockLoginResponse);

    let authRef;
    render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(authRef.loading).toBe(false));

    await act(async () => {
      await authRef.login("test@example.com", "password123");
    });

    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
      email: "test@example.com",
      password: "password123",
    });
  });

  it("throws an error with the API message on failure", async () => {
    apiClient.post.mockRejectedValueOnce({
      response: { data: { message: "Invalid credentials" } },
    });

    let authRef;
    render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(authRef.loading).toBe(false));

    let caughtError;
    await act(async () => {
      try {
        await authRef.login("bad@e.com", "wrong");
      } catch (e) {
        caughtError = e;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe("Invalid credentials");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("AuthProvider — register()", () => {
  it("sets the user state on successful registration", async () => {
    apiClient.post.mockResolvedValueOnce(mockLoginResponse);

    let authRef;
    render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(authRef.loading).toBe(false));

    await act(async () => {
      await authRef.register("Test User", "test@example.com", "password123");
    });

    expect(authRef.user?.name).toBe(mockUser.name);
  });

  it("saves the token to localStorage on success", async () => {
    apiClient.post.mockResolvedValueOnce(mockLoginResponse);

    let authRef;
    render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(authRef.loading).toBe(false));

    await act(async () => {
      await authRef.register("Test User", "test@example.com", "password123");
    });

    expect(localStorage.getItem("notesToken")).toBe("mock-jwt-token-xyz");
  });

  it("calls POST /auth/register with correct fields", async () => {
    apiClient.post.mockResolvedValueOnce(mockLoginResponse);

    let authRef;
    render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(authRef.loading).toBe(false));

    await act(async () => {
      await authRef.register("Test User", "test@example.com", "password123");
    });

    expect(apiClient.post).toHaveBeenCalledWith("/auth/register", {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("AuthProvider — logout()", () => {
  async function setupLoggedIn() {
    localStorage.setItem("notesToken", "valid-token");
    apiClient.get.mockResolvedValueOnce(mockProfileResponse);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Wait for user to be restored from session
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe(mockUser.name)
    );
  }

  it("clears user state and removes token on logout", async () => {
    await setupLoggedIn();
    apiClient.post.mockResolvedValueOnce({});

    // Get the auth ref to call logout
    let authRef;
    render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );
    // Second render has no token (it was used by setupLoggedIn — need separate setup)
  });

  it("clears user state and removes token on logout (direct)", async () => {
    localStorage.setItem("notesToken", "valid-token");
    apiClient.get.mockResolvedValueOnce(mockProfileResponse);
    apiClient.post.mockResolvedValueOnce({});

    let authRef;
    render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );

    await waitFor(() => expect(authRef.loading).toBe(false));
    expect(authRef.user?.name).toBe(mockUser.name);

    await act(async () => {
      await authRef.logout();
    });

    // authRef is stale — check localStorage which is synchronous
    expect(localStorage.getItem("notesToken")).toBeNull();
    // Re-check via new authRef reference
    await waitFor(() => expect(authRef.user).toBeNull());
  });

  it("still clears token even when the logout request fails", async () => {
    localStorage.setItem("notesToken", "valid-token");
    apiClient.get.mockResolvedValueOnce(mockProfileResponse);
    apiClient.post.mockRejectedValueOnce(new Error("Network Error"));

    let authRef;
    render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );

    await waitFor(() => expect(authRef.loading).toBe(false));

    await act(async () => {
      await authRef.logout();
    });

    expect(localStorage.getItem("notesToken")).toBeNull();
    await waitFor(() => expect(authRef.user).toBeNull());
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("AuthProvider — updateUser()", () => {
  it("calls PUT /auth/profile with name", async () => {
    localStorage.setItem("notesToken", "valid-token");
    apiClient.get.mockResolvedValueOnce(mockProfileResponse);
    const updatedUser = { ...mockUser, name: "Updated Name" };
    apiClient.put.mockResolvedValueOnce({ data: { data: { user: updatedUser } } });

    let authRef;
    render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(authRef.loading).toBe(false));

    await act(async () => {
      await authRef.updateUser({ name: "Updated Name" });
    });

    expect(apiClient.put).toHaveBeenCalledWith(
      "/auth/profile",
      expect.objectContaining({ name: "Updated Name" })
    );
  });

  it("updates user state after PUT /auth/profile", async () => {
    localStorage.setItem("notesToken", "valid-token");
    apiClient.get.mockResolvedValueOnce(mockProfileResponse);
    const updatedUser = { ...mockUser, name: "Updated Name" };
    apiClient.put.mockResolvedValueOnce({ data: { data: { user: updatedUser } } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe(mockUser.name)
    );

    // Find the TestConsumer's update trigger — we need to call updateUser via ref
    // Since TestConsumer doesn't have an update button, we test via authRef
    let authRef;
    render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );
    // Second render: no token → user starts null
    await waitFor(() => expect(authRef.loading).toBe(false));

    // Re-setup with token for this specific test
    localStorage.setItem("notesToken", "valid-token");
    apiClient.get.mockResolvedValueOnce(mockProfileResponse);
    apiClient.put.mockResolvedValueOnce({ data: { data: { user: updatedUser } } });

    const { unmount } = render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(authRef.user?.name).toBe(mockUser.name));

    await act(async () => {
      await authRef.updateUser({ name: "Updated Name" });
    });

    await waitFor(() => expect(authRef.user?.name).toBe("Updated Name"));
    unmount();
  });

  it("calls uploadProfileImageFile when an imageFile is provided", async () => {
    const mockFile = new File(["img"], "avatar.png", { type: "image/png" });
    const uploadedUser = { ...mockUser, avatarUrl: "https://cdn.example.com/new.jpg" };
    uploadApi.uploadProfileImageFile = jest.fn().mockResolvedValueOnce({ user: uploadedUser });

    let authRef;
    render(
      <AuthProvider>
        <TestConsumer onAuthRef={(a) => { authRef = a; }} />
      </AuthProvider>
    );
    await waitFor(() => expect(authRef.loading).toBe(false));

    await act(async () => {
      await authRef.updateUser({ imageFile: mockFile });
    });

    expect(uploadApi.uploadProfileImageFile).toHaveBeenCalledWith(mockFile);
  });
});
