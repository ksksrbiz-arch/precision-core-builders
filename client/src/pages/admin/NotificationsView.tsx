/**
 * NotificationsView — admin notification center: send and track client notifications.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { GuideHelpButton } from "@/components/GuideHelpButton";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Plus,
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

  const utils = trpc.useUtils();

  const { data: clients } = trpc.clients.list.useQuery({ pageSize: 100 });
  const { data: projects } = trpc.projects.list.useQuery({ pageSize: 100 });

  // Load recent notifications (admin sees all via a different query pattern)
  // We use the list endpoint which normally filters by recipientId.
  // For the admin view we show a placeholder noting this is a send-only interface.

  const set = (key: keyof SendFormState, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const sendMut = useMutationWithToast(
    trpc.notifications.send.useMutation(),
    {
      success: "Notification Sent",
      successMessage: "Notification dispatched successfully.",
      error: "Send Failed",
      errorMessage: "Failed to send notification. Please check the inputs.",
      invalidate: () => utils.notifications.list.invalidate(),
      onSuccess: () => {
        setShowCompose(false);
        setForm(DEFAULT_FORM);
      },
    }
  );

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
  const clientsWithUser =
    clients?.data?.filter((c: any) => c.user_id) ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Notifications
            </h1>
            <GuideHelpButton guideId="notifications" />
          </div>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <Plus className="h-3.5 w-3.5" /> New Notification
          </button>
        </div>

        {/* Compose panel */}
        {showCompose && (
          <div className="bg-card border border-primary/30 p-6 mb-6 space-y-4 relative">
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
                <div className="flex gap-2">
                  {(["email", "sms", "in_app"] as Channel[]).map(ch => (
                    <button
                      key={ch}
                      onClick={() => set("channel", ch)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold tracking-widest uppercase border transition-colors ${
                        form.channel === ch
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/40"
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
            <div
              key={channel}
              className="bg-card border border-border/60 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-primary">
                  {CHANNEL_ICONS[channel]}
                </span>
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

        {/* Notification log note */}
        <div className="bg-card border border-border/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="h-4 w-4 text-primary" />
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Notification Log
            </p>
          </div>
          <p className="text-sm text-muted-foreground font-light">
            All sent notifications are logged in the database and visible to
            recipients in their client portal under the{" "}
            <strong className="text-foreground font-medium">Payments</strong>{" "}
            tab. In-app notifications are surfaced in the portal's notification
            bell. Email and SMS delivery status is updated via n8n webhook
            callbacks.
          </p>
          <div className="mt-4 pt-4 border-t border-border/40 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <StatusChip status="pending" />
              <span>Queued for delivery</span>
            </span>
            <span className="flex items-center gap-1.5">
              <StatusChip status="sent" />
              <span>Dispatched to provider</span>
            </span>
            <span className="flex items-center gap-1.5">
              <StatusChip status="read" />
              <span>Opened by recipient</span>
            </span>
            <span className="flex items-center gap-1.5">
              <StatusChip status="failed" />
              <span>Delivery failed</span>
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
