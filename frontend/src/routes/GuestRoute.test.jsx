import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import GuestRoute from "./GuestRoute";
import { mockUser } from "../__tests__/helpers/testData";

/**
 * Renders GuestRoute inside a routing context.
 * The guest child (login page) renders <div>Login Page</div>.
 * The notes page renders <div>Notes Page</div>.
 */
function renderWithRoutes(authValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<div>Login Page</div>} />
          </Route>
          <Route path="/notes" element={<div>Notes Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("GuestRoute", () => {
  it("renders a blank placeholder while loading is true", () => {
    const { container } = renderWithRoutes({ user: null, loading: true });
    // GuestRoute returns a plain div while loading — no page content yet
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    expect(screen.queryByText("Notes Page")).not.toBeInTheDocument();
    // The blank div should still be in the DOM
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("redirects to /notes when the user is already authenticated", () => {
    renderWithRoutes({ user: mockUser, loading: false });
    expect(screen.getByText("Notes Page")).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });

  it("renders the guest outlet when there is no authenticated user", () => {
    renderWithRoutes({ user: null, loading: false });
    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Notes Page")).not.toBeInTheDocument();
  });

  it("does not render guest content while loading even if user is null", () => {
    renderWithRoutes({ user: null, loading: true });
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });
});
