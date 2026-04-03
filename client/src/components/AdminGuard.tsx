/**
 * AdminGuard — Wraps admin routes.
 * Redirects to /auth/login if not authenticated.
 * Shows loading spinner while checking session.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { ASSETS } from "@/const";
import { motion } from "framer-motion";
import { Loader2, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";
import type { ComponentType } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-5">
        <img
          src={ASSETS.logo}
          alt="Precision Core Builders"
          className="h-8 w-auto opacity-60"
        />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-light">
          Verifying access&hellip;
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    setTimeout(() => setLocation("/auth/login"), 0);
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/60 p-8 max-w-sm w-full text-center shadow-xl shadow-black/20"
        >
          <div className="h-14 w-14 border border-amber-400/30 bg-amber-400/10 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="h-7 w-7 text-amber-400" />
          </div>
          <h2
            className="text-lg font-semibold mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Admin Access Required
          </h2>
          <p className="text-sm text-muted-foreground font-light mb-2">
            Signed in as{" "}
            <span className="text-foreground font-medium">{user?.email}</span>
          </p>
          <p className="text-xs text-muted-foreground/60 mb-6">
            This area is restricted to administrators. Contact your admin to
            request access.
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href="/"
              className="px-5 py-2.5 border border-border/60 text-[11px] font-bold tracking-widest uppercase hover:bg-accent/50 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Home
            </a>
            <a
              href="/portal"
              className="px-5 py-2.5 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Client Portal
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * withAdminGuard — HOC wrapper for Wouter route components.
 * Uses explicit cast to satisfy Wouter's strict RouteComponentProps typing.
 */
export function withAdminGuard<T extends ComponentType<any>>(Component: T): T {
  const GuardedComponent = (props: any) => (
    <AdminGuard>
      <Component {...props} />
    </AdminGuard>
  );
  GuardedComponent.displayName = `AdminGuard(${
    (Component as any).displayName || (Component as any).name || "Component"
  })`;
  return GuardedComponent as unknown as T;
}
