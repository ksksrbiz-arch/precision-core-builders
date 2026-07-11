/**
 * Clients — list all clients with project counts and quick actions.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { Pagination } from "@/components/Pagination";
import { SkeletonCard } from "@/components/Skeletons";
import { QueryError } from "@/components/QueryError";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { useDebounce } from "@/hooks/useDebounce";
import { useEntityForm } from "@/hooks/useEntityForm";
import { usePagination } from "@/hooks/usePagination";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { trpc } from "@/lib/trpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Mail, MapPin, Phone, Plus, Search, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function ClientsList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [showNew, setShowNew] = useState(false);
  const form = useEntityForm({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "OR",
    notes: "",
    leadSource: "",
  });

  const utils = trpc.useUtils();
  const [total, setTotal] = useState(0);
  const pager = usePagination(total, { pageSize: 20 });
  const { data, isLoading, isError, refetch } = trpc.clients.list.useQuery({
    page: pager.page,
    pageSize: 20,
    search: debouncedSearch || undefined,
  });
  useEffect(() => {
    if (data) setTotal(data.total);
  }, [data]);

  const createMut = useMutationWithToast(trpc.clients.create.useMutation(), {
    success: "Client Created",
    successMessage: "New client added.",
    error: "Create Failed",
    errorMessage: "Failed to create client. Please try again.",
    invalidate: () => utils.clients.list.invalidate(),
    onSuccess: () => {
      setShowNew(false);
      form.reset();
    },
  });

  const deleteMut = useMutationWithToast(trpc.clients.delete.useMutation(), {
    success: "Client Deleted",
    successMessage: "Client record removed.",
    error: "Delete Failed",
    errorMessage: "Failed to delete client. Please try again.",
    invalidate: () => utils.clients.list.invalidate(),
  });

  // Live updates: client records added/edited elsewhere refresh here.
  useRealtimeTable({
    table: "clients",
    onUpdate: () => utils.clients.list.invalidate(),
  });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <AdminPageHeader
          title="Clients"
          guideId="clients"
          description="Manage homeowner records, contact details, and account-level actions."
          actions={
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 min-h-11 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Plus className="h-3.5 w-3.5" /> New Client
            </button>
          }
        />

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              pager.setPage(1);
            }}
            className="w-full pl-9 pr-4 py-3 bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
          />
        </div>

        {showNew && (
          <div className="bg-card border border-primary/30 p-6 mb-5 space-y-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
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
                  <label
                    className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={(form.values as any)[f.key]}
                    onChange={e =>
                      form.setField(
                        f.key as keyof typeof form.values,
                        e.target.value
                      )
                    }
                    className="w-full bg-input border border-border text-sm text-foreground p-3 focus:outline-none focus:border-primary/60"
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
                value={form.values.notes}
                onChange={e => form.setField("notes", e.target.value)}
                rows={2}
                className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNew(false);
                  form.reset();
                }}
                className="px-4 py-3 min-h-11 border border-border/60 text-muted-foreground text-[11px] md:text-xs font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => createMut.mutate(form.values)}
                disabled={
                  !form.values.name || !form.values.email || createMut.isPending
                }
                className="px-4 py-3 min-h-11 bg-primary text-primary-foreground text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {createMut.isPending ? "Saving..." : "Save Client"}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <SkeletonCard count={5} />
        ) : isError ? (
          <QueryError
            message="We couldn't load your clients. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : data?.data.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No clients yet</EmptyTitle>
              <EmptyDescription>
                Add your first client to link projects, estimates, and portal
                access.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <button
                onClick={() => setShowNew(true)}
                className="text-[11px] text-primary border border-primary/40 px-4 py-2 tracking-wider uppercase hover:bg-primary/10 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                + Add your first client
              </button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-2">
            {data?.data.map((client: any) => {
              const projectCount = client.projects?.length ?? 0;
              const activeProjects =
                client.projects?.filter(
                  (p: any) =>
                    p.status === "in_progress" || p.status === "contracted"
                ).length ?? 0;
              return (
                <div
                  key={client.id}
                  className="bg-card border border-border/60 p-4 md:p-5 hover:border-primary/20 transition-colors flex items-center gap-3 sm:gap-4"
                >
                  <div className="h-12 w-12 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {client.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                  </div>
                  <button
                    onClick={() => setLocation(`/admin/clients/${client.id}`)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm md:text-base font-semibold truncate">
                      {client.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {client.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" />
                          {client.email}
                        </span>
                      )}
                      {client.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {client.city}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {projectCount > 0 && (
                      <span className="hidden sm:inline text-xs text-muted-foreground">
                        {projectCount} project{projectCount !== 1 ? "s" : ""}
                        {activeProjects > 0 && (
                          <span className="text-primary ml-1">
                            ({activeProjects} active)
                          </span>
                        )}
                      </span>
                    )}
                    {client.phone && (
                      <a
                        href={`tel:${client.phone}`}
                        aria-label={`Call ${client.name}`}
                        className="h-11 w-11 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-accent/50 transition-colors active:scale-95"
                        onClick={e => e.stopPropagation()}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          aria-label={`Delete ${client.name}`}
                          className="h-11 w-11 inline-flex items-center justify-center rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors active:scale-95"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete {client.name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes this client record. Active
                            projects will remain.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMut.mutate({ id: client.id })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
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

        <Pagination
          page={pager.page}
          pageCount={pager.pageCount}
          canPrev={pager.canPrev}
          canNext={pager.canNext}
          prev={pager.prev}
          next={pager.next}
          className="mt-6"
        />
      </div>
    </DashboardLayout>
  );
}
