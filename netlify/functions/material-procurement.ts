import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { invokeLLM } from "../../server/_core/llm";

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const handler: Handler = async event => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers, body: "" };

  try {
    const { projectId, phase } = JSON.parse(event.body ?? "{}");
    if (!projectId)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "projectId required" }),
      };

    // Get materials for this project/phase
    let q = db.from("materials").select("*").eq("project_id", projectId);
    if (phase) q = q.eq("phase_needed", phase);
    const { data: materials } = await q;

    const shortages = (materials ?? []).filter(
      m => m.quantity_needed && (m.quantity_ordered ?? 0) < m.quantity_needed
    );

    // Generate PO draft with Gemini
    const purchaseOrders = [];
    if (shortages.length > 0) {
      const vendorGroups = new Map<string, typeof shortages>();
      for (const m of shortages) {
        const vendor = m.vendor_name ?? "Unknown Vendor";
        if (!vendorGroups.has(vendor)) vendorGroups.set(vendor, []);
        vendorGroups.get(vendor)!.push(m);
      }

      for (const [vendor, items] of vendorGroups) {
        const total = items.reduce((sum, m) => {
          const needed = (m.quantity_needed ?? 0) - (m.quantity_ordered ?? 0);
          return sum + needed * (m.unit_price_current ?? 0);
        }, 0);
        purchaseOrders.push({
          id: `PO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          vendor,
          items: items.map(m => ({
            name: m.name,
            quantity: (m.quantity_needed ?? 0) - (m.quantity_ordered ?? 0),
            unit: m.unit,
            unitPrice: m.unit_price_current,
            sku: m.vendor_sku,
          })),
          total,
        });
      }
    }

    // Mark shortages in DB
    for (const m of shortages) {
      await db.from("materials").update({ is_shortage: true }).eq("id", m.id);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        projectId,
        phase,
        materialsChecked: (materials ?? []).length,
        shortagesFound: shortages.length,
        purchaseOrders,
      }),
    };
  } catch (err) {
    console.error("[material-procurement]", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
