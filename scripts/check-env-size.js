#!/usr/bin/env node
/**
 * check-env-size.js
 *
 * Estimates how many bytes of environment variables will be forwarded to each
 * Netlify Lambda function. AWS Lambda enforces a hard 4 096-byte limit across
 * ALL env vars combined (keys + values + overhead).
 *
 * Usage:
 *   node scripts/check-env-size.js
 *
 * Set NETLIFY_AUTH_TOKEN + NETLIFY_SITE_ID to query live Netlify env vars:
 *   NETLIFY_AUTH_TOKEN=<token> NETLIFY_SITE_ID=<site-id> node scripts/check-env-size.js
 *
 * Without those tokens, the script reads from process.env (your local .env.local).
 */

const LAMBDA_LIMIT_BYTES = 4096;

// Vars this project should NOT need at Lambda runtime.
// They should be deleted from the Netlify dashboard or set to "Builds" scope.
const SHOULD_BE_BUILD_ONLY = new Set([
  // VITE_ vars are bundled into the client JS at build time
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_DATABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_STRIPE_PUBLISHABLE_KEY",
  "VITE_FEATURE_BLUEPRINT",
  "VITE_DEV_MODE",
  "VITE_DEV_PASSWORD",
  "VITE_SITE_URL",
  "VITE_NETLIFY_SITE_NAME",
  "VITE_AUTH0_AUDIENCE",
  "VITE_AUTH0_CLIENT_ID",
  "VITE_AUTH0_DOMAIN",
  // Build-tooling only
  "NODE_VERSION",
  "PNPM_VERSION",
  "NPM_FLAGS",
  "PNPM_FLAGS",
  "TAILWINDCSS_DISABLE_OXIDE",
  // Netlify extension / pipeline vars
  "NETLIFY_PRERENDER_AUTH_TOKEN",
  "NETLIFY_PRERENDER_ENABLED",
  "NETLIFY_PRERENDER_SKIP_AGENTS_WITH_JS",
  "NETLIFY_EMAILS_DIRECTORY",
  "NETLIFY_EMAILS_SECRET",
  "SECRETS_SCAN_OMIT_KEYS",
]);

// Vars that belong to OTHER projects on the team account — delete from this site.
const UNRELATED_TO_THIS_PROJECT = new Set([
  "AUTH0_AUDIENCE",
  "AUTH0_CLIENT_ID",
  "AUTH0_ISSUER_BASE_URL",
  "NEXT_PUBLIC_AUTH0_CLIENT_ID",
  "NEXT_PUBLIC_AUTH0_DOMAIN",
  "CF_ACCOUNT_ID",
  "CF_API_TOKEN",
  "CF_KV_RATE_LIMIT_NS",
  "AWL_API_KEY_P10",
  "RAINDROP_API_KEY",
  "RAINDROP_APPLICATION_NAME",
  "RAINDROP_APPLICATION_VERSION",
  "RAINDROP_SMARTBUCKET_NAME",
  "RAINDROP_SMARTMEMORY_NAME",
  "RAINDROP_SMARTSQL_NAME",
  "service_role", // duplicate of SUPABASE_SERVICE_ROLE_KEY
]);

async function fetchNetlifyEnvVars(token, siteId) {
  const url = `https://api.netlify.com/api/v1/sites/${siteId}/env`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok)
    throw new Error(`Netlify API error ${res.status}: ${await res.text()}`);
  const vars = await res.json();
  // Each var has { key, values: [{ value, context }] }
  const result = {};
  for (const v of vars) {
    const allContexts = v.values.find(x => x.context === "all") ?? v.values[0];
    result[v.key] = allContexts?.value ?? "";
  }
  return result;
}

async function main() {
  const token = process.env.NETLIFY_AUTH_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  let envVars;
  if (token && siteId) {
    console.log(`Fetching env vars from Netlify site ${siteId}…\n`);
    try {
      envVars = await fetchNetlifyEnvVars(token, siteId);
    } catch (err) {
      console.error("Failed to fetch from Netlify API:", err.message);
      process.exit(1);
    }
  } else {
    console.log(
      "No NETLIFY_AUTH_TOKEN/NETLIFY_SITE_ID — reading from process.env\n"
    );
    console.log(
      "Tip: Run with NETLIFY_AUTH_TOKEN=<token> NETLIFY_SITE_ID=<id> for live data.\n"
    );
    envVars = { ...process.env };
  }

  let totalBytes = 0;
  const rows = [];

  for (const [key, value] of Object.entries(envVars)) {
    // Lambda payload = "KEY=VALUE\0" roughly
    const bytes = Buffer.byteLength(`${key}=${value}`, "utf8") + 1;
    const flag = UNRELATED_TO_THIS_PROJECT.has(key)
      ? "🗑  DELETE (unrelated project)"
      : SHOULD_BE_BUILD_ONLY.has(key)
        ? "🔒 BUILD-scope only"
        : "";
    rows.push({ key, bytes, flag });
    totalBytes += bytes;
  }

  rows.sort((a, b) => b.bytes - a.bytes);

  console.log("━".repeat(80));
  console.log("  Lambda env-var payload estimate");
  console.log("━".repeat(80));
  console.log(`  ${"KEY".padEnd(42)} ${"BYTES".padStart(6)}  ACTION`);
  console.log("─".repeat(80));

  for (const { key, bytes, flag } of rows) {
    console.log(`  ${key.padEnd(42)} ${String(bytes).padStart(6)}  ${flag}`);
  }

  console.log("─".repeat(80));
  console.log(
    `  TOTAL${" ".repeat(37)} ${String(totalBytes).padStart(6)} / ${LAMBDA_LIMIT_BYTES} bytes`
  );

  const pct = ((totalBytes / LAMBDA_LIMIT_BYTES) * 100).toFixed(1);
  const over = totalBytes > LAMBDA_LIMIT_BYTES;
  console.log(`  ${over ? "🔴 OVER LIMIT" : "🟢 Within limit"} (${pct}% used)`);
  console.log("━".repeat(80));

  const deleteCount = rows.filter(r => r.flag.startsWith("🗑")).length;
  const buildOnlyCount = rows.filter(r => r.flag.startsWith("🔒")).length;
  if (deleteCount || buildOnlyCount) {
    console.log(
      "\nRecommended actions in Netlify Dashboard → Site → Environment variables:"
    );
    if (deleteCount)
      console.log(
        `  • Delete ${deleteCount} var(s) marked 🗑  (not used by this project)`
      );
    if (buildOnlyCount)
      console.log(
        `  • Change ${buildOnlyCount} var(s) marked 🔒 scope to "Builds" only`
      );
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
