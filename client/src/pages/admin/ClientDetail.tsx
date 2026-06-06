/**
 * Client Detail — single client view with project history and inline edit.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { trpc } from "@/lib/trpc";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  DollarSign,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Tag,
  UserX,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { StatusBadge } from "./CommandCenter";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    notes: string;
    leadSource: string;
  } | null>(null);

  const utils = trpc.useUtils();
  const {
    data: client,
    isLoading,
    isError,
    refetch,
  } = trpc.clients.getById.useQuery({ id: Number(id) }, { enabled: !!id });

  const updateMut = useMutationWithToast(trpc.clients.update.useMutation(), {
    success: "Client Updated",
    successMessage: "Client information saved.",
    error: "Update Failed",
    errorMessage: "Failed to update client. Please try again.",
    invalidate: () => utils.clients.getById.invalidate({ id: Number(id) }),
    onSuccess: () => setEditing(false),
  });

  const startEdit = () => {
    if (!client) return;
    setEditForm({
      name: client.name ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      address: client.address ?? "",
      city: client.city ?? "",
      state: client.state ?? "OR",
      zip: client.zip ?? "",
      notes: client.notes ?? "",
      leadSource: client.lead_source ?? "",
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditForm(null);
  };

  const handleSave = () => {
    if (!editForm || !editForm.name || !editForm.email) return;
    updateMut.mutate({
      id: Number(id),
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone || undefined,
      address: editForm.address || undefined,
      city: editForm.city || undefined,
      state: editForm.state || undefined,
      zip: editForm.zip || undefined,
      notes: editForm.notes || undefined,
      leadSource: editForm.leadSource || undefined,
    });
  };

  const ef = editForm;
  const setEf = (key: string, value: string) =>
    setEditForm(prev => (prev ? { ...prev, [key]: value } : prev));

  const inputCls =
    "w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60";

  const fmt = (n: number | string | null | undefined) =>
    n ? `$${Number(n).toLocaleString()}` : "—";

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-4 w-28 mb-6" />
          <div className="bg-card border border-border/60 p-6 mb-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-14 w-14 shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-border/40">
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-3 w-24 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto p-12">
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Could not load this client</AlertTitle>
            <AlertDescription>
              A network or authorization issue occurred. Please try again.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2 justify-center mt-4">
            <button
              onClick={() => refetch()}
              className="text-xs font-bold tracking-widest uppercase border border-primary/40 text-primary px-4 py-2 hover:bg-primary/10 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Retry
            </button>
            <button
              onClick={() => setLocation("/admin/clients")}
              className="text-xs font-bold tracking-widest uppercase border border-border text-muted-foreground px-4 py-2 hover:text-foreground transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Back to Clients
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto p-12">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UserX />
              </EmptyMedia>
              <EmptyTitle>Client not found</EmptyTitle>
              <EmptyDescription>
                This client may have been removed or the link is incorrect.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <button
                onClick={() => setLocation("/admin/clients")}
                className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase border border-primary/40 text-primary px-4 py-2 hover:bg-primary/10 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Clients
              </button>
            </EmptyContent>
          </Empty>
        </div>
      </DashboardLayout>
    );
  }

  const projects = (client as any).projects ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setLocation("/admin/clients")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All Clients
        </button>

        {/* Header card */}
        <div className="bg-card border border-border/60 p-6 mb-6">
          {editing && ef ? (
            /* Edit form */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Edit Client
                </p>
                <button
                  onClick={cancelEdit}
                  aria-label="Cancel editing"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { key: "name", label: "Full Name *", type: "text" },
                  { key: "email", label: "Email *", type: "email" },
                  { key: "phone", label: "Phone", type: "tel" },
                  { key: "address", label: "Street Address", type: "text" },
                  { key: "city", label: "City", type: "text" },
                  { key: "zip", label: "ZIP", type: "text" },
                  { key: "leadSource", label: "Lead Source", type: "text" },
                ].map(f => (
                  <div key={f.key}>
                    <label
                      className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {f.label}
                    </label>
                    <input
                      type={f.type}
                      value={(ef as any)[f.key]}
                      onChange={e => setEf(f.key, e.target.value)}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Notes
                </label>
                <textarea
                  value={ef.notes}
                  onChange={e => setEf("notes", e.target.value)}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!ef.name || !ef.email || updateMut.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  <Save className="h-3 w-3" />
                  {updateMut.isPending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            /* Read view */
            <>
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-primary">
                    {client.name
                      .split(" ")
                      .map((word: string) => word[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h1
                      className="text-2xl font-semibold"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {client.name}
                    </h1>
                    <button
                      onClick={startEdit}
                      aria-label="Edit client"
                      className="text-muted-foreground/50 hover:text-primary transition-colors"
                      title="Edit client"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {client.email && (
                      <a
                        href={`mailto:${client.email}`}
                        className="flex items-center gap-1.5 hover:text-primary transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5 text-primary" />{" "}
                        {client.email}
                      </a>
                    )}
                    {client.phone && (
                      <a
                        href={`tel:${client.phone}`}
                        className="flex items-center gap-1.5 hover:text-primary transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5 text-primary" />{" "}
                        {client.phone}
                      </a>
                    )}
                    {client.city && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />{" "}
                        {client.city}, {client.state ?? "OR"} {client.zip ?? ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-border/40 text-xs text-muted-foreground">
                {client.lead_source && (
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3 text-primary" />{" "}
                    {client.lead_source}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-primary" /> Client since{" "}
                  {new Date(client.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {client.notes && (
                <div className="mt-4 pt-4 border-t border-border/40">
                  <p
                    className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-2"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Notes
                  </p>
                  <p className="text-sm text-muted-foreground font-light whitespace-pre-line">
                    {client.notes}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Projects */}
        <div className="mb-4">
          <p
            className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Projects ({projects.length})
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="bg-card border border-border/60 p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No projects associated with this client.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setLocation(`/admin/projects/${p.id}`)}
                className="w-full text-left bg-card border border-border/60 p-4 hover:border-primary/30 transition-colors flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Created {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {p.estimated_budget && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />{" "}
                      {fmt(p.estimated_budget)}
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
