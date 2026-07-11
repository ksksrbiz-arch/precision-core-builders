/**
 * Core Values Ledger — immutable record of every decision, inspection, permit, and change.
 * "Trust through transparency" — the core principle.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { GuideHelpButton } from "@/components/GuideHelpButton";
import { QueryError } from "@/components/QueryError";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { formatCurrency } from "@/lib/formatters";
import { fmtDate } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
  ClipboardCheck,
  DollarSign,
  FileText,
  Landmark,
  Milestone,
  Plus,
  Shield,
  StickyNote,
} from "lucide-react";
import { useState } from "react";

const ENTRY_ICONS: Record<string, any> = {
  decision: Landmark,
  change_order: ArrowUpDown,
  inspection: ClipboardCheck,
  permit: Shield,
  milestone: Milestone,
  cost_adjustment: DollarSign,
  note: StickyNote,
};
const ENTRY_COLORS: Record<string, string> = {
  decision: "text-blue-400 bg-blue-400/10",
  change_order: "text-amber-400 bg-amber-400/10",
  inspection: "text-green-400 bg-green-400/10",
  permit: "text-purple-400 bg-purple-400/10",
  milestone: "text-primary bg-primary/10",
  cost_adjustment: "text-red-400 bg-red-400/10",
  note: "text-muted-foreground bg-muted-foreground/10",
};

// Must match server/routers/ledgerRouter.ts EntryTypeEnum.
const ENTRY_TYPES = [
  "decision",
  "change_order",
  "inspection",
  "permit",
  "milestone",
  "cost_adjustment",
  "note",
] as const;

type EntryType = (typeof ENTRY_TYPES)[number];

export default function LedgerView() {
  const [projectId, setProjectId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<{
    entryType: EntryType;
    title: string;
    description: string;
    amountDelta: string;
    visibleToClient: boolean;
  }>({
    entryType: "note",
    title: "",
    description: "",
    amountDelta: "",
    visibleToClient: true,
  });
  const utils = trpc.useUtils();
  const { data: projects } = trpc.projects.list.useQuery({ pageSize: 100 });
  const { data, isLoading, isError, refetch } = trpc.ledger.list.useQuery(
    { projectId: projectId!, page, pageSize: 50 },
    { enabled: !!projectId }
  );

  const appendMut = useMutationWithToast(trpc.ledger.append.useMutation(), {
    success: "Entry Recorded",
    successMessage: "Ledger entry recorded.",
    error: "Record Failed",
    errorMessage: "Failed to record entry. Please try again.",
    invalidate: () => utils.ledger.list.invalidate(),
    onSuccess: () => {
      setShowNew(false);
      setForm({
        entryType: "note",
        title: "",
        description: "",
        amountDelta: "",
        visibleToClient: true,
      });
    },
  });

  // Live updates: new ledger entries appear without a manual refresh.
  useRealtimeTable({
    table: "ledger_entries",
    onUpdate: () => utils.ledger.list.invalidate(),
  });

  const fmtEntryDate = (d: string) =>
    fmtDate(d, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  const fmtDelta = (n: number | null) => {
    if (!n) return null;
    const sign = n > 0 ? "+" : "";
    return `${sign}${formatCurrency(Math.abs(n))}`;
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Core Values Ledger
            </h1>
            <GuideHelpButton guideId="ledger" />
          </div>
          {projectId && (
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Plus className="h-3.5 w-3.5" /> New Entry
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground font-light mb-5">
          Every decision, permit, inspection, and cost change — permanently
          recorded. Entries cannot be edited or deleted.
        </p>

        {/* Project selector */}
        <select
          value={projectId ?? ""}
          onChange={e => {
            setProjectId(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
          className="bg-input border border-border text-sm text-foreground px-3 py-2.5 focus:outline-none focus:border-primary/60 w-full sm:w-auto sm:min-w-[260px] mb-6"
        >
          <option value="">Select a project…</option>
          {projects?.data.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* New entry form */}
        {showNew && projectId && (
          <div className="bg-card border border-primary/30 p-6 mb-6 space-y-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Append Ledger Entry
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Type
                </label>
                <select
                  value={form.entryType}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      entryType: e.target.value as EntryType,
                    }))
                  }
                  className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60"
                >
                  {ENTRY_TYPES.map(t => (
                    <option key={t} value={t}>
                      {t
                        .replace("_", " ")
                        .replace(/\b\w/g, c => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e =>
                    setForm(prev => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60"
                />
              </div>
            </div>
            <div>
              <label
                className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Description *
              </label>
              <textarea
                value={form.description}
                onChange={e =>
                  setForm(prev => ({ ...prev, description: e.target.value }))
                }
                rows={3}
                className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60 resize-none"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Cost Impact ($)
                </label>
                <input
                  type="number"
                  value={form.amountDelta}
                  onChange={e =>
                    setForm(prev => ({ ...prev, amountDelta: e.target.value }))
                  }
                  placeholder="+500 or -200"
                  className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.visibleToClient}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        visibleToClient: e.target.checked,
                      }))
                    }
                    className="accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">
                    Visible to client
                  </span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  appendMut.mutate({
                    projectId: projectId!,
                    entryType: form.entryType,
                    title: form.title,
                    description: form.description,
                    amountDelta: form.amountDelta
                      ? Number(form.amountDelta)
                      : undefined,
                    visibleToClient: form.visibleToClient,
                  })
                }
                disabled={
                  !form.title || !form.description || appendMut.isPending
                }
                className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {appendMut.isPending ? "Recording…" : "Record Entry"}
              </button>
            </div>
          </div>
        )}

        {/* Ledger entries — timeline style */}
        {!projectId ? (
          <Empty className="bg-card border border-border/60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Shield className="h-6 w-6 text-muted-foreground/60" />
              </EmptyMedia>
              <EmptyTitle>No project selected</EmptyTitle>
              <EmptyDescription>
                Select a project above to view its decision ledger.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : isLoading ? (
          <div className="space-y-4" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border border-border/60 p-4 space-y-2"
              >
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <QueryError
            message="We couldn't load the ledger. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : !data?.data.length ? (
          <Empty className="bg-card border border-border/60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText className="h-6 w-6 text-muted-foreground/60" />
              </EmptyMedia>
              <EmptyTitle>No ledger entries yet</EmptyTitle>
              <EmptyDescription>
                Decisions, permits, inspections, and cost changes will appear
                here once recorded.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <button
                onClick={() => setShowNew(true)}
                className="text-primary text-sm underline"
              >
                Add the first entry
              </button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border/40" />

            <div className="space-y-0">
              {data.data.map((entry: any) => {
                const Icon = ENTRY_ICONS[entry.entry_type] ?? StickyNote;
                const color =
                  ENTRY_COLORS[entry.entry_type] ?? ENTRY_COLORS.note;
                const delta = fmtDelta(entry.amount_delta);

                return (
                  <div key={entry.id} className="relative pl-12 pb-6">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-2.5 top-1 h-5 w-5 rounded-full flex items-center justify-center ${color}`}
                    >
                      <Icon className="h-2.5 w-2.5" />
                    </div>

                    <div className="bg-card border border-border/60 p-4">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div>
                          <span
                            className={`text-[9px] font-bold tracking-widest uppercase ${color.split(" ")[0]}`}
                            style={{ fontFamily: "var(--font-condensed)" }}
                          >
                            {entry.entry_type.replace("_", " ")}
                          </span>
                          <h3 className="text-sm font-semibold mt-0.5">
                            {entry.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {delta && (
                            <span
                              className={`text-xs font-bold ${entry.amount_delta > 0 ? "text-red-400" : "text-green-400"}`}
                            >
                              {delta}
                            </span>
                          )}
                          {entry.visible_to_client && (
                            <span
                              className="text-[9px] text-muted-foreground/40"
                              title="Visible to client"
                            >
                              <CheckCircle className="h-3 w-3 inline" />
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground font-light whitespace-pre-line">
                        {entry.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground/40 mt-2">
                        {fmtEntryDate(entry.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
