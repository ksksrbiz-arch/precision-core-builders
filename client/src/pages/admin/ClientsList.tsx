/**
 * Clients — list all clients with project counts and quick actions.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { GuideHelpButton } from "@/components/GuideHelpButton";
import { trpc } from "@/lib/trpc";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Mail, MapPin, Phone, Plus, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function ClientsList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "", state: "OR", notes: "", leadSource: "" });

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.clients.list.useQuery({ page, pageSize: 20, search: search || undefined });
  const createMut = trpc.clients.create.useMutation({ onSuccess: () => { utils.clients.list.invalidate(); setShowNew(false); resetForm(); } });
  const deleteMut = trpc.clients.delete.useMutation({ onSuccess: () => utils.clients.list.invalidate() });

  const resetForm = () => setForm({ name: "", email: "", phone: "", city: "", state: "OR", notes: "", leadSource: "" });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>Clients</h1>
            <GuideHelpButton guideId="clients" />
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}>
            <Plus className="h-3.5 w-3.5" /> New Client
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input type="text" placeholder="Search by name or email…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60" />
        </div>

        {/* New client form */}
        {showNew && (
          <div className="bg-card border border-primary/30 p-6 mb-5 space-y-4">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary" style={{ fontFamily: "var(--font-condensed)" }}>
              New Client
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { key: "name", label: "Full Name *", type: "text" },
                { key: "email", label: "Email *", type: "email" },
                { key: "phone", label: "Phone", type: "tel" },
                { key: "city", label: "City", type: "text" },
                { key: "leadSource", label: "Lead Source", type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block" style={{ fontFamily: "var(--font-condensed)" }}>
                    {f.label}
                  </label>
                  <input type={f.type} value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block" style={{ fontFamily: "var(--font-condensed)" }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={2}
                className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowNew(false); resetForm(); }}
                className="px-4 py-2 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}>Cancel</button>
              <button onClick={() => createMut.mutate(form)} disabled={!form.name || !form.email || createMut.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}>
                {createMut.isPending ? "Saving…" : "Save Client"}
              </button>
            </div>
          </div>
        )}

        {/* Client cards */}
        {isLoading ? (
          <div className="bg-card border border-border/60 p-12 text-center text-muted-foreground text-sm">Loading…</div>
        ) : data?.data.length === 0 ? (
          <div className="bg-card border border-border/60 p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm mb-3">No clients yet</p>
            <button onClick={() => setShowNew(true)} className="text-primary text-sm underline">Add your first client</button>
          </div>
        ) : (
          <div className="space-y-2">
            {data?.data.map((client: any) => {
              const projectCount = client.projects?.length ?? 0;
              const activeProjects = client.projects?.filter((p: any) => p.status === "in_progress" || p.status === "contracted").length ?? 0;

              return (
                <div key={client.id} className="bg-card border border-border/60 p-4 hover:border-primary/20 transition-colors flex items-center gap-4">
                  {/* Avatar */}
                  <div className="h-11 w-11 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  </div>

                  {/* Info */}
                  <button onClick={() => setLocation(`/admin/clients/${client.id}`)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold truncate">{client.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {client.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{client.email}</span>}
                      {client.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{client.city}</span>}
                    </div>
                  </button>

                  {/* Project badges */}
                  <div className="flex items-center gap-3 shrink-0">
                    {projectCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {projectCount} project{projectCount !== 1 ? "s" : ""}
                        {activeProjects > 0 && <span className="text-primary ml-1">({activeProjects} active)</span>}
                      </span>
                    )}
                    {client.phone && (
                      <a href={`tel:${client.phone}`} className="text-muted-foreground hover:text-primary transition-colors">
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-muted-foreground/40 hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {client.name}?</AlertDialogTitle>
                          <AlertDialogDescription>This permanently removes this client record. Active projects will remain.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMut.mutate({ id: client.id })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {data && data.total > 20 && (
          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="text-xs text-muted-foreground">Page {page} of {Math.ceil(data.total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= data.total}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
