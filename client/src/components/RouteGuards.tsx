/**
 * Route guard components for role-based access control.
 * - ProtectedRoute: requires any authenticated user
 * - AdminRoute: requires role === 'admin'
 * - ClientRoute: alias for ProtectedRoute (any auth user including admin)
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { BrandLoader } from "@/components/BrandLoader";
import { useEffect } from "react";
import { useLocation } from "wouter";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/auth/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  if (loading) return <BrandLoader label="Checking your session" />;
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

  if (loading) return <BrandLoader label="Checking your session" />;
  if (!isAuthenticated || !isAdmin) return null;
  return <>{children}</>;
}

/** Alias — any authenticated user (clients + admins) */
export const ClientRoute = ProtectedRoute;
