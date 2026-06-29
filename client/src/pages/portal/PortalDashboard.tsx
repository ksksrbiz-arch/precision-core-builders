/**
 * Client Portal — main dashboard showing their active project.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { trpc } from "@/lib/trpc";
import { fmtDate } from "@/lib/formatters";
import { SITE } from "@/const";
import { PortalLayout } from "@/components/layout/PortalLayout";
import PortalAssistant from "@/components/PortalAssistant";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Mail,
  MapPin,
  Phone,
  Shield,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";

export default function PortalDashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

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

  // Upcoming schedule items for this project
  const { data: schedule } = trpc.schedule.list.useQuery(
    { projectId: project?.id! },
    { enabled: !!project?.id }
  );
  const upcomingItems = (schedule ?? [])
    .filter((s: any) => s.status !== "complete")
    .sort(
      (a: any, b: any) =>
        new Date(a.planned_start_date ?? "").getTime() -
        new Date(b.planned_start_date ?? "").getTime()
    )
    .slice(0, 5);

  // Live updates: re-fetch when project or schedule data changes in Supabase
  useRealtimeTable({
    table: "projects",
    onUpdate: () => {
      utils.projects.myProject.invalidate();
      if (isAdmin) utils.projects.list.invalidate();
    },
  });
  useRealtimeTable({
    table: "schedule_items",
    onUpdate: () => {
      if (project?.id)
        utils.schedule.list.invalidate({ projectId: project.id });
    },
  });

  const STATUS_ICONS: Record<string, React.ElementType> = {
    complete: CheckCircle2,
    in_progress: Clock,
    pending: Circle,
    blocked: Clock,
    deferred: Circle,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <p className="text-muted-foreground mb-4">
            Please sign in to view your project portal.
          </p>
          <a href="/auth/login" className="text-primary underline">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <PortalLayout>
      <div className="container py-10 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p
            className="text-[11px] font-semibold tracking-[0.28em] uppercase text-primary mb-2"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Client Portal
          </p>
          <h1
            className="text-2xl sm:text-3xl font-semibold mb-1 break-words"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Welcome,{" "}
            <span className="text-gradient-gold">
              {user.name ?? user.email}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground font-light mb-8">
            Track your project progress, review reports, and manage selections.
          </p>
        </motion.div>

        {!project ? (
          <div className="bg-card border border-border/60 p-10 text-center">
            <Sparkles className="h-10 w-10 text-primary/40 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground font-light mb-2">
              No active project found.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Contact Eric at{" "}
              <a href={SITE.phoneHref} className="text-primary hover:underline">
                {SITE.phone}
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Project status card */}
            <div className="bg-card border border-border/60 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2
                    className="text-xl font-semibold"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {project.name}
                  </h2>
                  {project.city && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {project.city}, {project.state}
                    </p>
                  )}
                </div>
                <span
                  className="text-[10px] px-2.5 py-1 border border-primary/40 text-primary font-semibold tracking-widest uppercase bg-primary/10"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {project.status.replace("_", " ")}
                </span>
              </div>

              {/* Progress */}
              <div className="mb-2">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-xs text-muted-foreground font-light">
                    Project Progress
                  </p>
                  <p className="text-sm font-bold text-gradient-gold">
                    {project.completion_percent ?? 0}%
                  </p>
                </div>
                <div className="h-2 bg-input rounded-full overflow-hidden">
                  <div
                    className="h-full progress-gold rounded-full transition-all duration-700"
                    style={{ width: `${project.completion_percent ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Timeline */}
              {(project.estimated_start_date || project.estimated_end_date) && (
                <div className="flex gap-6 mt-4 pt-4 border-t border-border/40">
                  {project.estimated_start_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Start:{" "}
                      {new Date(
                        project.estimated_start_date
                      ).toLocaleDateString()}
                    </div>
                  )}
                  {project.estimated_end_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Completion:{" "}
                      {new Date(
                        project.estimated_end_date
                      ).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Site cam */}
            {project.site_cam_url && (
              <div className="bg-card border border-border/60 p-4">
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Live Site Camera
                </p>
                <div className="aspect-video bg-input rounded overflow-hidden">
                  <iframe
                    src={project.site_cam_url}
                    className="w-full h-full"
                    allowFullScreen
                    title="Live site camera"
                  />
                </div>
              </div>
            )}

            {/* Quick nav cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: FileText,
                  label: "Field Reports",
                  href: "/portal/reports",
                  desc: "Daily progress updates",
                },
                {
                  icon: Sparkles,
                  label: "Finish Selections",
                  href: "/portal/finishes",
                  desc: "Materials & budget impact",
                },
                {
                  icon: Shield,
                  label: "Decision Ledger",
                  href: "/portal/ledger",
                  desc: "Transparent record of all decisions",
                },
                {
                  icon: Calendar,
                  label: "Payments",
                  href: "/portal/payments",
                  desc: "Invoices & milestone billing",
                },
              ].map(({ icon: Icon, label, href, desc }) => (
                <button
                  key={href}
                  onClick={() => setLocation(href)}
                  className="card-lift bg-card border border-border/60 p-5 text-left hover:border-primary/30 hover:bg-primary/5"
                >
                  <Icon className="h-6 w-6 text-primary mb-3" />
                  <p className="text-sm font-semibold mb-1">{label}</p>
                  <p className="text-xs text-muted-foreground font-light">
                    {desc}
                  </p>
                </button>
              ))}
            </div>

            {/* Upcoming Schedule */}
            {upcomingItems.length > 0 && (
              <div className="bg-card border border-border/60 p-5">
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-4"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Upcoming Milestones
                </p>
                <div className="space-y-2">
                  {upcomingItems.map((item: any) => {
                    const Icon = STATUS_ICONS[item.status] ?? Circle;
                    const isActive = item.status === "in_progress";
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 border ${
                          isActive
                            ? "border-primary/30 bg-primary/5"
                            : "border-border/40"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground/40"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.title}
                          </p>
                          {item.planned_start_date && (
                            <p className="text-xs text-muted-foreground">
                              {fmtDate(item.planned_start_date, {
                                month: "short",
                                day: "numeric",
                              })}
                              {item.planned_end_date &&
                                ` – ${fmtDate(item.planned_end_date, { month: "short", day: "numeric" })}`}
                            </p>
                          )}
                        </div>
                        {isActive && (
                          <span
                            className="text-[9px] font-bold tracking-widest uppercase text-primary shrink-0"
                            style={{ fontFamily: "var(--font-condensed)" }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Project Assistant */}
            <div>
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Ask About Your Project
              </p>
              <PortalAssistant />
            </div>

            {/* Contact Eric */}
            <div className="bg-card border border-border/60 p-5">
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Contact Your Builder
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href={SITE.phoneHref}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4 text-primary" /> {SITE.phone}
                </a>
                <a
                  href={SITE.emailHref}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4 text-primary" /> {SITE.email}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
