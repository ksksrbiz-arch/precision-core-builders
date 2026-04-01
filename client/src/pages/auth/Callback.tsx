/**
 * Auth callback — handles Supabase magic link redirect.
 * Supabase processes the token from the URL hash, then we redirect.
 */
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase automatically handles the token from the URL hash.
    // We just wait for the session to be established.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          // Check role and redirect accordingly
          const role = session.user.user_metadata?.role;
          try {
            const { data: profile } = await supabase
              .from("users")
              .select("role")
              .eq("id", session.user.id)
              .single();
            const userRole = profile?.role ?? role ?? "user";
            setLocation(userRole === "admin" ? "/admin" : "/portal");
          } catch {
            setLocation(role === "admin" ? "/admin" : "/portal");
          }
        } else if (event === "SIGNED_OUT") {
          setLocation("/auth/login");
        }
      },
    );

    // Fallback: if already signed in, redirect immediately
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const role = data.session.user.user_metadata?.role ?? "user";
        setLocation(role === "admin" ? "/admin" : "/portal");
      }
    });

    // Handle error in URL hash
    const hash = window.location.hash;
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.slice(1));
      setError(params.get("error_description") ?? "Authentication failed.");
    }

    return () => subscription.unsubscribe();
  }, [setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-sm">
          <p className="text-destructive text-sm mb-4">{error}</p>
          <a href="/auth/login" className="text-primary text-sm underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
