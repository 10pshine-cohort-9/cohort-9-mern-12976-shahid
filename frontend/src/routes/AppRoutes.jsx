import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import GuestRoute from "./GuestRoute.jsx";
import ProtectedRoute from "./ProtectedRoute";
import Loader from "../components/common/Loader.jsx";
import ErrorBoundary from "../components/common/ErrorBoundary.jsx";
const LoginPage = lazy(() => import("../pages/LoginPage.jsx"));
const RegisterPage = lazy(() => import("../pages/RegisterPage.jsx"));
const AppShell = lazy(() => import("../components/layout/AppShell.jsx"));
const ProfilePage = lazy(() => import("../pages/ProfilePage.jsx"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage.jsx"));

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950">
            <Loader message="Loading page..." />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Guest routes */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/signup"
              element={<Navigate to="/register" replace />}
            />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/notes/*" element={<AppShell />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Legacy redirect */}
          <Route path="/dashboard" element={<Navigate to="/notes" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
