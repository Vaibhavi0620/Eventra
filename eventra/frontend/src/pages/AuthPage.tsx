import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = (location.state as any)?.from || "/events";

  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "ORGANIZER">("USER");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "REGISTER" && name.trim().length < 2) {
      setError("Please provide your full name (at least 2 characters).");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "LOGIN") {
        await login(email, password);
      } else {
        await register(name, email, password, role);
      }
      navigate(redirectPath);
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-14">
      {/* Left Column: Auth Form */}
      <div className="rounded-2xl bg-bg-card border border-border-muted p-6 sm:p-8 shadow-card">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-bg-secondary p-1.5 border border-border-muted mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("LOGIN");
              setError(null);
            }}
            className={`py-2.5 rounded-lg text-xs font-medium transition-colors ${
              mode === "LOGIN"
                ? "bg-accent-violet text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("REGISTER");
              setError(null);
            }}
            className={`py-2.5 rounded-lg text-xs font-medium transition-colors ${
              mode === "REGISTER"
                ? "bg-accent-violet text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Create Account
          </button>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl uppercase tracking-wide text-text-primary">
          {mode === "LOGIN" ? "Welcome Back to EVENTRA" : "Create Your EVENTRA Account"}
        </h1>
        <p className="text-xs text-text-secondary mt-1.5 mb-6 leading-relaxed">
          Sign in as a customer to buy and manage NFT tickets, or sign in as an event organizer to
          manage events, monitor sales, and verify venue entry.
        </p>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-status-error/40 bg-status-error/10 p-3.5 mb-5 text-xs text-status-error"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {mode === "REGISTER" && (
            <div>
              <label
                htmlFor="auth-name"
                className="block text-xs font-medium text-text-secondary mb-1.5"
              >
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
                required
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-medium text-text-secondary mb-1.5"
            >
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
              required
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-medium text-text-secondary mb-1.5"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
              required
            />
          </div>

          {mode === "REGISTER" && (
            <div>
              <label
                htmlFor="auth-role"
                className="block text-xs font-medium text-text-secondary mb-1.5"
              >
                Account Role
              </label>
              <select
                id="auth-role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-violet"
              >
                <option value="USER">Customer — Discover events, buy & resell NFT tickets</option>
                <option value="ORGANIZER">
                  Event Organizer — Manage events, monitor fraud alerts & verify QR entry
                </option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary font-medium text-sm py-3.5 transition-colors shadow-sm"
          >
            {submitting
              ? "Signing In..."
              : mode === "LOGIN"
              ? "Sign In to EVENTRA"
              : "Create Account"}
          </button>
        </form>
      </div>

    </div>
  );
};
