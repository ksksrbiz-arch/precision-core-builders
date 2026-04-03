/**
 * submit-inquiry.ts
 * Receives the public contact/estimate form POST, writes to the
 * public.inquiries table in Supabase, then optionally queues AI lead-scoring.
 *
 * Route: POST /api/submit-inquiry
 * Accepts: application/json  OR  application/x-www-form-urlencoded
 */
import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIP } from "../../server/_core/rateLimit";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function jsonErr(status: number, message: string) {
  return {
    statusCode: status,
    headers: corsHeaders,
    body: JSON.stringify({ ok: false, message }),
  };
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers: corsHeaders, body: "" };

  if (event.httpMethod !== "POST") return jsonErr(405, "Method not allowed");

  /* ── Rate limit: 5 inquiries per minute per IP (spam protection) ────── */
  const ip = getClientIP(event.headers as Record<string, string>);
  const rl = await checkRateLimit(`inquiry:${ip}`, 5);
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...corsHeaders, "Retry-After": "60" },
      body: JSON.stringify({
        ok: false,
        message: "Too many submissions. Please wait a moment.",
      }),
    };
  }

  /* ── Guard: env vars ──────────────────────────────────────────────────── */
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("[submit-inquiry] Missing Supabase env vars");
    return jsonErr(500, "Server misconfiguration — contact us at 541-852-5144");
  }

  /* ── Parse body (JSON or form-encoded) ───────────────────────────────── */
  let raw: Record<string, string> = {};
  const ct = (event.headers["content-type"] ?? "").toLowerCase();

  try {
    if (ct.includes("application/json")) {
      raw = JSON.parse(event.body ?? "{}");
    } else {
      // form-encoded (legacy Netlify Forms fallback)
      const params = new URLSearchParams(event.body ?? "");
      params.forEach((v, k) => {
        raw[k] = v;
      });
    }
  } catch {
    return jsonErr(400, "Invalid request body");
  }

  /* ── Validate ─────────────────────────────────────────────────────────── */
  const name = (raw.name ?? "").trim();
  const email = (raw.email ?? "").trim().toLowerCase();
  const message = (raw.message ?? "").trim();

  if (!name) return jsonErr(422, "Name is required");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return jsonErr(422, "A valid email is required");
  if (!message) return jsonErr(422, "Project details are required");

  /* ── Write to Supabase inquiries table ───────────────────────────────── */
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const row = {
    name,
    email,
    phone: (raw.phone ?? "").trim() || null,
    project_type: (raw.projectType ?? raw.project_type ?? "").trim() || null,
    budget: (raw.budget ?? "").trim() || null,
    message,
    source: (raw.source ?? "contact_form").trim(),
    ip_address:
      (event.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("inquiries")
    .insert(row)
    .select("id")
    .single();

  if (insertError) {
    console.error(
      "[submit-inquiry] Supabase insert error:",
      insertError.message
    );
    return jsonErr(500, "Database error — please call us at 541-852-5144");
  }

  /* ── Async AI lead-scoring (fire-and-forget) ─────────────────────────── */
  try {
    const baseUrl = process.env.URL ?? "https://precisioncorebuilders.com";
    fetch(`${baseUrl}/.netlify/functions/lead-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inquiryId: inserted?.id,
        name,
        email,
        projectType: raw.projectType ?? raw.project_type ?? null,
        budget: raw.budget ?? null,
        message,
      }),
    }).catch(e =>
      console.warn("[submit-inquiry] lead-score fire-and-forget:", e)
    );
  } catch (_) {
    /* non-fatal */
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ ok: true, id: inserted?.id }),
  };
};
