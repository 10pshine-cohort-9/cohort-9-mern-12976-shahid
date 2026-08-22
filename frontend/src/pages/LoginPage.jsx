import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Mail,
  Lock,
  FileText,
  Sparkles,
  ShieldCheck,
  Clock3,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SeoMeta from "../components/seo/SeoMeta";

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in — send straight to notes
  if (user) return <Navigate to="/notes" replace />;
  /** @param {SubmitEvent} e */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      const message = "Please fill in all fields";
      setError(message);
      toast.error(message);
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Signed in successfully");
      navigate("/notes");
    } catch (err) {
      const message =
        err.response?.data?.message || "Login failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <SeoMeta
        title="Login"
        description="Sign in to Notes App to access your personal notes workspace."
        canonical="/login"
      />
      <div className="pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full bg-cyan-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-28 h-80 w-80 rounded-full bg-emerald-300/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-white/60 bg-white/75 shadow-2xl shadow-slate-900/10 backdrop-blur-md">
        <aside className="relative hidden w-full lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-linear-to-br from-cyan-600 via-sky-600 to-blue-700 p-10 text-white">
          <div className="pointer-events-none absolute -right-16 -top-14 h-44 w-44 rounded-full bg-white/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-20 bottom-10 h-56 w-56 rounded-full bg-cyan-200/35 blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Notes App
            </div>
            <h1 className="mt-6 max-w-sm text-4xl font-bold leading-tight tracking-tight">
              Keep your ideas organized, focused, and always within reach.
            </h1>
            <p className="mt-4 max-w-md text-sm text-cyan-100">
              Capture thoughts instantly and revisit them from anywhere with a
              fast, private writing space.
            </p>
          </div>

          <div className="relative z-10 grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-cyan-100" />
              <p className="text-sm font-medium text-white">
                Secure account sessions and protected notes
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-4 py-3">
              <Clock3 className="h-4 w-4 text-cyan-100" />
              <p className="text-sm font-medium text-white">
                Instant access with clean, distraction-free workflow
              </p>
            </div>
          </div>
        </aside>

        <main className="flex w-full items-center justify-center p-5 sm:p-8 lg:w-1/2 lg:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-300/40 lg:mx-0">
                <FileText className="h-5 w-5" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Sign in to continue managing your notes.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-900/5"
              noValidate
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Email
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    aria-invalid={Boolean(error && !email.trim())}
                    className={`w-full rounded-xl border bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 ${
                      error && !email.trim()
                        ? "border-rose-400"
                        : "border-slate-200"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    aria-invalid={Boolean(error && !password)}
                    className={`w-full rounded-xl border bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 ${
                      error && !password
                        ? "border-rose-400"
                        : "border-slate-200"
                    }`}
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-600 to-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-300/40 transition-all hover:-translate-y-0.5 hover:from-cyan-500 hover:to-blue-500 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="opacity-30"
                    />
                    <path
                      d="M22 12a10 10 0 0 0-10-10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-600 lg:text-left">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-cyan-700 underline-offset-4 transition-colors hover:text-cyan-600 hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
