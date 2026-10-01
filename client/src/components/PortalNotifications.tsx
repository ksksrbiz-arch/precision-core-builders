/**
 * PortalNotifications — the client-facing end of the admin "Notifications"
 * page. Admins can send an `in_app` notification (and `markSent` on an estimate
 * creates one), but no portal screen read `notifications.list`, so those
 * messages went nowhere. This card shows the caller's most recent notices and
 * lets them mark them read.
 */
import { trpc } from "@/lib/trpc";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { fmtDate } from "@/lib/formatters";
import { Bell, CheckCheck } from "lucide-react";

const MAX_SHOWN = 5;

type Notice = {
  id: number;
  subject: string | null;
  body: string;
  channel: string;
  status: string;
  read_at: string | null;
  created_at: string;
};

export function PortalNotifications({ enabled = true }: { enabled?: boolean }) {
  const utils = trpc.useUtils();
  const { data, isLoading, isError } = trpc.notifications.list.useQuery(
    {},
    { enabled }
  );
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  // A notice sent while the portal is open shows up without a refresh.
  useRealtimeTable({
    table: "notifications",
    enabled,
    onUpdate: () => utils.notifications.list.invalidate(),
  });

  // Email/SMS rows are delivery records; the portal feed is the in-app channel.
  const notices = ((data ?? []) as Notice[]).filter(
    n => n.channel === "in_app" && n.status !== "failed"
  );
  if (!enabled || isLoading || isError || notices.length === 0) return null;

  const unread = notices.filter(n => !n.read_at);
  const shown = notices.slice(0, MAX_SHOWN);

  return (
    <section
      aria-labelledby="portal-notifications-heading"
      className="bg-card border border-border/60 p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <h2
          id="portal-notifications-heading"
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <Bell className="h-4 w-4 text-primary" />
          Notifications
          {unread.length > 0 && (
            <span
              className="text-[10px] px-2 py-0.5 border border-primary/40 text-primary bg-primary/10 font-bold tracking-wider"
              aria-label={`${unread.length} unread`}
            >
              {unread.length}
            </span>
          )}
        </h2>
        {unread.length > 0 && (
          <button
            type="button"
            onClick={() => markRead.mutate({ ids: unread.map(n => n.id) })}
            disabled={markRead.isPending}
            className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {shown.map(n => (
          <li
            key={n.id}
            className={`border p-3 ${
              n.read_at
                ? "border-border/40 opacity-70"
                : "border-primary/30 bg-primary/5"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {n.subject && (
                  <p className="text-sm font-medium break-words">{n.subject}</p>
                )}
                <p className="text-xs text-muted-foreground whitespace-pre-line break-words">
                  {n.body}
                </p>
              </div>
              <time
                dateTime={n.created_at}
                className="text-[10px] text-muted-foreground/70 shrink-0"
              >
                {fmtDate(n.created_at, { month: "short", day: "numeric" })}
              </time>
            </div>
            {!n.read_at && (
              <button
                type="button"
                onClick={() => markRead.mutate({ ids: [n.id] })}
                disabled={markRead.isPending}
                className="mt-2 text-[10px] font-bold tracking-widest uppercase text-primary hover:text-primary/70 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Mark read
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default PortalNotifications;
