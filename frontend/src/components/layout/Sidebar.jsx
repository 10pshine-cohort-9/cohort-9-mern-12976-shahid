import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Settings,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getUserImage } from '../../utils/userImage';

export default function Sidebar({ onNewNote }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const initials = user?.name?.charAt(0).toUpperCase() || '?';
  const userImage = getUserImage(user);

  return (
    <aside className="hidden h-full w-56 flex-shrink-0 flex-col border-r border-gray-100 bg-white transition-colors dark:border-gray-800 dark:bg-gray-900 lg:flex">
      {/* App brand */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
          Notes App
        </span>
      </div>

      {/* User info */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          className="flex items-center gap-2 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-2 py-1.5 transition-colors hover:cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden">
            {userImage ? (
              <img
                src={userImage}
                alt={user?.name || "Profile"}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
              userMenuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {userMenuOpen && (
          <div className="mt-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => {
                navigate("/profile");
                setUserMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <User className="w-3.5 h-3.5" />
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log out
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <button
          onClick={() => navigate("/notes")}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium transition-colors"
        >
          <FileText className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          My Notes
        </button>
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
        <button
          onClick={onNewNote}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors hover:cursor-pointer"
        >
          <Plus className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          Add new note
        </button>

        <button
          onClick={() => navigate("/profile")}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors hover:cursor-pointer"
        >
          <Settings className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          Settings
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors hover:cursor-pointer"
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-gray-400" />
          )}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </aside>
  );
}
