/**
 * Estimates — all cost estimates with send/approve workflow.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { GuideHelpButton } from "@/components/GuideHelpButton";
import { trpc } from "@/lib/trpc";
import { Calculator, CheckCircle2, ChevronLeft, ChevronRight, Clock, DollarSign, Send } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function EstimatesList() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.estimates.list.useQuery({ page, pageSize: 20 });
  const sendMut = trpc.estimates.markSent.useMutation({ onSuccess: () => utils.estimates.list.invalidate() });
  const approveMut = trpc.estimates.markApproved.useMutation({ onSuccess: () => utils.estimates.list.invalidate() });

  const fmt = (n: number | string | null | undefined) => n ? `$${Number(n).toLocaleString()}` : "—";
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>Estimates</h1>
            <GuideHelpButton guideId="estimates" />
          </div>
          <button onClick={() => setLocation("/estimator")}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}>
            <Calculator className="h-3.5 w-3.5" /> New Estimate
          </button>
        </div>

        {isLoading ? (
          <div className="bg-card border border-border/60 p-12 text-center text-muted-foreground text-sm">Loading…</div>
        ) : data?.data.length === 0 ? (
          <div className="bg-card border border-border/60 p-12 text-center">
            <Calculator className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm mb-3">No estimates created yet</p>
            <button onClick={() => setLocation("/estimator")} className="text-primary text-sm underline">Run your first estimate</button>
          </div>
        ) : (
          <div className="bg-card border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    {["Project / Client", "Type", "Range", "Status", "Created", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                          style={{ fontFamily: "var(--font-condensed)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((est: any) => {
                    const isSent = !!est.sent_to_client;
                    const isApproved = !!est.approved_by_client;
                    const expired = est.expires_at && new Date(est.expires_at) < new Date();

                    return (
                      <tr key={est.id} className="border-b border-border/20 hover:bg-primary/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium truncate max-w-[200px]">{est.projects?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{est.clients?.name ?? "Walk-in"}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {est.project_type ?? "General"}{est.square_footage ? ` · ${est.square_footage} sq ft` : ""}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-primary" />
                            <span className="font-medium">{fmt(est.estimated_low)}</span>
                            <span className="text-muted-foreground/50">–</span>
                            <span className="font-medium">{fmt(est.estimated_high)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-green-400"
                                  style={{ fontFamily: "var(--font-condensed)" }}>
                              <CheckCircle2 className="h-3 w-3" /> Approved
                            </span>
                          ) : isSent ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-blue-400"
                                  style={{ fontFamily: "var(--font-condensed)" }}>
                              <Send className="h-3 w-3" /> Sent {fmtDate(est.sent_at)}
                            </span>
                          ) : expired ? (
                            <span className="text-[10px] font-bold tracking-widest uppercase text-red-400/60"
                                  style={{ fontFamily: "var(--font-condensed)" }}>Expired</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50"
                                  style={{ fontFamily: "var(--font-condensed)" }}>
                              <Clock className="h-3 w-3" /> Draft
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(est.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {!isSent && (
                              <button onClick={() => sendMut.mutate({ id: est.id })} disabled={sendMut.isPending}
                                className="text-[10px] font-bold tracking-widest uppercase text-primary hover:text-primary/70 transition-colors"
                                style={{ fontFamily: "var(--font-condensed)" }}>
                                Send
                              </button>
                            )}
                            {isSent && !isApproved && (
                              <button onClick={() => approveMut.mutate({ id: est.id })} disabled={approveMut.isPending}
                                className="text-[10px] font-bold tracking-widest uppercase text-green-400 hover:text-green-400/70 transition-colors"
                                style={{ fontFamily: "var(--font-condensed)" }}>
                                Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data && data.total > 20 && (
          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="text-xs text-muted-foreground">Page {page} of {Math.ceil(data.total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= data.total}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
