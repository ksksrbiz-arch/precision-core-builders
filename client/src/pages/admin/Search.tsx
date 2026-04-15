/**
 * Admin — LLM-Powered Operational Search
 * Natural-language search across projects, clients, reports, materials, schedule.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  FileText,
  Loader2,
  Package,
  Search,
  Users,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "wouter";

type SearchResult = {
  type: string;
  id: number;
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
};

type SearchResponse = {
  results: SearchResult[];
  summary: string;
  total: number;
};

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Search; color: string; label: string }
> = {
  project: { icon: FolderOpen, color: "text-primary", label: "Project" },
  client: { icon: Users, color: "text-blue-400", label: "Client" },
  field_report: {
    icon: FileText,
    color: "text-green-400",
    label: "Field Report",
  },
  material: { icon: Package, color: "text-amber-400", label: "Material" },
  schedule_item: {
    icon: Calendar,
    color: "text-purple-400",
    label: "Schedule",
  },
};

const EXAMPLE_QUERIES = [
  "Active projects over $200k",
  "Field reports from last week",
  "Materials with shortages",
  "Roofing schedule items",
  "Clients in South Hills",
];

export default function SearchView() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const handleExample = (q: string) => {
    setQuery(q);
    runSearch(q);
  };

  // Group results by type
  const grouped = response?.results.reduce(
    (acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type].push(r);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p
            className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary mb-2"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Operational Search
          </p>
          <h1
            className="text-2xl font-semibold mb-1"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Find Anything
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            Ask in plain English — search across projects, clients, reports,
            materials, and schedules.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g. 'active projects over $200k' or 'roofing tasks this week'"
                className="w-full pl-10 pr-4 py-3 bg-card border border-border/60 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-3 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Search
            </button>
          </div>
        </form>

        {/* Example queries */}
        {!response && !loading && (
          <div className="mb-8">
            <p
              className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60 mb-3"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map(q => (
                <button
                  key={q}
                  onClick={() => handleExample(q)}
                  className="px-3 py-1.5 text-xs text-muted-foreground border border-border/60 bg-card hover:border-primary/40 hover:text-primary transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-400/10 border border-red-400/30 text-red-400 text-sm p-4 mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Searching with AI…</span>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {response && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Summary */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {response.total}
                  </span>{" "}
                  result{response.total !== 1 ? "s" : ""} for &ldquo;
                  {response.summary}&rdquo;
                </p>
              </div>

              {response.total === 0 ? (
                <div className="bg-card border border-border/60 p-12 text-center">
                  <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No results found. Try different keywords.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {grouped &&
                    Object.entries(grouped).map(([type, items]) => {
                      const cfg =
                        TYPE_CONFIG[type] ?? TYPE_CONFIG["field_report"];
                      const Icon = cfg.icon;
                      return (
                        <div key={type}>
                          <p
                            className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${cfg.color}`}
                            style={{ fontFamily: "var(--font-condensed)" }}
                          >
                            {cfg.label}s
                          </p>
                          <div className="space-y-1">
                            {items.map(item => (
                              <button
                                key={`${type}-${item.id}`}
                                onClick={() => setLocation(item.href)}
                                className="w-full bg-card border border-border/60 p-4 flex items-center gap-4 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                              >
                                <div
                                  className={`h-8 w-8 border flex items-center justify-center shrink-0 ${cfg.color} border-current/30`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
                                    {item.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {item.subtitle}
                                  </p>
                                </div>
                                {item.meta && (
                                  <span className="text-xs font-semibold text-muted-foreground shrink-0">
                                    {item.meta}
                                  </span>
                                )}
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-primary transition-colors" />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
