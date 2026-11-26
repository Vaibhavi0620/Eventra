import React from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"USER" | "ORGANIZER" | "ADMIN">;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="rounded-xl border border-border-muted bg-bg-card px-6 py-4 text-sm text-text-secondary flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-violet animate-pulse" />
          <span>Verifying your session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-2xl mx-auto my-16 px-4">
        <div className="rounded-2xl border border-border-muted bg-bg-card p-8 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-status-error/15 border border-status-error/30 text-status-error text-xs font-medium px-3 py-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Access Restricted</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-text-primary">
            Organizer or Administrator Permissions Required
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            This page requires one of the following account roles:{" "}
            <span className="text-text-primary font-medium">{allowedRoles.join(" or ")}</span>. You
            are currently signed in as <span className="text-text-primary">{user.email}</span> (
            <span className="font-mono text-xs text-accent-cyan">{user.role}</span>).
          </p>
          <div className="pt-2">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary text-sm font-medium px-4 py-2.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
