import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  if (user) {
    return <Navigate to="/notes" replace />;
  }

  return <Outlet />;
}
