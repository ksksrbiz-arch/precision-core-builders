/**
 * Neutral re-export surface for admin guide data.
 *
 * `DashboardLayout` (and other shell components) previously reached directly
 * into the `pages/admin/guides-data` *page* module — a layout→page dependency
 * that inverts the intended direction. Components should import guide helpers
 * from here instead, so the underlying data module can later be relocated
 * without touching every consumer.
 */
export { getGuideByPath, GUIDES } from "@/pages/admin/guides-data";
export type { Guide, GuideSection, GuideStep } from "@/pages/admin/guides-data";
