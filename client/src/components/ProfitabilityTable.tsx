/**
 * ProfitabilityTable — per-project margin tracking for the Analytics page.
 * Complements the estimated-vs-actual chart with concrete profit, margin %,
 * and budget variance, plus portfolio totals. Pure presentation: the profit /
 * margin / variance math now lives server-side in
 * `projects.profitabilitySummary` (single source of truth) and this component
 * only shapes it for display.
 */
import { TrendingUp } from "lucide-react";
import { formatCompactCurrency, formatPercent } from "@/lib/formatters";

/** One per-project row as returned by `projects.profitabilitySummary`. */
export type ProfitabilityRow = {
  id: number;
  name: string;
  status?: string | null;
  contracted: number;
  estimated: number;
  actualCost: number;
  basis: number;
  profit: number;
  marginPct: number;
  variance: number;
  hasData: boolean;
};

/** Portfolio totals as returned by `projects.profitabilitySummary`. */
export type ProfitabilityTotals = {
  contracted: number;
  estimated: number;
  actualCost: number;
  profit: number;
  basis: number;
  marginPct: number;
};

const NAME_MAX = 28;
const MAX_ROWS = 12;

// Margin is only meaningful once there's a budget basis to measure against.
const marginClass = (basis: number, marginPct: number) =>
  basis <= 0
    ? "text-muted-foreground"
    : marginPct >= 20
      ? "text-green-400"
      : marginPct >= 10
        ? "text-amber-400"
        : "text-red-400";

const marginText = (basis: number, marginPct: number) =>
  basis <= 0 ? "—" : formatPercent(marginPct, 1);

export default function ProfitabilityTable({
  projects,
  totals,
}: {
  projects: ProfitabilityRow[];
  totals: ProfitabilityTotals;
}) {
  const rows = projects
    .filter(r => r.hasData)
    .sort((a, b) => b.contracted - a.contracted)
    .slice(0, MAX_ROWS);

  if (rows.length === 0) {
    return (
      <div className="bg-card border border-border/60 p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3
            className="text-xs font-bold tracking-[0.18em] uppercase text-muted-foreground"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Project Profitability
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Add contracted budgets and logged costs to track profitability.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/60 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3
          className="text-xs font-bold tracking-[0.18em] uppercase text-muted-foreground"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          Project Profitability
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/70 border-b border-border/40">
              <th className="text-left font-medium py-2 pr-3">Project</th>
              <th className="text-right font-medium py-2 px-3">Contracted</th>
              <th className="text-right font-medium py-2 px-3">Actual</th>
              <th className="text-right font-medium py-2 px-3">Profit</th>
              <th className="text-right font-medium py-2 pl-3">Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr
                key={r.id}
                className="border-b border-border/20 last:border-0"
              >
                <td className="py-2 pr-3 truncate" title={r.name}>
                  {r.name.length > NAME_MAX
                    ? r.name.slice(0, NAME_MAX) + "…"
                    : r.name}
                  {r.variance > 0 && (
                    <span className="ml-2 text-[10px] text-red-400/80">
                      +{formatCompactCurrency(r.variance)} vs est
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                  {r.contracted > 0 ? formatCompactCurrency(r.contracted) : "—"}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                  {formatCompactCurrency(r.actualCost)}
                </td>
                <td
                  className={`py-2 px-3 text-right tabular-nums ${
                    r.profit >= 0 ? "text-foreground" : "text-red-400"
                  }`}
                >
                  {formatCompactCurrency(r.profit)}
                </td>
                <td
                  className={`py-2 pl-3 text-right tabular-nums font-medium ${marginClass(
                    r.basis,
                    r.marginPct
                  )}`}
                >
                  {marginText(r.basis, r.marginPct)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border/40 font-semibold">
              <td className="py-2 pr-3">Portfolio</td>
              <td className="py-2 px-3 text-right tabular-nums">
                {formatCompactCurrency(totals.contracted)}
              </td>
              <td className="py-2 px-3 text-right tabular-nums">
                {formatCompactCurrency(totals.actualCost)}
              </td>
              <td
                className={`py-2 px-3 text-right tabular-nums ${
                  totals.profit >= 0 ? "text-foreground" : "text-red-400"
                }`}
              >
                {formatCompactCurrency(totals.profit)}
              </td>
              <td
                className={`py-2 pl-3 text-right tabular-nums ${marginClass(
                  totals.basis,
                  totals.marginPct
                )}`}
              >
                {marginText(totals.basis, totals.marginPct)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
