import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import RegisterPage from "./RegisterPage";
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

const guestAuth = {
  user: null,
  loading: false,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
};

function renderRegisterPage(authValue) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={
            <AuthContext.Provider value={authValue}>
              <RegisterPage />
            </AuthContext.Provider>
          } />
          <Route path="/notes" element={<div>Notes Page</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("RegisterPage", () => {
  describe("rendering", () => {
    it("renders the name input", () => {
      renderRegisterPage(guestAuth);
      expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    });

    it("renders the email input", () => {
      renderRegisterPage(guestAuth);
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    });

    it("renders the password input", () => {
      renderRegisterPage(guestAuth);
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });

    it("renders the 'Create account' submit button", () => {
      renderRegisterPage(guestAuth);
      expect(
        screen.getByRole("button", { name: /create account/i })
      ).toBeInTheDocument();
    });

    it("renders a link to the login page", () => {
      renderRegisterPage(guestAuth);
      expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    });
  });

  describe("redirect when already authenticated", () => {
    it("redirects to /notes when user is already logged in", () => {
      renderRegisterPage({ ...guestAuth, user: mockUser });
      expect(screen.getByText("Notes Page")).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows an error when all fields are empty on submit", async () => {
      renderRegisterPage(guestAuth);
      await userEvent.click(
        screen.getByRole("button", { name: /create account/i })
      );
      expect(screen.getByRole("alert")).toHaveTextContent(/fill in all fields/i);
    });

    it("shows an error when name is empty", async () => {
      renderRegisterPage(guestAuth);
      await userEvent.type(screen.getByLabelText(/^email$/i), "a@b.com");
      await userEvent.type(screen.getByLabelText(/^password$/i), "pass123");
      await userEvent.click(
        screen.getByRole("button", { name: /create account/i })
      );
      expect(screen.getByRole("alert")).toHaveTextContent(/fill in all fields/i);
    });

    it("calls toast.error for validation failures", async () => {
      renderRegisterPage(guestAuth);
      await userEvent.click(
        screen.getByRole("button", { name: /create account/i })
      );
      expect(toast.error).toHaveBeenCalledWith("Please fill in all fields");
    });
  });

  describe("successful registration", () => {
    it("calls register() with name, email, and password", async () => {
      const register = jest.fn().mockResolvedValue(mockUser);
      renderRegisterPage({ ...guestAuth, register });

      await userEvent.type(screen.getByLabelText(/^name$/i), "Jane Doe");
      await userEvent.type(screen.getByLabelText(/^email$/i), "jane@test.com");
      await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
      await userEvent.click(
        screen.getByRole("button", { name: /create account/i })
      );

      await waitFor(() =>
        expect(register).toHaveBeenCalledWith("Jane Doe", "jane@test.com", "secret123")
      );
    });

    it("navigates to /notes after successful registration", async () => {
      const register = jest.fn().mockResolvedValue(mockUser);
      renderRegisterPage({ ...guestAuth, register });

      await userEvent.type(screen.getByLabelText(/^name$/i), "Jane Doe");
      await userEvent.type(screen.getByLabelText(/^email$/i), "jane@test.com");
      await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
      await userEvent.click(
        screen.getByRole("button", { name: /create account/i })
      );

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/notes"));
    });

    it("calls toast.success after successful registration", async () => {
      const register = jest.fn().mockResolvedValue(mockUser);
      renderRegisterPage({ ...guestAuth, register });

      await userEvent.type(screen.getByLabelText(/^name$/i), "Jane Doe");
      await userEvent.type(screen.getByLabelText(/^email$/i), "jane@test.com");
      await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
      await userEvent.click(
        screen.getByRole("button", { name: /create account/i })
      );

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Account created successfully")
      );
    });

    it("trims name and email whitespace before calling register()", async () => {
      const register = jest.fn().mockResolvedValue(mockUser);
      renderRegisterPage({ ...guestAuth, register });

      await userEvent.type(screen.getByLabelText(/^name$/i), "  Jane  ");
      await userEvent.type(screen.getByLabelText(/^email$/i), "  jane@test.com  ");
      await userEvent.type(screen.getByLabelText(/^password$/i), "secret123");
      await userEvent.click(
        screen.getByRole("button", { name: /create account/i })
      );

      await waitFor(() =>
        expect(register).toHaveBeenCalledWith("Jane", "jane@test.com", "secret123")
      );
    });
  });

  describe("failed registration", () => {
    it("displays the API error message in the alert", async () => {
      const register = jest.fn().mockRejectedValue({
        response: { data: { message: "Email already in use" } },
        cause: { response: { data: { message: "Email already in use" } } },
      });
      renderRegisterPage({ ...guestAuth, register });

      await userEvent.type(screen.getByLabelText(/^name$/i), "Jane");
      await userEvent.type(screen.getByLabelText(/^email$/i), "taken@test.com");
      await userEvent.type(screen.getByLabelText(/^password$/i), "pass123");
      await userEvent.click(
        screen.getByRole("button", { name: /create account/i })
      );

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent("Email already in use")
      );
    });
  });
});
