/**
 * Route guard components for role-based access control.
 * - ProtectedRoute: requires any authenticated user
 * - AdminRoute: requires role === 'admin'
 * - ClientRoute: alias for ProtectedRoute (any auth user including admin)
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

function AuthLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 text-primary animate-spin" />
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/auth/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  if (loading) return <AuthLoader />;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        setLocation("/auth/login");
      } else if (!isAdmin) {
        setLocation("/portal");
      }
    }
  }, [loading, isAuthenticated, isAdmin, setLocation]);

  if (loading) return <AuthLoader />;
  if (!isAuthenticated || !isAdmin) return null;
  return <>{children}</>;
}

/** Alias — any authenticated user (clients + admins) */
export const ClientRoute = ProtectedRoute;
