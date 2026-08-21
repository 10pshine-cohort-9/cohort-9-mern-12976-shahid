import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Lock,
  Calendar,
  Camera,
  Save,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/formatDate";
import { getUserImage } from "../utils/userImage";

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/** @typedef {{ name?: string, password?: string, imageFile?: File }} ProfileUpdatePayload */

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!user) return null;

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  /** @param {Event} e */
  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      toast.error("Please choose a JPG, PNG, or WEBP image.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      toast.error("Profile images must be 5MB or smaller.");
      e.target.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  /** @param {SubmitEvent} e */
  async function handleSave(e) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      await updateUser({
        name: name.trim(),
        password: password.trim() || undefined,
        imageFile: imageFile || undefined,
      });
      setPassword("");
      setImageFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Could not update profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not log out.");
    }
  }

  const initials = user.name?.charAt(0).toUpperCase() || "?";
  const userImage = getUserImage(user);
  const avatarSrc = previewUrl || userImage;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-10 transition-colors">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 h-28" />

          <div className="flex flex-col items-center -mt-14 px-8 pb-2">
            <div className="relative group mb-3">
              <button
                type="button"
                onClick={handleAvatarClick}
                className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 shadow-md overflow-hidden bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
                aria-label="Change profile picture"
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 select-none leading-none">
                    {initials}
                  </span>
                )}
              </button>

              <div
                onClick={handleAvatarClick}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                aria-hidden="true"
              >
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />

            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {user.name}
            </h2>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {user.email}
            </p>
          </div>

          <div className="px-8 pb-8 pt-4">
            <form onSubmit={handleSave} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Name
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-gray-400 dark:text-gray-500 pointer-events-none">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  You can update your display name
                </p>
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Email
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-gray-400 dark:text-gray-500 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="profile-email"
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label
                  htmlFor="profile-password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  New Password
                  <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                    (Leave blank to keep unchanged)
                  </span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-gray-400 dark:text-gray-500 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="profile-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors">
                <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Member since
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors hover:cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving…" : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/notes")}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm transition-colors hover:cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Notes
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 border border-gray-100 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 font-medium py-2.5 rounded-lg text-sm transition-colors hover:cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
