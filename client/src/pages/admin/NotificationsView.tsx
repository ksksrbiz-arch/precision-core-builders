/**
 * NotificationsView — admin notification center: send and track client notifications.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Filter,
  Inbox,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Send,
  Smartphone,
  X,
} from "lucide-react";
import { useState } from "react";

type Channel = "email" | "sms" | "in_app";

type SendFormState = {
  recipientId: string;
  projectId: string;
  channel: Channel;
  subject: string;
  body: string;
};

type NotificationFeedItem = {
  id: number;
  channel: Channel;
  status: keyof typeof STATUS_LABELS;
  subject: string | null;
  body: string;
  created_at: string;
  sent_at: string | null;
  read_at: string | null;
  failure_reason: string | null;
  projects: Array<{ name: string }> | null;
  recipient: { id: number; name: string; email: string } | null;
};

const DEFAULT_FORM: SendFormState = {
  recipientId: "",
  projectId: "",
  channel: "email",
  subject: "",
  body: "",
};

const CHANNEL_ICONS: Record<Channel, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  sms: <Smartphone className="h-3.5 w-3.5" />,
  in_app: <Bell className="h-3.5 w-3.5" />,
};

const CHANNEL_LABELS: Record<Channel, string> = {
  email: "Email",
  sms: "SMS",
  in_app: "In-App",
};

const STATUS_LABELS = {
  pending: "Pending",
  sent: "Sent",
  read: "Read",
  failed: "Failed",
} as const;
const FEED_PAGE_SIZE = 12;

const QUICK_TEMPLATES: Record<
  Channel,
  Array<{ label: string; subject?: string; body: string }>
> = {
  email: [
    {
      label: "Weekly update",
      subject: "Project Update",
      body: "Here’s your latest project update: work is progressing on schedule, and I’ll share the next milestone as soon as it’s complete.",
    },
    {
      label: "Material delay",
      subject: "Schedule Update",
      body: "A supplier delay has impacted the current timeline. We’re adjusting sequencing now and will send a revised schedule shortly.",
    },
  ],
  sms: [
    {
      label: "Crew arrival",
      body: "Precision Core update: the crew is on the way and scheduled to arrive shortly.",
    },
    {
      label: "Inspection reminder",
      body: "Reminder: your project inspection is scheduled soon. We’ll confirm once it’s complete.",
    },
  ],
  in_app: [
    {
      label: "Milestone posted",
      body: "A new project milestone has been posted to your client portal.",
    },
    {
      label: "Action required",
      body: "A decision is waiting for review in your client portal.",
    },
  ],
};

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "text-yellow-400 border-yellow-400/30",
    sent: "text-green-400 border-green-400/30",
    read: "text-primary border-primary/30",
    failed: "text-red-400 border-red-400/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 border font-bold tracking-widest uppercase ${map[status] ?? "text-muted-foreground border-border/60"}`}
      style={{ fontFamily: "var(--font-condensed)" }}
    >
      {status === "sent" || status === "read" ? (
        <CheckCircle2 className="h-2.5 w-2.5" />
      ) : (
        <Clock className="h-2.5 w-2.5" />
      )}
      {status}
    </span>
  );
}

export default function NotificationsView() {
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState<SendFormState>(DEFAULT_FORM);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "sent" | "read" | "failed" | undefined
  >(undefined);
  const [channelFilter, setChannelFilter] = useState<Channel | undefined>(
    undefined
  );

  const utils = trpc.useUtils();

  const { data: clients } = trpc.clients.list.useQuery({ pageSize: 100 });
  const { data: projects } = trpc.projects.list.useQuery({ pageSize: 100 });
  const { data: feed, isLoading: feedLoading } =
    trpc.notifications.adminList.useQuery({
      page,
      pageSize: FEED_PAGE_SIZE,
      search: search || undefined,
      status: statusFilter,
      channel: channelFilter,
    });

  const set = (key: keyof SendFormState, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const sendMut = useMutationWithToast(trpc.notifications.send.useMutation(), {
    success: "Notification Sent",
    successMessage: "Notification dispatched successfully.",
    error: "Send Failed",
    errorMessage: "Failed to send notification. Please check the inputs.",
    invalidate: () => utils.notifications.list.invalidate(),
    onSuccess: () => {
      utils.notifications.adminList.invalidate();
      setShowCompose(false);
      setForm(DEFAULT_FORM);
    },
  });

  const handleSend = () => {
    if (!form.recipientId || !form.body) return;
    sendMut.mutate({
      recipientId: form.recipientId,
      projectId: form.projectId ? parseInt(form.projectId) : undefined,
      channel: form.channel,
      subject: form.subject || undefined,
      body: form.body,
    });
  };

  const inputCls =
    "w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60";
  const selectCls =
    "w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60";

  // Get all client users who have userId set
  const clientsWithUser = clients?.data?.filter((c: any) => c.user_id) ?? [];
  const selectedProject = projects?.data?.find(
    (project: any) => String(project.id) === form.projectId
  );
  const selectedClient = clientsWithUser.find(
    (client: any) => client.user_id === form.recipientId
  );
  const visibleNotifications: NotificationFeedItem[] = feed?.data ?? [];
  const queueStats = visibleNotifications.reduce(
    (acc, item) => {
      if (item.status === "pending") acc.pending += 1;
      if (item.status === "failed") acc.failed += 1;
      if (item.status === "read") acc.read += 1;
      return acc;
    },
    { pending: 0, failed: 0, read: 0 }
  );

  const applyTemplate = (template: { subject?: string; body: string }) => {
    setForm(prev => ({
      ...prev,
      subject:
        prev.channel === "email"
          ? (template.subject ?? prev.subject)
          : prev.subject,
      body: template.body,
    }));
  };

  const formatTimestamp = (value: string | null) => {
    if (!value) return "Queued";
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <AdminPageHeader
          title="Notifications"
          guideId="notifications"
          description="Compose client updates, review delivery health, and track recent notification activity in one place."
          actions={
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Plus className="h-3.5 w-3.5" /> New Notification
            </button>
          }
        />

        <div className="grid gap-4 mb-6 sm:grid-cols-3">
          <div className="bg-card border border-border/60 p-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground/70"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Reachable Clients
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {clientsWithUser.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Portal-enabled recipients available for direct messaging
            </p>
          </div>
          <div className="bg-card border border-border/60 p-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground/70"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Recent Queue Health
            </p>
            <div className="mt-2 flex items-end gap-3">
              <p className="text-2xl font-semibold text-foreground">
                {queueStats.pending}
              </p>
              <p className="text-xs text-muted-foreground pb-1">pending</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {queueStats.failed > 0
                ? `${queueStats.failed} delivery issue${queueStats.failed === 1 ? "" : "s"} need attention`
                : "No recent delivery failures in the current feed"}
            </p>
          </div>
          <div className="bg-card border border-border/60 p-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground/70"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Activity Feed
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {feed?.total ?? 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {queueStats.read} read in the visible results
            </p>
          </div>
        </div>

        {/* Compose panel */}
        {showCompose && (
          <div className="bg-card border border-primary/30 p-6 mb-6 space-y-5 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <button
              onClick={() => {
                setShowCompose(false);
                setForm(DEFAULT_FORM);
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Compose Notification
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-border/50 bg-background/40 p-4">
                <p
                  className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-foreground/70"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Selected Recipient
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {selectedClient?.name ?? "Choose a client"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedClient?.email ??
                    "Portal-enabled clients appear here for quick targeting."}
                </p>
              </div>
              <div className="border border-border/50 bg-background/40 p-4">
                <p
                  className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-foreground/70"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Linked Project
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {selectedProject?.name ?? "No project attached"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attach a project to keep the message context visible in the
                  portal.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Recipient */}
              <div>
                <label
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Recipient (Client) *
                </label>
                {clientsWithUser.length > 0 ? (
                  <select
                    value={form.recipientId}
                    onChange={e => set("recipientId", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Select client…</option>
                    {clientsWithUser.map((c: any) => (
                      <option key={c.user_id} value={c.user_id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={form.recipientId}
                      onChange={e => set("recipientId", e.target.value)}
                      placeholder="Client user UUID"
                      className={inputCls}
                    />
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      No clients with portal access found. Enter user ID
                      manually.
                    </p>
                  </div>
                )}
              </div>

              {/* Project (optional) */}
              <div>
                <label
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Related Project (optional)
                </label>
                <select
                  value={form.projectId}
                  onChange={e => set("projectId", e.target.value)}
                  className={selectCls}
                >
                  <option value="">No project</option>
                  {projects?.data?.map((project: any) => (
                    <option key={project.id} value={String(project.id)}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel */}
              <div>
                <label
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Channel
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(["email", "sms", "in_app"] as Channel[]).map(ch => (
                    <button
                      key={ch}
                      onClick={() => set("channel", ch)}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase border transition-colors ${
                        form.channel === ch
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/15"
                          : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-primary"
                      }`}
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {CHANNEL_ICONS[ch]}
                      {CHANNEL_LABELS[ch]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject (email only) */}
              {form.channel === "email" && (
                <div>
                  <label
                    className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    Subject
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={e => set("subject", e.target.value)}
                    placeholder="e.g. Project Update — Week 3"
                    className={inputCls}
                  />
                </div>
              )}
            </div>

            {/* Body */}
            <div>
              <label
                className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Message *
              </label>
              <textarea
                value={form.body}
                onChange={e => set("body", e.target.value)}
                rows={5}
                placeholder={
                  form.channel === "sms"
                    ? "Keep under 160 characters for best delivery…"
                    : "Compose your message to the client…"
                }
                className={`${inputCls} resize-none`}
              />
              {form.channel === "sms" && form.body.length > 0 && (
                <p
                  className={`text-[10px] mt-1 ${
                    form.body.length > 160
                      ? "text-red-400"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {form.body.length}/160 chars
                  {form.body.length > 160 &&
                    " — will be split into multiple segments"}
                </p>
              )}
            </div>

            <div>
              <p
                className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-2"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Quick Templates
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TEMPLATES[form.channel].map(template => (
                  <button
                    key={`${form.channel}-${template.label}`}
                    onClick={() => applyTemplate(template)}
                    className="px-3 py-1.5 text-xs text-muted-foreground border border-border/60 bg-background/40 hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCompose(false);
                  setForm(DEFAULT_FORM);
                }}
                className="px-4 py-2 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!form.recipientId || !form.body || sendMut.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <Send className="h-3 w-3" />
                {sendMut.isPending ? "Sending…" : "Send Notification"}
              </button>
            </div>
          </div>
        )}

        {/* Info panel — channels explanation */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {(
            [
              {
                channel: "email" as Channel,
                desc: "Delivered via n8n → SendGrid. Best for detailed project updates and summaries.",
              },
              {
                channel: "sms" as Channel,
                desc: "Dispatched via n8n → Twilio. Ideal for urgent alerts and time-sensitive updates.",
              },
              {
                channel: "in_app" as Channel,
                desc: "Appears in client portal notification bell. No external delivery required.",
              },
            ] as Array<{ channel: Channel; desc: string }>
          ).map(({ channel, desc }) => (
            <div key={channel} className="bg-card border border-border/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-primary">{CHANNEL_ICONS[channel]}</span>
                <p
                  className="text-[10px] font-bold tracking-[0.15em] uppercase text-foreground"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {CHANNEL_LABELS[channel]}
                </p>
              </div>
              <p className="text-xs text-muted-foreground font-light">{desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border/60 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-primary" />
              <div>
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Notification Log
                </p>
                <p className="mt-1 text-sm text-muted-foreground font-light">
                  Search recent deliveries, spot failures, and verify which
                  client received what.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <StatusChip status="pending" />
                <span>Queued</span>
              </span>
              <span className="flex items-center gap-1.5">
                <StatusChip status="sent" />
                <span>Sent</span>
              </span>
              <span className="flex items-center gap-1.5">
                <StatusChip status="read" />
                <span>Read</span>
              </span>
              <span className="flex items-center gap-1.5">
                <StatusChip status="failed" />
                <span>Failed</span>
              </span>
            </div>
          </div>

          <div className="grid gap-3 mb-5 md:grid-cols-[minmax(0,1fr),180px,180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search subject or message body…"
                className="w-full bg-input border border-border text-sm text-foreground pl-9 pr-3 py-2.5 focus:outline-none focus:border-primary/60"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(
                  (e.target.value || undefined) as
                    | "pending"
                    | "sent"
                    | "read"
                    | "failed"
                    | undefined
                );
                setPage(1);
              }}
              className="w-full bg-input border border-border text-sm text-foreground px-3 py-2.5 focus:outline-none focus:border-primary/60"
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={channelFilter}
              onChange={e => {
                setChannelFilter(
                  (e.target.value || undefined) as Channel | undefined
                );
                setPage(1);
              }}
              className="w-full bg-input border border-border text-sm text-foreground px-3 py-2.5 focus:outline-none focus:border-primary/60"
            >
              <option value="">All channels</option>
              {(["email", "sms", "in_app"] as Channel[]).map(channel => (
                <option key={channel} value={channel}>
                  {CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {feedLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading recent notifications…
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="border border-dashed border-border/60 bg-background/30 p-10 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No notifications match the current filters.
                </p>
              </div>
            ) : (
              visibleNotifications.map(item => {
                const channel = item.channel as Channel;
                const projectName = item.projects?.[0]?.name ?? "No project";
                const failed = item.status === "failed";

                return (
                  <div
                    key={item.id}
                    className={`border p-4 transition-colors ${
                      failed
                        ? "border-red-400/30 bg-red-400/5"
                        : "border-border/60 bg-background/20 hover:border-primary/20"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center border border-current/20 bg-background/60 text-primary">
                            {CHANNEL_ICONS[channel]}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {item.subject ??
                                `${CHANNEL_LABELS[channel]} notification`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.recipient?.name ?? "Unknown recipient"} ·{" "}
                              {projectName}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip status={item.status} />
                        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">
                          {CHANNEL_LABELS[channel]}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      {item.body}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span>
                        Created{" "}
                        <strong className="text-foreground font-medium">
                          {formatTimestamp(item.created_at)}
                        </strong>
                      </span>
                      <span>
                        Sent{" "}
                        <strong className="text-foreground font-medium">
                          {formatTimestamp(item.sent_at)}
                        </strong>
                      </span>
                      {item.read_at && (
                        <span>
                          Read{" "}
                          <strong className="text-foreground font-medium">
                            {formatTimestamp(item.read_at)}
                          </strong>
                        </span>
                      )}
                      {item.failure_reason && (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <AlertTriangle className="h-3 w-3" />
                          {item.failure_reason}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {(feed?.total ?? 0) > 12 && (
            <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground">
              <span>
                Page {page} of {Math.ceil((feed?.total ?? 0) / FEED_PAGE_SIZE)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="border border-border/60 px-3 py-1.5 hover:border-primary/40 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={page * FEED_PAGE_SIZE >= (feed?.total ?? 0)}
                  className="border border-border/60 px-3 py-1.5 hover:border-primary/40 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-border/40 flex items-start gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <p>
              Delivery records update when downstream providers report status
              back through n8n callbacks. In-app notifications are immediately
              visible in the client portal bell.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
