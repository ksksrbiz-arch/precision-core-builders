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
    /** Read role from public.users (set by trigger) and redirect accordingly. */
    async function redirectByRole(userId: string) {
      try {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", userId)
          .single();
        setLocation(profile?.role === "admin" ? "/admin" : "/portal");
      } catch {
        // Trigger may not have fired yet — retry once after short delay
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from("users").select("role").eq("id", userId).single();
          setLocation(profile?.role === "admin" ? "/admin" : "/portal");
        }, 800);
      }
    }
    // Supabase automatically handles the token from the URL hash.
    // We just wait for the session to be established.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          await redirectByRole(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setLocation("/auth/login");
        }
      },
    );

    // Fallback: if already signed in, redirect immediately
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) redirectByRole(data.session.user.id);
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
