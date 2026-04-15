/**
 * Activity Log — Real-time platform event & audit log viewer.
 *
 * Shows all [AUDIT] ledger entries and subscribes to new entries via Supabase
 * Realtime so the dev/admin can see every platform action as it happens.
 * Provides filtering by action type, date range, and free-text search.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  Info,
  RefreshCw,
  Search,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────

type LogLevel = "info" | "warn" | "error" | "success";

type LogEntry = {
  id: string | number;
  timestamp: string;
  level: LogLevel;
  action: string;
  actor: string;
  projectId?: number | null;
  details?: string;
  source: "audit" | "realtime" | "system";
};

// ── Helpers ───────────────────────────────────────────────────────────────

function levelFromAction(action: string): LogLevel {
  if (action.includes("delete")) return "warn";
  if (action.includes("error") || action.includes("fail")) return "error";
  if (action.includes("publish") || action.includes("approve")) return "success";
  return "info";
}

function parseAuditEntry(row: Record<string, unknown>): LogEntry {
  const title = String(row.title ?? "");
  const description = String(row.description ?? "");

  // Extract action from "[AUDIT] action.name" title format
  const action = title.replace(/^\[AUDIT\]\s*/, "").trim() || "unknown";

  // Extract actor from description "User: email | Action: ..."
  const actorMatch = description.match(/User:\s*([^|]+)/);
  const actor = actorMatch ? actorMatch[1].trim() : "unknown";

  // Extract detail snippet
  const detailMatch = description.match(/Details:\s*(.+?)(\s*\||\s*$)/);
  const details = detailMatch ? detailMatch[1].trim() : undefined;

  return {
    id: row.id as string | number,
    timestamp: row.created_at as string,
    level: levelFromAction(action),
    action,
    actor,
    projectId: row.project_id as number | null,
    details,
    source: "audit",
  };
}

/** Format ISO timestamp to locale-aware short form. */
function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Level badge ───────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<LogLevel, { icon: React.ReactNode; cls: string; dot: string }> = {
  info: {
    icon: <Info className="h-3 w-3" />,
    cls: "text-sky-400/80 bg-sky-500/10 border-sky-500/20",
    dot: "bg-sky-400",
  },
  success: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    cls: "text-green-400/80 bg-green-500/10 border-green-500/20",
    dot: "bg-green-400",
  },
  warn: {
    icon: <AlertTriangle className="h-3 w-3" />,
    cls: "text-amber-400/80 bg-amber-500/10 border-amber-500/20",
    dot: "bg-amber-400",
  },
  error: {
    icon: <AlertTriangle className="h-3 w-3" />,
    cls: "text-red-400/80 bg-red-500/10 border-red-500/20",
    dot: "bg-red-400",
  },
};

