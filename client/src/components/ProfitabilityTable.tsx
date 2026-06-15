/**
 * ProfitabilityTable — per-project margin tracking for the Analytics page.
 * Complements the estimated-vs-actual chart with concrete profit, margin %,
 * and budget variance, plus portfolio totals. Pure presentation; takes the
 * projects already fetched by Analytics.
 */
import { TrendingUp } from "lucide-react";

type ProjectRow = {
  id: number;
  name: string;
  status?: string | null;
  estimated_budget?: number | string | null;
  contracted_budget?: number | string | null;
  actual_cost?: number | string | null;
};

const n = (v: unknown): number => {
  const x = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(x) ? x : 0;
};

const money = (v: number): string =>
  `$${Math.round(v).toLocaleString("en-US")}`;

const NAME_MAX = 28;

export default function ProfitabilityTable({
  projects,
}: {
  projects: ProjectRow[];
}) {
  const rows = projects
    .map(p => {
      const contracted = n(p.contracted_budget);
      const estimated = n(p.estimated_budget);
      const actual = n(p.actual_cost);
      // Margin is only meaningful once there's a contracted value to measure against.
      const basis = contracted || estimated;
      const profit = basis - actual;
      const margin = basis > 0 ? (profit / basis) * 100 : null;
      const variance = estimated > 0 ? actual - estimated : null;
      return {
        id: p.id,
        name: p.name,
        contracted,
        estimated,
        actual,
        profit,
        margin,
        variance,
        hasData: basis > 0 || actual > 0,
      };
    })
    .filter(r => r.hasData)
    .sort((a, b) => b.contracted - a.contracted)
    .slice(0, 12);

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

  const totals = rows.reduce(
    (acc, r) => {
      acc.contracted += r.contracted;
      acc.actual += r.actual;
      return acc;
    },
    { contracted: 0, actual: 0 }
  );
  const totalProfit = totals.contracted - totals.actual;
  const totalMargin =
    totals.contracted > 0 ? (totalProfit / totals.contracted) * 100 : null;

  const marginClass = (m: number | null) =>
    m === null
      ? "text-muted-foreground"
      : m >= 20
        ? "text-green-400"
        : m >= 10
          ? "text-amber-400"
          : "text-red-400";

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
                  {r.variance !== null && r.variance > 0 && (
                    <span className="ml-2 text-[10px] text-red-400/80">
                      +{money(r.variance)} vs est
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                  {r.contracted > 0 ? money(r.contracted) : "—"}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                  {money(r.actual)}
                </td>
                <td
                  className={`py-2 px-3 text-right tabular-nums ${
                    r.profit >= 0 ? "text-foreground" : "text-red-400"
                  }`}
                >
                  {money(r.profit)}
                </td>
                <td
                  className={`py-2 pl-3 text-right tabular-nums font-medium ${marginClass(
                    r.margin
                  )}`}
                >
                  {r.margin === null ? "—" : `${r.margin.toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border/40 font-semibold">
              <td className="py-2 pr-3">Portfolio</td>
              <td className="py-2 px-3 text-right tabular-nums">
                {money(totals.contracted)}
              </td>
              <td className="py-2 px-3 text-right tabular-nums">
                {money(totals.actual)}
              </td>
              <td
                className={`py-2 px-3 text-right tabular-nums ${
                  totalProfit >= 0 ? "text-foreground" : "text-red-400"
                }`}
              >
                {money(totalProfit)}
              </td>
              <td
                className={`py-2 pl-3 text-right tabular-nums ${marginClass(
                  totalMargin
                )}`}
              >
                {totalMargin === null ? "—" : `${totalMargin.toFixed(1)}%`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
