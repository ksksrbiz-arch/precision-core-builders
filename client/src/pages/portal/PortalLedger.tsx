/**
 * Client Portal — Decision Ledger
 * Transparent record of all decisions, permits, inspections visible to this client.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { fmtDate } from "@/lib/formatters";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpDown,
  ClipboardCheck,
  DollarSign,
  FileText,
  Landmark,
  Milestone,
  Shield,
  StickyNote,
} from "lucide-react";
import { useLocation } from "wouter";

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

export default function PortalLedger() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Portal clients use myProject; admins previewing the portal use list.
  const isAdmin = user?.role === "admin";
  const { data: myProject } = trpc.projects.myProject.useQuery(undefined, {
    enabled: !!user && !isAdmin,
  });
  const { data: adminProjects } = trpc.projects.list.useQuery(
    { pageSize: 1 },
    { enabled: !!user && isAdmin }
  );
  const project = isAdmin ? adminProjects?.data?.[0] : myProject;

  const { data: entries, isLoading } = trpc.ledger.listVisible.useQuery(
    { projectId: project?.id! },
    { enabled: !!project?.id }
  );

  const formatEntryDate = (d: string) =>
    fmtDate(d, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const fmtDelta = (n: number | null) => {
    if (!n) return null;
    return `${n > 0 ? "+" : ""}$${Math.abs(n).toLocaleString()}`;
  };

  return (
    <PortalLayout>
      <div className="container py-10 max-w-3xl">
        <button
          onClick={() => setLocation("/portal")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Portal
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p
            className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary mb-2"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Decision Ledger
          </p>
          <h1
            className="text-2xl sm:text-3xl font-semibold mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Project Record
          </h1>
          <p className="text-sm text-muted-foreground font-light mb-8">
            A transparent, permanent record of every decision, inspection,
            permit, and cost change on your project.
            <br />
            <span className="text-xs text-muted-foreground/50">
              Entries cannot be edited or removed — this is your guarantee of
              accountability.
            </span>
          </p>
        </motion.div>

        {isLoading ? (
          <div className="bg-card border border-border/60 p-12 text-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : !entries?.length ? (
          <div className="bg-card border border-border/60 p-12 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">
              No ledger entries yet. Eric will record decisions as your project
              progresses.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border/40" />
            <div className="space-y-0">
              {entries.map((entry: any) => {
                const Icon = ENTRY_ICONS[entry.entry_type] ?? StickyNote;
                const color =
                  ENTRY_COLORS[entry.entry_type] ?? ENTRY_COLORS.note;
                const delta = fmtDelta(entry.amount_delta);

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative pl-12 pb-6"
                  >
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
                        {delta && (
                          <span
                            className={`text-xs font-bold shrink-0 ${entry.amount_delta > 0 ? "text-red-400" : "text-green-400"}`}
                          >
                            {delta}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-light whitespace-pre-line">
                        {entry.description}
                      </p>
                      {entry.document_url && (
                        <a
                          href={entry.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                        >
                          <FileText className="h-3 w-3" />{" "}
                          {entry.document_name ?? "View Document"}
                        </a>
                      )}
                      <p className="text-[10px] text-muted-foreground/40 mt-2">
                        {formatEntryDate(entry.created_at)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
