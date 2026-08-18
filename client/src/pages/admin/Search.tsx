/**
 * Admin — LLM-Powered Operational Search
 * Natural-language search across projects, clients, reports, materials, schedule.
 *
 * Mobile-first: the query field stacks above the submit button on phones and
 * sits inline from `sm:` up; result rows collapse their metadata onto a second
 * line rather than squeezing the title.
 */
import { AdminPageHeader } from "@/components/AdminPageHeader";
import DashboardLayout from "@/components/DashboardLayout";
import { QueryError } from "@/components/QueryError";
import { SkeletonCard } from "@/components/Skeletons";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { getAuthHeader } from "@/lib/authHeader";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  FileText,
  FolderOpen,
  Loader2,
  Package,
  Search,
  Sparkles,
  Users,
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

const SEARCH_INPUT_ID = "admin-operational-search";

export default function SearchView() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setResponse(null);
    setLastQuery(q);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeader()),
        },
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

  // Group results by type. Guard `results` in case a 200 body omits it, so a
  // malformed response can't throw on `.reduce`.
  const grouped = (response?.results ?? []).reduce(
    (acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type].push(r);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <AdminPageHeader
          title="Find Anything"
          guideId="search"
          eyebrow="Operational Search"
          description="Ask in plain English — search across projects, clients, reports, materials, and schedules."
        />

        {/* Search form */}
        <form onSubmit={handleSubmit} className="mb-5 sm:mb-6">
          <Label
            htmlFor={SEARCH_INPUT_ID}
            className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary mb-2"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Search query
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              />
              <input
                id={SEARCH_INPUT_ID}
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g. 'active projects over $200k'"
                className="w-full min-h-11 pl-10 pr-4 py-3 bg-card border border-border/60 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="min-h-11 w-full sm:w-auto px-4 sm:px-5 py-3 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {loading ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles aria-hidden="true" className="h-4 w-4" />
              )}
              Search
            </button>
          </div>
        </form>

        {/* Example queries */}
        {!response && !loading && !error && (
          <div className="mb-6 sm:mb-8">
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
                  type="button"
                  onClick={() => handleExample(q)}
                  aria-label={`Search for ${q}`}
                  className="min-h-11 sm:min-h-0 px-3 py-2 sm:py-1.5 text-xs text-muted-foreground border border-border/60 bg-card hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div aria-busy="true" aria-live="polite">
            <p className="sr-only">Searching…</p>
            <SkeletonCard count={3} />
          </div>
        ) : error ? (
          <QueryError
            message={`We couldn't run that search. ${error}`}
            onRetry={() => runSearch(lastQuery || query)}
          />
        ) : (
          <AnimatePresence>
            {response && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {/* Summary */}
                <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
                  <span className="font-semibold text-foreground">
                    {response.total}
                  </span>{" "}
                  result{response.total !== 1 ? "s" : ""} for &ldquo;
                  {response.summary}&rdquo;
                </p>

                {response.total === 0 ? (
                  <Empty className="bg-card border border-border/60">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Search />
                      </EmptyMedia>
                      <EmptyTitle>No results found</EmptyTitle>
                      <EmptyDescription>
                        Nothing matched that query. Try broader wording, a
                        project name, or one of the example searches above.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div className="space-y-5 sm:space-y-6">
                    {Object.entries(grouped).map(([type, items]) => {
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
                                type="button"
                                onClick={() => setLocation(item.href)}
                                aria-label={`Open ${cfg.label}: ${item.title}`}
                                className="w-full bg-card border border-border/60 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left group"
                              >
                                <div
                                  className={`h-8 w-8 border flex items-center justify-center shrink-0 ${cfg.color} border-current/30`}
                                >
                                  <Icon
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
                                    {item.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {item.subtitle}
                                  </p>
                                  {item.meta && (
                                    <span className="sm:hidden block text-xs font-semibold text-muted-foreground mt-1">
                                      {item.meta}
                                    </span>
                                  )}
                                </div>
                                {item.meta && (
                                  <span className="hidden sm:inline text-xs font-semibold text-muted-foreground shrink-0">
                                    {item.meta}
                                  </span>
                                )}
                                <ArrowRight
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-primary transition-colors"
                                />
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
        )}
      </div>
    </DashboardLayout>
  );
}
