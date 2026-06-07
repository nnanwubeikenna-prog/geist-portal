import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Marketing Brain" },
      { name: "description", content: "Sign in or create your Marketing Brain account." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    if (isSignup && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    // UI-only: route to the app.
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center mb-3">
            <div className="w-3 h-3 rounded-sm bg-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            Marketing Brain
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {isSignup ? "Create your account" : "Sign in to your workspace"}
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
          <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-lg mb-6 text-sm">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`h-8 rounded-md transition-colors ${
                !isSignup
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`h-8 rounded-md transition-colors ${
                isSignup
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
              />
            </div>

            {isSignup && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}

            <button
              type="submit"
              className="w-full h-10 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              {isSignup ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className="text-xs text-neutral-500 text-center mt-6">
            {isSignup ? "Already have an account?" : "New to Marketing Brain?"}{" "}
            <button
              type="button"
              onClick={() => setMode(isSignup ? "login" : "signup")}
              className="text-neutral-900 font-medium hover:underline"
            >
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>

        <p className="text-[11px] text-neutral-400 text-center mt-6">
          <Link to="/" className="hover:text-neutral-600">Back to app</Link>
        </p>
      </div>
    </div>
  );
}