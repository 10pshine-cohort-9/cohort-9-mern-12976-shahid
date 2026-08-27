import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import { mockUser } from "../__tests__/helpers/testData";

/**
 * Renders ProtectedRoute inside a proper routing context.
 * The protected child renders <div>Protected Content</div>.
 * The login page renders <div>Login Page</div>.
 */
function renderWithRoutes(authValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={["/notes"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/notes" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("ProtectedRoute", () => {
  it("shows the Loader while loading is true", () => {
    renderWithRoutes({ user: null, loading: true });
    // Loader renders a <p> with its message
    expect(screen.getByText(/checking session/i)).toBeInTheDocument();
  });

  it("redirects to /login when there is no authenticated user", () => {
    renderWithRoutes({ user: null, loading: false });
    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders the protected outlet when the user is authenticated", () => {
    renderWithRoutes({ user: mockUser, loading: false });
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });

  it("does not render protected content while loading even if user is set", () => {
    // Edge case: loading still in progress, user already cached
    renderWithRoutes({ user: mockUser, loading: true });
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
