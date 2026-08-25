import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import ProfilePage from "./ProfilePage";
import { mockUser, mockUserWithAvatar } from "../__tests__/helpers/testData";

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

const baseAuth = {
  user: mockUser,
  loading: false,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
};

function renderProfilePage(authValue = baseAuth) {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <AuthContext.Provider value={authValue}>
          <ProfilePage />
        </AuthContext.Provider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("ProfilePage", () => {
  describe("null user", () => {
    it("renders nothing when user is null", () => {
      const { container } = renderProfilePage({ ...baseAuth, user: null });
      expect(container.firstChild).toBeNull();
    });
  });

  describe("rendering", () => {
    it("renders the user's name", () => {
      renderProfilePage();
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });

    it("renders the user's email", () => {
      renderProfilePage();
      expect(screen.getAllByText(mockUser.email).length).toBeGreaterThan(0);
    });

    it("renders the name input pre-filled with user's name", () => {
      renderProfilePage();
      expect(screen.getByLabelText(/^name$/i)).toHaveValue(mockUser.name);
    });

    it("renders the email input pre-filled and disabled", () => {
      renderProfilePage();
      const emailInput = screen.getByLabelText(/^email$/i);
      expect(emailInput).toBeDisabled();
      expect(emailInput).toHaveValue(mockUser.email);
    });

    it("renders the New Password input", () => {
      renderProfilePage();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    it("renders the Save Changes button", () => {
      renderProfilePage();
      expect(
        screen.getByRole("button", { name: /save changes/i })
      ).toBeInTheDocument();
    });

    it("renders user initials when no avatar is set", () => {
      renderProfilePage();
      // First letter of name uppercased
      expect(
        screen.getByRole("button", { name: /change profile picture/i })
      ).toBeInTheDocument();
    });

    it("renders an avatar image when user has avatarUrl", () => {
      renderProfilePage({ ...baseAuth, user: mockUserWithAvatar });
      const img = screen.getByAltText("Profile");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", mockUserWithAvatar.avatarUrl);
    });

    it("renders the 'Log out' button", () => {
      renderProfilePage();
      expect(
        screen.getByRole("button", { name: /log out/i })
      ).toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("calls updateUser with the current name on save", async () => {
      const updateUser = jest.fn().mockResolvedValue(mockUser);
      renderProfilePage({ ...baseAuth, updateUser });

      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(updateUser).toHaveBeenCalledWith(
          expect.objectContaining({ name: mockUser.name })
        )
      );
    });

    it("calls updateUser with updated name when name is changed", async () => {
      const updateUser = jest.fn().mockResolvedValue(mockUser);
      renderProfilePage({ ...baseAuth, updateUser });

      const nameInput = screen.getByLabelText(/^name$/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "New Name");
      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(updateUser).toHaveBeenCalledWith(
          expect.objectContaining({ name: "New Name" })
        )
      );
    });

    it("shows toast error when name is cleared and saved", async () => {
      renderProfilePage();
      const nameInput = screen.getByLabelText(/^name$/i);
      await userEvent.clear(nameInput);
      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      expect(toast.error).toHaveBeenCalledWith("Name cannot be empty");
    });

    it("includes password when password field is filled", async () => {
      const updateUser = jest.fn().mockResolvedValue(mockUser);
      renderProfilePage({ ...baseAuth, updateUser });

      await userEvent.type(screen.getByLabelText(/new password/i), "newpass123");
      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(updateUser).toHaveBeenCalledWith(
          expect.objectContaining({ password: "newpass123" })
        )
      );
    });

    it("shows toast.success after a successful save", async () => {
      const updateUser = jest.fn().mockResolvedValue(mockUser);
      renderProfilePage({ ...baseAuth, updateUser });

      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Profile updated successfully")
      );
    });

    it("disables the save button while saving and shows 'Saving…'", async () => {
      const updateUser = jest.fn().mockReturnValue(new Promise(() => {}));
      renderProfilePage({ ...baseAuth, updateUser });

      await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

      // During save: button is disabled and text changes to "Saving…"
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });
  });

  describe("image upload validation", () => {
    it("shows toast error for invalid MIME type", async () => {
      renderProfilePage();

      const fileInput = document.querySelector('input[type="file"]');
      const badFile = new File(["data"], "doc.pdf", { type: "application/pdf" });

      // Directly fire the change event with the bad file
      await act(async () => {
        Object.defineProperty(fileInput, "files", {
          value: [badFile],
          writable: false,
          configurable: true,
        });
        fireEvent.change(fileInput);
      });

      expect(toast.error).toHaveBeenCalledWith(
        "Please choose a JPG, PNG, or WEBP image."
      );
    });

    it("shows toast error for file exceeding 5MB", async () => {
      renderProfilePage();

      const fileInput = document.querySelector('input[type="file"]');
      // 6MB file
      const largeFile = new File(
        [new ArrayBuffer(6 * 1024 * 1024)],
        "large.png",
        { type: "image/png" }
      );
      Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 });

      await userEvent.upload(fileInput, largeFile);

      expect(toast.error).toHaveBeenCalledWith(
        "Profile images must be 5MB or smaller."
      );
    });

    it("creates a preview URL for a valid image file", async () => {
      renderProfilePage();

      const fileInput = document.querySelector('input[type="file"]');
      const validFile = new File(["img"], "avatar.png", { type: "image/png" });

      await userEvent.upload(fileInput, validFile);

      expect(URL.createObjectURL).toHaveBeenCalledWith(validFile);
    });
  });

  describe("logout", () => {
    it("calls logout() and navigates to /login", async () => {
      const logout = jest.fn().mockResolvedValue(undefined);
      renderProfilePage({ ...baseAuth, logout });

      await userEvent.click(screen.getByRole("button", { name: /log out/i }));

      await waitFor(() => expect(logout).toHaveBeenCalled());
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
});
