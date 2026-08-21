/**
 * Admin Blueprint Tools page.
 *
 * Allows Eric to connect his blueprint.am account (OAuth or API key),
 * see the current connection status, and manage Blueprint artifacts
 * attached to PCB projects.
 *
 * Gated behind the `VITE_FEATURE_BLUEPRINT=true` feature flag at the
 * route level in App.tsx — the page assumes the flag is on when rendered.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { QueryError } from "@/components/QueryError";
import { fmtDateTime } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Key,
  Link2,
  Unplug,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function BlueprintTools() {
  const utils = trpc.useUtils();
  const {
    data: status,
    isLoading,
    isError,
    refetch,
  } = trpc.blueprint.getConnectionStatus.useQuery();

  // Live updates: a connect/disconnect completed on another device (e.g. the
  // OAuth redirect finishing on a phone) refreshes the status shown here.
  useRealtimeTable({
    table: "blueprint_connections",
    onUpdate: () => refetch(),
  });

  const [apiKey, setApiKey] = useState("");
  const [apiEmail, setApiEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Surface callback messages from /.netlify/functions/blueprint-oauth-callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("blueprint_connected") === "1") {
      setSuccessMsg("Blueprint account connected.");
    }
    const err = params.get("blueprint_error");
    if (err) setErrorMsg(`Connection failed: ${err.replace(/_/g, " ")}`);
  }, []);

  const startOAuth = useMutationWithToast(
    trpc.blueprint.startOAuth.useMutation(),
    {
      success: "Redirecting to blueprint.am…",
    }
  );

  const saveApiKey = useMutationWithToast(
    trpc.blueprint.saveApiKey.useMutation({
      onSuccess: () => {
        utils.blueprint.getConnectionStatus.invalidate();
        setApiKey("");
      },
    }),
    { success: "Blueprint API key saved." }
  );

  const disconnect = useMutationWithToast(
    trpc.blueprint.disconnect.useMutation({
      onSuccess: () => utils.blueprint.getConnectionStatus.invalidate(),
    }),
    { success: "Blueprint account disconnected." }
  );

  const handleStartOAuth = async () => {
    try {
      const res = await startOAuth.mutateAsync({
        returnTo: "/admin/blueprint",
      });
      if (res?.authorizeUrl) window.location.href = res.authorizeUrl;
    } catch {
      /* toast handled by mutation */
    }
  };

  const isConnected = status?.status === "connected";
  const isExpired = status?.status === "expired";

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif tracking-tight">Blueprint.am</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your blueprint.am account to attach plans and designs to
              Precision Core projects.
            </p>
          </div>
          <a
            href="https://blueprint.am"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
          >
            Open blueprint.am <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </header>

        {errorMsg && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{errorMsg}</p>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            <p className="text-sm text-green-600 dark:text-green-400">
              {successMsg}
            </p>
          </div>
        )}

        {/* Connection status card */}
        <section className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Connection status</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : isError ? (
            <QueryError
              message="We couldn't load your Blueprint connection status. Check your connection and try again."
              onRetry={() => refetch()}
            />
          ) : isConnected ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm">
                  Connected via{" "}
                  <span className="font-medium">
                    {status?.connection?.authMethod === "oauth"
                      ? "OAuth"
                      : "API key"}
                  </span>
                  {status?.connection?.providerEmail && (
                    <> as {status.connection.providerEmail}</>
                  )}
                  .
                </p>
                {status?.connection?.expiresAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Token expires: {fmtDateTime(status.connection.expiresAt)}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnect.mutate(undefined as never)}
                disabled={disconnect.isPending}
              >
                <Unplug className="h-4 w-4 mr-1.5" /> Disconnect
              </Button>
            </div>
          ) : isExpired ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Your Blueprint token has expired. Reconnect below to restore
              access.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not connected. Choose an option below to link an account.
            </p>
          )}
        </section>

        {/* Connect options */}
        {!isConnected && (
          <section className="grid gap-4 md:grid-cols-2">
            {/* OAuth */}
            <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Connect via OAuth</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Recommended. Redirects to blueprint.am to authorise Precision
                Core.
              </p>
              <Button
                onClick={handleStartOAuth}
                disabled={startOAuth.isPending || !status?.oauthConfigured}
                className="w-full"
              >
                Connect with blueprint.am
              </Button>
              {!status?.oauthConfigured && (
                <p className="text-xs text-muted-foreground">
                  OAuth is not configured yet. Ask your admin to add
                  BLUEPRINT_CLIENT_ID / BLUEPRINT_CLIENT_SECRET in Netlify.
                </p>
              )}
            </div>

            {/* API key */}
            <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Use an API key</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Paste a personal API key from your blueprint.am account
                settings. Stored encrypted.
              </p>
              <div className="space-y-2">
                <Label htmlFor="bp-email" className="text-xs">
                  Blueprint email (optional)
                </Label>
                <Input
                  id="bp-email"
                  type="email"
                  value={apiEmail}
                  onChange={e => setApiEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <Label htmlFor="bp-key" className="text-xs">
                  API key
                </Label>
                <Input
                  id="bp-key"
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="bp_live_…"
                  autoComplete="off"
                />
              </div>
              <Button
                onClick={() =>
                  saveApiKey.mutate({
                    apiKey: apiKey.trim(),
                    providerEmail: apiEmail.trim() || undefined,
                  })
                }
                disabled={saveApiKey.isPending || apiKey.trim().length < 8}
                className="w-full"
                variant="secondary"
              >
                Save API key
              </Button>
            </div>
          </section>
        )}

        {/* Help / about */}
        <section className="rounded-xl border border-dashed border-border/40 p-6 text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">What this enables:</strong> once
            connected, you can attach plans from blueprint.am to any Precision
            Core project and choose whether clients can view them in the portal.
          </p>
          <p>
            See{" "}
            <a
              href="/docs/integrations/blueprint"
              className="text-primary hover:underline"
            >
              docs/integrations/blueprint.md
            </a>{" "}
            for the admin setup guide.
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}
