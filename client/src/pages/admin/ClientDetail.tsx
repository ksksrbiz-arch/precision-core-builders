/**
 * Client Detail — single client view with project history and contact info.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, DollarSign, Mail, MapPin, Phone, Tag } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { StatusBadge } from "./CommandCenter";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: client, isLoading } = trpc.clients.getById.useQuery(
    { id: Number(id) }, { enabled: !!id }
  );

  const fmt = (n: number | string | null | undefined) => n ? `$${Number(n).toLocaleString()}` : "—";

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-12 text-center text-muted-foreground text-sm">Loading…</div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-12 text-center">
          <p className="text-muted-foreground text-sm">Client not found.</p>
        </div>
      </DashboardLayout>
    );
  }

  const projects = (client as any).projects ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => setLocation("/admin/clients")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> All Clients
        </button>

        {/* Header card */}
        <div className="bg-card border border-border/60 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">
                {client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: "var(--font-heading)" }}>{client.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <Mail className="h-3.5 w-3.5 text-primary" /> {client.email}
                  </a>
                )}
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <Phone className="h-3.5 w-3.5 text-primary" /> {client.phone}
                  </a>
                )}
                {client.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {client.city}, {client.state ?? "OR"} {client.zip ?? ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-border/40 text-xs text-muted-foreground">
            {client.lead_source && (
              <span className="flex items-center gap-1"><Tag className="h-3 w-3 text-primary" /> {client.lead_source}</span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-primary" /> Client since {new Date(client.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </span>
          </div>

          {client.notes && (
            <div className="mt-4 pt-4 border-t border-border/40">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-2" style={{ fontFamily: "var(--font-condensed)" }}>Notes</p>
              <p className="text-sm text-muted-foreground font-light whitespace-pre-line">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="mb-4">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3" style={{ fontFamily: "var(--font-condensed)" }}>
            Projects ({projects.length})
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="bg-card border border-border/60 p-8 text-center">
            <p className="text-muted-foreground text-sm">No projects associated with this client.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((p: any) => (
              <button key={p.id} onClick={() => setLocation(`/admin/projects/${p.id}`)}
                className="w-full text-left bg-card border border-border/60 p-4 hover:border-primary/30 transition-colors flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Created {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {p.estimated_budget && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> {fmt(p.estimated_budget)}
                    </span>
                  )}
                  <StatusBadge status={p.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
