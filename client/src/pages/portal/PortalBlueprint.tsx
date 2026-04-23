/**
 * Client Portal — Blueprint view.
 *
 * Clients must have both a Precision Core account (already authenticated to
 * reach this page) AND a linked blueprint.am account. If the Blueprint
 * account isn't linked, they see an onboarding card. Once linked, they see a
 * read-only list of Blueprint artifacts the builder has shared with them.
 *
 * Gated behind `VITE_FEATURE_BLUEPRINT=true` at the route level in App.tsx.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Key,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

export default function PortalBlueprint() {
  useAuth();
  const utils = trpc.useUtils();
  const { data: status, isLoading } =
    trpc.blueprint.getConnectionStatus.useQuery();
  const { data: myProject } = trpc.projects.myProject.useQuery();
  const { data: artifacts } = trpc.blueprint.listArtifacts.useQuery(
    { projectId: myProject?.id ?? 0 },
    { enabled: !!myProject?.id }
  );

  const [apiKey, setApiKey] = useState("");
  const [apiEmail, setApiEmail] = useState("");

  const startOAuth = useMutationWithToast(
    trpc.blueprint.startOAuth.useMutation(),
    { success: "Redirecting to blueprint.am…" }
  );
  const saveApiKey = useMutationWithToast(
    trpc.blueprint.saveApiKey.useMutation({
      onSuccess: () => {
        utils.blueprint.getConnectionStatus.invalidate();
        setApiKey("");
      },
    }),
    { success: "Blueprint account linked." }
  );

  const handleStartOAuth = async () => {
    try {
      const res = await startOAuth.mutateAsync({
        returnTo: "/portal/blueprint",
      });
      if (res?.authorizeUrl) window.location.href = res.authorizeUrl;
    } catch {
      /* toast handled */
    }
  };

  const isConnected = status?.status === "connected";

  return (
    <PortalLayout className="container py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-serif tracking-tight">Blueprints</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Plans and designs shared by your builder from blueprint.am. Connecting
          your own Blueprint account lets you view them in context and carry
          them forward on your own.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !isConnected ? (
        <section className="rounded-xl border border-border/60 bg-card p-8 space-y-4 max-w-2xl">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Link your accounts</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            To view your plans you need a blueprint.am account in addition to
            your Precision Core account. If you don't have one, create a free
            account first at{" "}
            <a
              href="https://blueprint.am"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              blueprint.am <ExternalLink className="h-3 w-3" />
            </a>
            .
          </p>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link2 className="h-4 w-4" /> Connect via OAuth
              </div>
              <Button
                onClick={handleStartOAuth}
                disabled={startOAuth.isPending || !status?.oauthConfigured}
                className="w-full"
              >
                Connect with blueprint.am
              </Button>
              {!status?.oauthConfigured && (
                <p className="text-xs text-muted-foreground">
                  OAuth not available — please use the API-key option.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Key className="h-4 w-4" /> Use an API key
              </div>
              <Label htmlFor="bp-email" className="text-xs sr-only">
                Blueprint email
              </Label>
              <Input
                id="bp-email"
                type="email"
                placeholder="you@example.com (optional)"
                value={apiEmail}
                onChange={e => setApiEmail(e.target.value)}
              />
              <Label htmlFor="bp-key" className="text-xs sr-only">
                API key
              </Label>
              <Input
                id="bp-key"
                type="password"
                placeholder="Blueprint API key"
                autoComplete="off"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={() =>
                  saveApiKey.mutate({
                    apiKey: apiKey.trim(),
                    providerEmail: apiEmail.trim() || undefined,
                  })
                }
                disabled={saveApiKey.isPending || apiKey.trim().length < 8}
                className="w-full"
              >
                Save API key
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4 max-w-2xl">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <p className="text-sm">
              Your blueprint.am account is linked
              {status?.connection?.providerEmail && (
                <> as {status.connection.providerEmail}</>
              )}
              .
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Shared plans</h2>
            {!myProject ? (
              <p className="text-sm text-muted-foreground">
                No active project yet.
              </p>
            ) : !artifacts || artifacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Your builder hasn't shared any blueprints on this project yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {artifacts.map((a: any) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-border/50 bg-card p-4 flex items-start gap-4"
                  >
                    <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {a.title ?? a.blueprint_resource_id}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.resource_type}
                        {a.synced_at && (
                          <>
                            {" · "}
                            Updated {new Date(a.synced_at).toLocaleDateString()}
                          </>
                        )}
                      </p>
                    </div>
                    {a.url && (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                      >
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </PortalLayout>
  );
}
