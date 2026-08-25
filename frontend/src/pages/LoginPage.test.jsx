import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import LoginPage from "./LoginPage";
import { mockUser } from "../__tests__/helpers/testData";

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

import toast from "react-hot-toast";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

function renderLoginPage(authValue) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={
            <AuthContext.Provider value={authValue}>
              <LoginPage />
            </AuthContext.Provider>
          } />
          <Route path="/notes" element={<div>Notes Page</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
}

const guestAuth = {
  user: null,
  loading: false,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
};

describe("LoginPage", () => {
  describe("rendering", () => {
    it("renders the email input", () => {
      renderLoginPage(guestAuth);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it("renders the password input", () => {
      renderLoginPage(guestAuth);
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it("renders the Sign in submit button", () => {
      renderLoginPage(guestAuth);
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("renders a link to the register page", () => {
      renderLoginPage(guestAuth);
      expect(screen.getByRole("link", { name: /create one/i })).toBeInTheDocument();
    });
  });

  describe("redirect when already authenticated", () => {
    it("redirects to /notes when user is already logged in", () => {
      renderLoginPage({ ...guestAuth, user: mockUser });
      expect(screen.getByText("Notes Page")).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows an error when email is empty on submit", async () => {
      renderLoginPage(guestAuth);
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
      expect(screen.getByRole("alert")).toHaveTextContent(/fill in all fields/i);
    });

    it("shows an error when password is empty on submit", async () => {
      renderLoginPage(guestAuth);
      await userEvent.type(screen.getByLabelText(/email/i), "test@test.com");
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
      expect(screen.getByRole("alert")).toHaveTextContent(/fill in all fields/i);
    });

    it("calls toast.error for validation failures", async () => {
      renderLoginPage(guestAuth);
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
      expect(toast.error).toHaveBeenCalledWith("Please fill in all fields");
    });
  });

  describe("successful login", () => {
    it("calls login() with the typed email and password", async () => {
      const login = jest.fn().mockResolvedValue(mockUser);
      renderLoginPage({ ...guestAuth, login });

      await userEvent.type(screen.getByLabelText(/email/i), "user@test.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() =>
        expect(login).toHaveBeenCalledWith("user@test.com", "password123")
      );
    });

    it("navigates to /notes after a successful login", async () => {
      const login = jest.fn().mockResolvedValue(mockUser);
      renderLoginPage({ ...guestAuth, login });

      await userEvent.type(screen.getByLabelText(/email/i), "user@test.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/notes"));
    });

    it("calls toast.success after a successful login", async () => {
      const login = jest.fn().mockResolvedValue(mockUser);
      renderLoginPage({ ...guestAuth, login });

      await userEvent.type(screen.getByLabelText(/email/i), "user@test.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Signed in successfully")
      );
    });
  });

  describe("failed login", () => {
    it("displays the API error message in the alert", async () => {
      const login = jest.fn().mockRejectedValue({
        response: { data: { message: "Invalid credentials" } },
      });
      renderLoginPage({ ...guestAuth, login });

      await userEvent.type(screen.getByLabelText(/email/i), "bad@test.com");
      await userEvent.type(screen.getByLabelText(/password/i), "wrong");
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials")
      );
    });

    it("shows fallback error message when API response has no message", async () => {
      const login = jest.fn().mockRejectedValue(new Error("Network Error"));
      renderLoginPage({ ...guestAuth, login });

      await userEvent.type(screen.getByLabelText(/email/i), "bad@test.com");
      await userEvent.type(screen.getByLabelText(/password/i), "wrong");
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(/login failed/i)
      );
    });
  });

  describe("loading state", () => {
    it("disables the submit button while logging in", async () => {
      // Never resolves — keeps loading state active
      const login = jest.fn().mockReturnValue(new Promise(() => {}));
      renderLoginPage({ ...guestAuth, login });

      await userEvent.type(screen.getByLabelText(/email/i), "user@test.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    });
  });
});
