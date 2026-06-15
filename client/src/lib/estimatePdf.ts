/**
 * Estimate PDF generator — zero-dependency, branded print-to-PDF.
 * Opens a print-styled window with the estimate laid out professionally and
 * triggers the browser's print dialog (Save as PDF). No external libraries.
 */
import { SITE } from "@/const";

type EstimateLike = {
  id: number;
  project_type?: string | null;
  square_footage?: number | string | null;
  estimated_low?: number | string | null;
  estimated_mid?: number | string | null;
  estimated_high?: number | string | null;
  labor_cost?: number | string | null;
  materials_cost?: number | string | null;
  permits_cost?: number | string | null;
  contingency?: number | string | null;
  ai_reasoning?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  clients?: { name?: string | null; email?: string | null } | null;
  projects?: { name?: string | null } | null;
};

const money = (v: unknown): string => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  if (!Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
};

const fmtDate = (v: unknown): string => {
  if (!v) return "—";
  const d = new Date(v as string);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
};

const esc = (s: unknown): string =>
  String(s ?? "").replace(
    /[&<>"']/g,
    c =>
      (
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }) as Record<string, string>
      )[c]
  );

function breakdownRow(label: string, value: unknown): string {
  const n = typeof value === "string" ? parseFloat(value) : (value as number);
  if (!Number.isFinite(n) || n === 0) return "";
  return `<tr><td>${esc(label)}</td><td class="num">${money(value)}</td></tr>`;
}

export function generateEstimatePdf(est: EstimateLike): void {
  const win = window.open("", "_blank", "width=850,height=1100");
  if (!win) {
    alert("Please allow pop-ups to download the estimate PDF.");
    return;
  }

  const client = est.clients?.name ?? "Prospective Client";
  const project = est.projects?.name ?? "New Project";
  const sqft = est.square_footage
    ? ` · ${Number(est.square_footage).toLocaleString()} sq ft`
    : "";

  const breakdown = [
    breakdownRow("Labor", est.labor_cost),
    breakdownRow("Materials", est.materials_cost),
    breakdownRow("Permits & Fees", est.permits_cost),
    breakdownRow("Contingency", est.contingency),
  ].join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Estimate #${esc(est.id)} — ${esc(SITE.name)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #2d2d2d; margin: 0; padding: 48px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .head { display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #8b7355; padding-bottom: 20px; margin-bottom: 28px; }
  .brand h1 { margin: 0; font-size: 24px; letter-spacing: .5px; }
  .brand .tag { color: #8b7355; font-size: 12px; font-style: italic; margin-top: 4px; }
  .brand .meta { color: #666; font-size: 11px; margin-top: 8px; line-height: 1.5; }
  .doc { text-align: right; }
  .doc .label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #999; }
  .doc h2 { margin: 2px 0 0; font-size: 20px; }
  .doc .meta { font-size: 11px; color: #666; margin-top: 8px; line-height: 1.6; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px;
    color: #8b7355; margin: 28px 0 10px; font-family: Arial, sans-serif; }
  .info { font-size: 14px; line-height: 1.6; }
  .tiers { display: flex; gap: 12px; margin-top: 8px; }
  .tier { flex: 1; border: 1px solid #ddd; padding: 16px; text-align: center; }
  .tier.mid { border-color: #8b7355; border-width: 2px; background: #f5f1ed; }
  .tier .t { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #999; }
  .tier .v { font-size: 22px; font-weight: bold; margin-top: 6px; }
  .tier.mid .v { color: #8b7355; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 14px; }
  td { padding: 8px 0; border-bottom: 1px solid #eee; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .notes { font-size: 13px; line-height: 1.7; color: #444; white-space: pre-wrap;
    background: #faf8f5; padding: 16px; border-left: 3px solid #8b7355; margin-top: 8px; }
  .foot { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd;
    font-size: 11px; color: #888; line-height: 1.6; }
  @media print { body { padding: 24px; } .noprint { display: none; } }
  .noprint { text-align: center; margin-bottom: 24px; }
  .btn { background: #8b7355; color: #fff; border: 0; padding: 10px 24px;
    font-size: 14px; cursor: pointer; border-radius: 4px; font-family: Arial, sans-serif; }
</style>
</head>
<body>
  <div class="noprint">
    <button class="btn" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="head">
    <div class="brand">
      <h1>${esc(SITE.name)}</h1>
      <div class="tag">${esc(SITE.tagline)}</div>
      <div class="meta">
        ${esc(SITE.owner)} · ${esc(SITE.license)}<br/>
        ${esc(SITE.location)}<br/>
        ${esc(SITE.phone)} · ${esc(SITE.email)}
      </div>
    </div>
    <div class="doc">
      <div class="label">Project Estimate</div>
      <h2>#${esc(est.id)}</h2>
      <div class="meta">
        Issued: ${fmtDate(est.created_at)}<br/>
        ${est.expires_at ? `Valid until: ${fmtDate(est.expires_at)}` : ""}
      </div>
    </div>
  </div>

  <div class="section-title">Prepared For</div>
  <div class="info"><strong>${esc(client)}</strong><br/>
    ${esc(project)} — ${esc(est.project_type ?? "General Construction")}${esc(sqft)}
  </div>

  <div class="section-title">Investment Range</div>
  <div class="tiers">
    <div class="tier"><div class="t">Conservative</div><div class="v">${money(est.estimated_low)}</div></div>
    <div class="tier mid"><div class="t">Recommended</div><div class="v">${money(est.estimated_mid)}</div></div>
    <div class="tier"><div class="t">Premium</div><div class="v">${money(est.estimated_high)}</div></div>
  </div>

  ${
    breakdown
      ? `<div class="section-title">Cost Breakdown</div><table>${breakdown}</table>`
      : ""
  }

  ${
    est.ai_reasoning
      ? `<div class="section-title">Scope & Notes</div><div class="notes">${esc(est.ai_reasoning)}</div>`
      : ""
  }

  <div class="foot">
    This estimate is a good-faith projection based on the information provided and is not a fixed-price
    contract. Final pricing is confirmed in a signed agreement. Licensed &amp; bonded — ${esc(SITE.license)}.
    Generated ${fmtDate(new Date().toISOString())} · ${esc(SITE.website)}
  </div>

  <script>window.onload = function () { setTimeout(function(){ window.print(); }, 350); };</script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