function LevelBadge({ level }: { level: LogLevel }) {
  const { icon, cls } = LEVEL_STYLES[level];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${cls}`}
    >
      {icon}
      {level}
    </span>
  );
}

// ── Log row ───────────────────────────────────────────────────────────────

function LogRow({ entry, isNew }: { entry: LogEntry; isNew?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { dot } = LEVEL_STYLES[entry.level];

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, x: -8, backgroundColor: "rgba(200,168,75,0.08)" } : false}
      animate={{ opacity: 1, x: 0, backgroundColor: "rgba(0,0,0,0)" }}
      transition={{ duration: 0.4 }}
      className="border-b border-border/30 last:border-0"
    >
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors group"
      >
        {/* Live dot */}
        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />

        {/* Timestamp */}
        <span
          className="font-mono text-[10px] text-muted-foreground/50 shrink-0 mt-0.5 w-[128px]"
        >
          {fmt(entry.timestamp)}
        </span>

        {/* Level */}
        <span className="shrink-0 mt-px">
          <LevelBadge level={entry.level} />
        </span>

        {/* Action */}
        <span className="flex-1 font-mono text-xs text-foreground/80 truncate">
          {entry.action}
        </span>

        {/* Actor */}
        <span className="text-[10px] text-muted-foreground/50 truncate max-w-[140px] shrink-0">
          {entry.actor}
        </span>

        {/* Expand chevron */}
        {entry.details && (
          <ChevronDown
            className={`h-3 w-3 text-muted-foreground/30 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && entry.details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <pre className="px-4 pb-3 pl-12 font-mono text-[10px] text-muted-foreground/70 whitespace-pre-wrap break-all">
              {entry.details}
              {entry.projectId ? `\nProject ID: ${entry.projectId}` : ""}
              {entry.source !== "audit" ? `\nSource: ${entry.source}` : ""}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

export default function ActivityLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [realtimeOn, setRealtimeOn] = useState(false);
  const [newIds, setNewIds] = useState<Set<string | number>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch historical audit entries ──────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("ledger_entries")
        .select("id,title,description,project_id,created_at")
        .like("title", "[AUDIT]%")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (dbError) throw dbError;

      const parsed = (data ?? []).map(r =>
        parseAuditEntry(r as Record<string, unknown>)
      );
      // Display in chronological order (oldest first, newest at bottom)
      setEntries(parsed.reverse());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load activity log"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // ── Supabase Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("activity-log-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ledger_entries",
        },
        payload => {
          const row = payload.new as Record<string, unknown>;
          // Only handle [AUDIT] entries
          const title = String(row.title ?? "");
          if (!title.startsWith("[AUDIT]")) return;

          const entry = parseAuditEntry(row);
          entry.source = "realtime";
          setEntries(prev => [...prev, entry]);
          setNewIds(prev => new Set(prev).add(entry.id));
          setTimeout(() => {
            setNewIds(prev => {
              const next = new Set(prev);
              next.delete(entry.id);
              return next;
            });
          }, 3000);
        }
      )
      .subscribe(status => {
        setRealtimeOn(status === "SUBSCRIBED");
      });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Auto-scroll to bottom on new entries ─────────────────────────────────
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, autoScroll]);

  // ── Filtered view ─────────────────────────────────────────────────────────
  const filtered = entries.filter(e => {
    if (levelFilter !== "all" && e.level !== levelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.action.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        (e.details?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const counts: Record<LogLevel | "total", number> = {
    total: entries.length,
    info: entries.filter(e => e.level === "info").length,
    success: entries.filter(e => e.level === "success").length,
    warn: entries.filter(e => e.level === "warn").length,
    error: entries.filter(e => e.level === "error").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span
              className="block text-[9px] tracking-[0.25em] uppercase text-muted-foreground/50 mb-1"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Developer Tools
            </span>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Activity Log
            </h1>
            <p className="text-sm text-muted-foreground/60 font-light mt-1">
              Real-time stream of all platform events and admin actions.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Realtime indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium border ${
                realtimeOn
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-border/40 bg-muted/20 text-muted-foreground/50"
              }`}
            >
              {realtimeOn ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {realtimeOn ? "Live" : "Offline"}
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchEntries}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium border border-border/40 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={() => setEntries([])}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium border border-border/40 hover:border-destructive/40 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          </div>
        </div>

        {/* ── KPI bar ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-2">
          {(
            [
              { label: "Total", val: counts.total, color: "text-foreground" },
              { label: "Info", val: counts.info, color: "text-sky-400" },
              {
                label: "Success",
                val: counts.success,
                color: "text-green-400",
              },
              { label: "Warn", val: counts.warn, color: "text-amber-400" },
              { label: "Error", val: counts.error, color: "text-red-400" },
            ] as const
          ).map(({ label, val, color }) => (
            <div
              key={label}
              className="bg-card border border-border/60 p-3 text-center"
            >
              <p className={`text-lg font-bold font-mono ${color}`}>{val}</p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
            <input
              type="text"
              placeholder="Search actions, actors, details…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>

          {/* Level filter */}
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground/40" />
            {(["all", "info", "success", "warn", "error"] as const).map(
              lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider border transition-colors ${
                    levelFilter === lvl
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/40 text-muted-foreground/50 hover:border-border"
                  }`}
                >
                  {lvl}
                </button>
              )
            )}
          </div>

          {/* Auto-scroll toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll(a => !a)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium border transition-colors ${
              autoScroll
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/40 text-muted-foreground/50"
            }`}
          >
            <Activity className="h-3 w-3" />
            Auto-scroll
          </button>
        </div>

        {/* ── Log viewer ──────────────────────────────────────────────── */}
        <div className="bg-card border border-border/60 overflow-hidden">
          {/* Console header bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/40 font-mono">
              <Clock className="h-3 w-3" />
              <span>
                {filtered.length} of {counts.total} events
              </span>
            </div>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-muted/10">
            <span className="w-1.5 shrink-0" />
            <span className="w-[128px] shrink-0 text-[9px] uppercase tracking-widest text-muted-foreground/30 font-mono">
              Timestamp
            </span>
            <span className="w-16 shrink-0 text-[9px] uppercase tracking-widest text-muted-foreground/30">
              Level
            </span>
            <span className="flex-1 text-[9px] uppercase tracking-widest text-muted-foreground/30 font-mono">
              Action
            </span>
            <span className="w-[140px] shrink-0 text-[9px] uppercase tracking-widest text-muted-foreground/30">
              Actor
            </span>
            <span className="w-3 shrink-0" />
          </div>

          {/* Log rows */}
          <div className="max-h-[520px] overflow-y-auto overscroll-contain font-mono">
            {loading && (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground/40 text-sm">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading audit log…
              </div>
            )}

            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive/50" />
                <div>
                  <p className="text-sm font-medium text-destructive/80">
                    Failed to load
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-1 max-w-xs">
                    {error}
                  </p>
                  <p className="text-[10px] text-muted-foreground/30 mt-2">
                    Supabase may not be configured. Connect it in the Netlify
                    dashboard to enable log persistence.
                  </p>
                </div>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/20" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground/50">
                    No events yet
                  </p>
                  <p className="text-xs text-muted-foreground/30 mt-1">
                    {search || levelFilter !== "all"
                      ? "Try clearing your filters."
                      : "Audit events will appear here as admin actions are performed."}
                  </p>
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {filtered.map(entry => (
                <LogRow
                  key={entry.id}
                  entry={entry}
                  isNew={newIds.has(entry.id)}
                />
              ))}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Dev credentials reminder ──────────────────────────────── */}
        {import.meta.env.VITE_DEV_MODE === "true" && (
          <div className="border border-amber-500/20 bg-amber-500/5 p-4 text-[10px] text-amber-400/70 leading-relaxed">
            <strong className="font-bold uppercase tracking-wider">
              Dev Mode Active
            </strong>{" "}
            · You are logged in as{" "}
            <code className="font-mono">dev@precisioncorebuilders.com</code> with
            full admin access. The Activity Log above streams all{" "}
            <code className="font-mono">[AUDIT]</code> ledger entries in
            real-time via Supabase Realtime (requires Supabase connection).
            Server-side logs are visible in the Netlify Functions log viewer or
            your local terminal.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
