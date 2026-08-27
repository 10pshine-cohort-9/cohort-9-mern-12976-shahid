import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthContext } from "../../context/AuthContext";
import { ThemeContext } from "../../context/ThemeContext";

// ─────────────────────────────────────────────────────────────────────────────
// Default context values — override per test as needed.
// These objects carry only plain (non-mock) fields so they are safe to share
// as module-level constants. jest.fn() instances are created fresh by the
// factory functions below to prevent mock state from leaking between tests.
// ─────────────────────────────────────────────────────────────────────────────

export const defaultAuthValue = {
  user: null,
  loading: false,
};

export const defaultThemeValue = {
  theme: "light",
};

/**
 * Renders `ui` wrapped in every provider the app uses:
 *   HelmetProvider → MemoryRouter → ThemeContext → AuthContext
 *
 * authValue and themeValue default to fresh instances (via buildAuthValue /
 * buildThemeValue) so each render gets independent jest.fn() mocks.
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
    authValue = buildAuthValue(),
    themeValue = buildThemeValue(),
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
 * Returns a new object with fresh jest.fn() instances on every call so mock
 * state never leaks between tests.
 */
export function buildAuthValue(overrides = {}) {
  return {
    ...defaultAuthValue,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
    ...overrides,
  };
}

/**
 * Build a partial themeValue, merging over the defaults.
 * Returns a new object with a fresh jest.fn() instance on every call.
 */
export function buildThemeValue(overrides = {}) {
  return {
    ...defaultThemeValue,
    toggleTheme: jest.fn(),
    ...overrides,
  };
}
