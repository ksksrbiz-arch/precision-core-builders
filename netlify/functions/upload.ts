/**
 * File upload endpoint — stores files in Cloudflare R2.
 * Returns a public URL for the uploaded file.
 *
 * Requires env vars:
 *   CF_R2_BUCKET       — R2 bucket name (e.g. "pcb-assets")
 *   CF_ACCOUNT_ID      — Cloudflare account ID
 *   CF_R2_ACCESS_KEY   — R2 S3-compatible access key ID
 *   CF_R2_SECRET_KEY   — R2 S3-compatible secret access key
 *   CF_R2_PUBLIC_URL   — Public bucket URL (e.g. "https://pub-xxx.r2.dev")
 */
import type { Handler } from "@netlify/functions";
import { checkRateLimit, getClientIP } from "../../server/_core/rateLimit";

const BUCKET = process.env.CF_R2_BUCKET ?? "pcb-assets";
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID ?? "";
const ACCESS_KEY = process.env.CF_R2_ACCESS_KEY ?? "";
const SECRET_KEY = process.env.CF_R2_SECRET_KEY ?? "";
const PUBLIC_URL = process.env.CF_R2_PUBLIC_URL ?? "";

// Max 10MB per upload
const MAX_SIZE = 10 * 1024 * 1024;

export const handler: Handler = async event => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST")
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "POST only" }),
    };

  if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: "R2 storage not configured" }),
    };
  }

  try {
    // Rate limit: 30 uploads per minute
    const ip = getClientIP(event.headers as Record<string, string>);
    const rl = await checkRateLimit(`upload:${ip}`, 30);
    if (!rl.allowed) {
      return {
        statusCode: 429,
        headers: { ...headers, "Retry-After": "60" },
        body: JSON.stringify({ error: "Too many uploads" }),
      };
    }

    const body = event.body;
    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No file data" }),
      };
    }

    // Parse file info from query params
    const params = event.queryStringParameters ?? {};
    const folder = params.folder ?? "uploads";
    const filename =
      params.filename ??
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const contentType = params.contentType ?? "application/octet-stream";
    const key = `${folder}/${filename}`;

    // Decode base64 body if needed
    const fileBuffer = event.isBase64Encoded
      ? Buffer.from(body, "base64")
      : Buffer.from(body);

    if (fileBuffer.length > MAX_SIZE) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ error: "File too large (max 10MB)" }),
      };
    }

    // Upload to R2 via S3-compatible API
    const r2Url = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`;

    // S3-compatible PUT with AWS Signature V4
    // For simplicity, use the Cloudflare API directly
    const cfApiUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`;

    const uploadRes = await fetch(cfApiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
        "Content-Type": contentType,
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("[upload] R2 error:", errText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Upload failed" }),
      };
    }

    const publicUrl = PUBLIC_URL ? `${PUBLIC_URL}/${key}` : key;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        key,
        url: publicUrl,
        size: fileBuffer.length,
        contentType,
      }),
    };
  } catch (err) {
    console.error("[upload]", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal error" }),
    };
  }
};
