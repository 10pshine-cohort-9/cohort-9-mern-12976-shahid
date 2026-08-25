import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthContext } from "../../context/AuthContext";
import { ThemeContext } from "../../context/ThemeContext";

// ─────────────────────────────────────────────────────────────────────────────
// Default context values — override per test as needed.
// ─────────────────────────────────────────────────────────────────────────────

export const defaultAuthValue = {
  user: null,
  loading: false,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
};

export const defaultThemeValue = {
  theme: "light",
  toggleTheme: jest.fn(),
};

/**
 * Renders `ui` wrapped in every provider the app uses:
 *   HelmetProvider → MemoryRouter → ThemeContext → AuthContext
 *
 * @param {React.ReactElement} ui
 * @param {{
 *   authValue?: object,
 *   themeValue?: object,
 *   initialEntries?: string[],
 * }} options
 */
export function renderWithProviders(
  ui,
  {
    authValue = defaultAuthValue,
    themeValue = defaultThemeValue,
    initialEntries = ["/"],
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <HelmetProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <ThemeContext.Provider value={themeValue}>
            <AuthContext.Provider value={authValue}>
              {children}
            </AuthContext.Provider>
          </ThemeContext.Provider>
        </MemoryRouter>
      </HelmetProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

/**
 * Build a partial authValue, merging over the defaults.
 * Convenient for tests that only want to override one field.
 */
export function buildAuthValue(overrides = {}) {
  return { ...defaultAuthValue, ...overrides };
}

/**
 * Build a partial themeValue, merging over the defaults.
 */
export function buildThemeValue(overrides = {}) {
  return { ...defaultThemeValue, ...overrides };
}
