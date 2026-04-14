/**
 * Client Portal — Published Field Reports
 * Read-only view of reports Eric has published to this client.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ASSETS } from "@/const";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  LogOut,
} from "lucide-react";
import { useLocation } from "wouter";

function PortalNav() {
  const { signOut } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-[64px] flex items-center border-b border-border/50 bg-background/95 backdrop-blur-md">
      <div className="container flex items-center justify-between">
        <a href="/" aria-label="Home">
          <img
            src={ASSETS.logo}
            alt="Precision Core Builders"
            className="h-8 w-auto"
          />
        </a>
        <nav className="hidden sm:flex items-center gap-6">
          {[
            { label: "Overview", href: "/portal" },
            { label: "Reports", href: "/portal/reports" },
            { label: "Selections", href: "/portal/finishes" },
            { label: "Ledger", href: "/portal/ledger" },
            { label: "Payments", href: "/portal/payments" },
          ].map(n => (
            <a
              key={n.href}
              href={n.href}
              className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-muted-foreground hover:text-destructive transition-colors"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </div>
    </header>
  );
}

export default function PortalReports() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: projects } = trpc.projects.list.useQuery(
    { pageSize: 1 },
    { enabled: !!user }
  );
  const project = projects?.data?.[0];

  const { data: reports, isLoading } = trpc.fieldReports.listPublished.useQuery(
    { projectId: project?.id! },
    { enabled: !!project?.id }
  );

  const parseJSON = (s: string | null): string[] => {
    try {
      return JSON.parse(s ?? "[]");
    } catch {
      return [];
    }
  };
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PortalNav />
      <main className="pt-[64px]">
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
              Field Reports
            </p>
            <h1
              className="text-3xl font-semibold mb-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {project?.name ?? "Your Project"}
            </h1>
            <p className="text-sm text-muted-foreground font-light mb-8">
              Daily progress updates from Eric and his crew.
            </p>
          </motion.div>

          {isLoading ? (
            <div className="bg-card border border-border/60 p-12 text-center text-muted-foreground text-sm">
              Loading reports…
            </div>
          ) : !reports?.length ? (
            <div className="bg-card border border-border/60 p-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">
                No reports published yet. Eric will share updates as work
                progresses.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report: any) => {
                const tasks = parseJSON(report.tasks_completed);
                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border/60 p-6"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(report.report_date)}
                      </span>
                      <CheckCircle2 className="h-3 w-3 text-green-400 ml-auto" />
                    </div>
                    <p className="text-sm text-foreground mb-4 leading-relaxed">
                      {report.summary}
                    </p>
                    {tasks.length > 0 && (
                      <div>
                        <p
                          className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-2"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          Work Completed
                        </p>
                        <ul className="space-y-1">
                          {tasks.map((task: string, i: number) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <span className="text-primary mt-0.5">·</span>{" "}
                              {task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
