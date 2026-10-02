-- Purchase-order receiving: track how much of each PO line has actually arrived.
--
-- Before this, "partial" applied the FULL line quantity to inventory (there was
-- no received-quantity input), so a half-delivered order over-counted stock.
-- Receipts are now cumulative per line and inventory is bumped only by what
-- arrived. Idempotent.

ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS quantity_received NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Orders already marked received/partial had their full line quantity applied
-- to inventory by the old code. Record that so the new cumulative accounting
-- starts consistent (and "receive remaining" doesn't double-count them).
UPDATE purchase_order_items i
SET quantity_received = COALESCE(i.quantity, 0)
FROM purchase_orders po
WHERE po.id = i.purchase_order_id
  AND po.status IN ('received', 'partial')
  AND i.quantity_received = 0;
