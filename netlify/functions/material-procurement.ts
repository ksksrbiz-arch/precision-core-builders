import { getSupabaseAdmin } from "../../server/_core/supabase";
import { withGuards } from "./_lib/http";

export const handler = withGuards(
  // Admin-only: this uses the service-role client to create purchase orders and
  // mutate inventory (quantity_ordered, po_number, is_shortage) for an
  // arbitrary projectId, so it must never be reachable unauthenticated.
  { methods: ["POST"], auth: "admin" },
  async ({ event, json, error }) => {
    const db = getSupabaseAdmin();
    if (!db) {
      return error(
        503,
        "Database not configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)."
      );
    }

    try {
      const { projectId, phase } = JSON.parse(event.body ?? "{}");
      if (!projectId) return error(400, "projectId required");

      // Get materials for this project/phase
      let q = db.from("materials").select("*").eq("project_id", projectId);
      if (phase) q = q.eq("phase_needed", phase);
      const { data: materials } = await q;

      const shortages = (materials ?? []).filter(
        m => m.quantity_needed && (m.quantity_ordered ?? 0) < m.quantity_needed
      );

      // Build purchase-order drafts by grouping shortages per vendor. Each PO
      // carries a stable poNumber (`po.id`) reused as the persisted po_number so
      // the in-memory response and the DB row line up.
      const purchaseOrders: Array<{
        id: string;
        vendor: string;
        items: Array<{
          materialId: number | null;
          name: string;
          quantity: number;
          unit: string | null;
          unitPrice: number | null;
          sku: string | null;
        }>;
        total: number;
      }> = [];

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
              materialId: m.id ?? null,
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

      // Persist the generated POs best-effort. If the purchase_orders tables
      // don't exist yet (migration 0005 not applied) or any write fails, we log
      // and fall through — the function must still return the POs so an
      // unmigrated database never regresses the existing behaviour.
      const persistedPoIds: Record<string, number> = {};
      const clearedMaterialIds = new Set<number>();
      try {
        // Resolve vendor_id from the vendors catalog by name (case-insensitive).
        // Best-effort: if the select fails, the table is empty, or no name
        // matches, vendor_id stays null and POs persist exactly as before.
        // Isolated in its own try/catch so a rejected select never skips PO
        // persistence.
        const vendorIdByName = new Map<string, number>();
        try {
          const { data: vendorRows } = await db
            .from("vendors")
            .select("id,name");
          for (const v of vendorRows ?? []) {
            if (v?.name == null) continue;
            vendorIdByName.set(String(v.name).trim().toLowerCase(), v.id);
          }
        } catch (vendorErr) {
          console.warn(
            "[material-procurement] vendor_id resolution skipped:",
            vendorErr
          );
        }

        for (const po of purchaseOrders) {
          const vendorId =
            vendorIdByName.get(po.vendor.trim().toLowerCase()) ?? null;

          const { data: poRow, error: poErr } = await db
            .from("purchase_orders")
            .insert({
              project_id: projectId,
              po_number: po.id,
              vendor_name: po.vendor,
              vendor_id: vendorId,
              status: "draft",
              subtotal: po.total,
            })
            .select("id")
            .single();
          if (poErr || !poRow) throw poErr ?? new Error("PO insert failed");

          persistedPoIds[po.id] = poRow.id;

          const itemRows = po.items.map(it => ({
            purchase_order_id: poRow.id,
            material_id: it.materialId,
            description: it.name,
            quantity: it.quantity,
            unit_price: it.unitPrice,
            line_total:
              it.unitPrice != null ? it.quantity * it.unitPrice : null,
          }));
          if (itemRows.length > 0) {
            const { error: itemErr } = await db
              .from("purchase_order_items")
              .insert(itemRows);
            if (itemErr) throw itemErr;
          }

          // Clear the shortage on the sourced materials: stamp the PO number and
          // advance quantity_ordered to quantity_needed so the shortage resolves
          // once a PO has been generated for it.
          for (const it of po.items) {
            if (it.materialId == null) continue;
            const material = shortages.find(m => m.id === it.materialId);
            await db
              .from("materials")
              .update({
                po_number: po.id,
                vendor_id: vendorId,
                quantity_ordered: material?.quantity_needed ?? undefined,
                ordered_at: new Date().toISOString(),
                is_shortage: false,
              })
              .eq("id", it.materialId);
            clearedMaterialIds.add(it.materialId);
          }
        }
      } catch (persistErr) {
        console.warn(
          "[material-procurement] PO persistence skipped (migration 0005 may be unapplied):",
          persistErr
        );
      }

      // Flag any shortages that were not cleared by a persisted PO above. When
      // persistence is unavailable this preserves the original behaviour of
      // marking every shortage.
      for (const m of shortages) {
        if (clearedMaterialIds.has(m.id)) continue;
        await db.from("materials").update({ is_shortage: true }).eq("id", m.id);
      }

      return json(200, {
        projectId,
        phase,
        materialsChecked: (materials ?? []).length,
        shortagesFound: shortages.length,
        purchaseOrders: purchaseOrders.map(po => ({
          ...po,
          persistedId: persistedPoIds[po.id] ?? null,
        })),
      });
    } catch (err) {
      console.error("[material-procurement]", err);
      return error(500, String(err));
    }
  }
);
