import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ThemeProvider } from "../../context/ThemeContext";
import Sidebar from "./Sidebar";
import { mockUser, mockUserWithAvatar } from "../../__tests__/helpers/testData";

const mockNavigate = jest.fn();

beforeEach(() => {
  // ThemeProvider reads localStorage and sets html class — clean both between tests
  document.documentElement.classList.remove("dark");
});
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const defaultAuthValue = {
  user: mockUser,
  loading: false,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
};

const defaultThemeValue = {
  theme: "light",
  toggleTheme: jest.fn(),
};

function renderSidebar({
  authValue = defaultAuthValue,
  initialTheme = "light",
} = {}) {
  // ThemeProvider reads from localStorage, so we seed it there
  localStorage.setItem("theme", initialTheme);
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <ThemeProvider>
          <Sidebar />
        </ThemeProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("Sidebar", () => {
  describe("rendering", () => {
    it("renders the app brand 'Notes App'", () => {
      renderSidebar();
      expect(screen.getByText("Notes App")).toBeInTheDocument();
    });

    it("renders the user's name", () => {
      renderSidebar();
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });

    it("renders the user's email", () => {
      renderSidebar();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });

    it("renders the user's initial as a fallback avatar", () => {
      renderSidebar();
      // Initial letter of name shown in avatar area
      expect(screen.getByText(mockUser.name.charAt(0).toUpperCase())).toBeInTheDocument();
    });

    it("renders an avatar image when user has an avatarUrl", () => {
      renderSidebar({ authValue: { ...defaultAuthValue, user: mockUserWithAvatar } });
      const img = screen.getByAltText(mockUserWithAvatar.name);
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", mockUserWithAvatar.avatarUrl);
    });

    it("renders the 'My Notes' navigation button", () => {
      renderSidebar();
      expect(screen.getByText("My Notes")).toBeInTheDocument();
    });
  });

  describe("theme toggle", () => {
    it("shows 'Dark mode' text when theme is light", () => {
      renderSidebar({ initialTheme: "light" });
      expect(screen.getByText("Dark mode")).toBeInTheDocument();
    });

    it("shows 'Light mode' text when theme is dark", () => {
      renderSidebar({ initialTheme: "dark" });
      expect(screen.getByText("Light mode")).toBeInTheDocument();
    });

    it("calls toggleTheme when the theme toggle button is clicked", async () => {
      renderSidebar({ initialTheme: "light" });
      const toggleBtn = screen.getByLabelText(/switch to dark mode/i);
      await userEvent.click(toggleBtn);
      // After toggle, label switches — theme changed
      expect(screen.getByLabelText(/switch to light mode/i)).toBeInTheDocument();
    });

    it("has correct aria-label for light→dark switch", () => {
      renderSidebar({ initialTheme: "light" });
      expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
    });

    it("has correct aria-label for dark→light switch", () => {
      renderSidebar({ initialTheme: "dark" });
      expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
    });
  });

  describe("user menu", () => {
    it("does not show Profile/Logout options before menu is opened", () => {
      renderSidebar();
      expect(screen.queryByRole("button", { name: /^profile$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^log out$/i })).not.toBeInTheDocument();
    });

    it("opens the dropdown when the user menu button is clicked", async () => {
      renderSidebar();
      await userEvent.click(
        screen.getByLabelText(`${mockUser.name} menu`)
      );
      expect(screen.getByRole("button", { name: /^profile$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^log out$/i })).toBeInTheDocument();
    });

    it("closes the dropdown when clicked a second time", async () => {
      renderSidebar();
      const menuBtn = screen.getByLabelText(`${mockUser.name} menu`);
      await userEvent.click(menuBtn);
      await userEvent.click(menuBtn);
      expect(screen.queryByRole("button", { name: /^profile$/i })).not.toBeInTheDocument();
    });

    it("navigates to /profile when Profile is clicked", async () => {
      renderSidebar();
      await userEvent.click(screen.getByLabelText(`${mockUser.name} menu`));
      await userEvent.click(screen.getByRole("button", { name: /^profile$/i }));
      expect(mockNavigate).toHaveBeenCalledWith("/profile");
    });

    it("closes the menu after clicking Profile", async () => {
      renderSidebar();
      await userEvent.click(screen.getByLabelText(`${mockUser.name} menu`));
      await userEvent.click(screen.getByRole("button", { name: /^profile$/i }));
      expect(screen.queryByRole("button", { name: /^profile$/i })).not.toBeInTheDocument();
    });
  });

  describe("logout", () => {
    it("calls logout() from auth context when Log out is clicked", async () => {
      const logout = jest.fn().mockResolvedValue(undefined);
      renderSidebar({ authValue: { ...defaultAuthValue, logout } });

      await userEvent.click(screen.getByLabelText(`${mockUser.name} menu`));
      await userEvent.click(screen.getByRole("button", { name: /^log out$/i }));

      await waitFor(() => expect(logout).toHaveBeenCalled());
    });

    it("navigates to /login after logout", async () => {
      const logout = jest.fn().mockResolvedValue(undefined);
      renderSidebar({ authValue: { ...defaultAuthValue, logout } });

      await userEvent.click(screen.getByLabelText(`${mockUser.name} menu`));
      await userEvent.click(screen.getByRole("button", { name: /^log out$/i }));

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith("/login")
      );
    });

    it("still navigates to /login even if logout() throws", async () => {
      const logout = jest.fn().mockRejectedValue(new Error("Network Error"));
      renderSidebar({ authValue: { ...defaultAuthValue, logout } });

      await userEvent.click(screen.getByLabelText(`${mockUser.name} menu`));
      await userEvent.click(screen.getByRole("button", { name: /^log out$/i }));

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith("/login")
      );
    });
  });

  describe("navigation", () => {
    it("navigates to /notes when 'My Notes' is clicked", async () => {
      renderSidebar();
      await userEvent.click(screen.getByText("My Notes"));
      expect(mockNavigate).toHaveBeenCalledWith("/notes");
    });

    it("navigates to /profile when Settings is clicked", async () => {
      renderSidebar();
      await userEvent.click(screen.getByText("Settings"));
      expect(mockNavigate).toHaveBeenCalledWith("/profile");
    });
  });
});
