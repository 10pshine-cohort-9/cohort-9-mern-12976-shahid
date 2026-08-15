import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-bold text-gray-200 mb-4">404</p>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">
        Page not found
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        The page you're looking for doesn't exist.
      </p>
      <button
        onClick={() => navigate(user ? "/notes" : "/login")}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        {user ? "Back to Notes" : "Go to Login"}
      </button>
    </div>
  );
}
