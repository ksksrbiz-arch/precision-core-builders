/**
 * Estimates — all cost estimates with send/approve workflow.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { SkeletonCard, SkeletonTable } from "@/components/Skeletons";
import { QueryError } from "@/components/QueryError";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Send,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function EstimatesList() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const utils = trpc.useUtils();
  const isMobile = useIsMobile();

  const { data, isLoading, isError, refetch } = trpc.estimates.list.useQuery({
    page,
    pageSize: 20,
  });

  const sendMut = useMutationWithToast(trpc.estimates.markSent.useMutation(), {
    success: "Estimate Sent",
    successMessage: "Estimate sent to client.",
    error: "Send Failed",
    errorMessage: "Failed to send estimate. Please try again.",
    invalidate: () => utils.estimates.list.invalidate(),
  });

  const approveMut = useMutationWithToast(
    trpc.estimates.markApproved.useMutation(),
    {
      success: "Estimate Approved",
      successMessage: "Estimate approved and locked.",
      error: "Approve Failed",
      errorMessage: "Failed to approve estimate. Please try again.",
      invalidate: () => utils.estimates.list.invalidate(),
    }
  );

  const fmt = (n: number | string | null | undefined) =>
    n ? `$${Number(n).toLocaleString()}` : "—";
  const fmtDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "";

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <AdminPageHeader
          title="Estimates"
          guideId="estimates"
          description="Manage pricing proposals, send approvals, and monitor estimate lifecycle."
          actions={
            <button
              onClick={() => setLocation("/estimator")}
              className="flex min-h-11 items-center gap-2 bg-primary text-primary-foreground px-4 py-3 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Calculator className="h-3.5 w-3.5" /> New Estimate
            </button>
          }
        />

        {isLoading ? (
          isMobile ? (
            <SkeletonCard count={5} />
          ) : (
            <div className="bg-card border border-border/60 p-4 md:p-6">
              <SkeletonTable rows={6} cols={6} />
            </div>
          )
        ) : isError ? (
          <QueryError
            message="We couldn't load estimates. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : data?.data.length === 0 ? (
          <div className="bg-card border border-border/60 p-12 text-center">
            <Calculator className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm mb-3">
              No estimates created yet
            </p>
            <button
              onClick={() => setLocation("/estimator")}
              className="text-primary text-sm underline"
            >
              Run your first estimate
            </button>
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {data?.data.map((est: any) => {
              const isSent = !!est.sent_to_client;
              const isApproved = !!est.approved_by_client;
              const expired =
                est.expires_at && new Date(est.expires_at) < new Date();

              return (
                <div
                  key={est.id}
                  className="bg-card border border-border/60 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {est.projects?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {est.clients?.name ?? "Walk-in"}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground shrink-0">
                      {fmtDate(est.created_at)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                        Type
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {est.project_type ?? "General"}
                        {est.square_footage
                          ? ` · ${est.square_footage} sq ft`
                          : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                        Range
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-foreground">
                        <DollarSign className="h-3 w-3 text-primary" />
                        <span className="font-medium">
                          {fmt(est.estimated_low)}
                        </span>
                        <span className="text-muted-foreground/50">–</span>
                        <span className="font-medium">
                          {fmt(est.estimated_high)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isApproved ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-green-400"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        <CheckCircle2 className="h-3 w-3" /> Approved
                      </span>
                    ) : isSent ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-blue-400"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        <Send className="h-3 w-3" /> Sent {fmtDate(est.sent_at)}
                      </span>
                    ) : expired ? (
                      <span
                        className="text-[10px] font-bold tracking-widest uppercase text-red-400/60"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        Expired
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        <Clock className="h-3 w-3" /> Draft
                      </span>
                    )}
                  </div>

                  {(!isSent || (isSent && !isApproved)) && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {!isSent && (
                        <button
                          onClick={() => sendMut.mutate({ id: est.id })}
                          disabled={sendMut.isPending}
                          className="w-full rounded border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] font-bold tracking-widest uppercase text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          Send Estimate
                        </button>
                      )}
                      {isSent && !isApproved && (
                        <button
                          onClick={() => approveMut.mutate({ id: est.id })}
                          disabled={approveMut.isPending}
                          className="w-full rounded border border-green-400/30 bg-green-400/10 px-3 py-2 text-[11px] font-bold tracking-widest uppercase text-green-400 transition-colors hover:bg-green-400/15 disabled:opacity-50"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          Approve Estimate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    {[
                      "Project / Client",
                      "Type",
                      "Range",
                      "Status",
                      "Created",
                      "Actions",
                    ].map(h => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((est: any) => {
                    const isSent = !!est.sent_to_client;
                    const isApproved = !!est.approved_by_client;
                    const expired =
                      est.expires_at && new Date(est.expires_at) < new Date();

                    return (
                      <tr
                        key={est.id}
                        className="border-b border-border/20 hover:bg-primary/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium truncate max-w-[200px]">
                            {est.projects?.name ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {est.clients?.name ?? "Walk-in"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {est.project_type ?? "General"}
                          {est.square_footage
                            ? ` · ${est.square_footage} sq ft`
                            : ""}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-primary" />
                            <span className="font-medium">
                              {fmt(est.estimated_low)}
                            </span>
                            <span className="text-muted-foreground/50">–</span>
                            <span className="font-medium">
                              {fmt(est.estimated_high)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isApproved ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-green-400"
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              <CheckCircle2 className="h-3 w-3" /> Approved
                            </span>
                          ) : isSent ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-blue-400"
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              <Send className="h-3 w-3" /> Sent{" "}
                              {fmtDate(est.sent_at)}
                            </span>
                          ) : expired ? (
                            <span
                              className="text-[10px] font-bold tracking-widest uppercase text-red-400/60"
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              Expired
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50"
                              style={{ fontFamily: "var(--font-condensed)" }}
                            >
                              <Clock className="h-3 w-3" /> Draft
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {fmtDate(est.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {!isSent && (
                              <button
                                onClick={() => sendMut.mutate({ id: est.id })}
                                disabled={sendMut.isPending}
                                className="text-[10px] font-bold tracking-widest uppercase text-primary hover:text-primary/70 transition-colors"
                                style={{ fontFamily: "var(--font-condensed)" }}
                              >
                                Send
                              </button>
                            )}
                            {isSent && !isApproved && (
                              <button
                                onClick={() =>
                                  approveMut.mutate({ id: est.id })
                                }
                                disabled={approveMut.isPending}
                                className="text-[10px] font-bold tracking-widest uppercase text-green-400 hover:text-green-400/70 transition-colors"
                                style={{ fontFamily: "var(--font-condensed)" }}
                              >
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
          <div className="mt-6 flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {Math.ceil(data.total / 20)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 20 >= data.total}
              className="flex items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary disabled:opacity-30"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
