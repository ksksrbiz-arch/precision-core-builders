/**
 * blueprintRouter — tRPC router for the Blueprint.am integration.
 *
 * Because blueprint.am does not publish a public API or OAuth spec today,
 * this router supports three modes simultaneously:
 *
 *   1. Deep-link:  No connection required — `buildDeepLink` returns a URL that
 *                  opens blueprint.am with project context in the query string.
 *   2. API key:    The user pastes a per-user key on their Blueprint account
 *                  page; stored AES-256-GCM encrypted in `blueprint_connections`.
 *   3. OAuth:      `startOAuth` returns an authorization URL with a signed
 *                  state param; the `blueprint-oauth-callback` Netlify Function
 *                  completes the exchange and calls `completeOAuth` below.
 *
 * All procedures require an authenticated user. Admin-only actions use
 * `adminProcedure`; client-facing reads use `protectedProcedure` and are
 * gated on the artifact's `visibleToClient` flag.
 */
import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "../db";
import { logAdminAction } from "../_core/auditLog";
import {
  decryptSecret,
  encryptSecret,
  isCryptoConfigured,
  OAUTH_STATE_EXPIRY_MS,
  signState,
  verifyState,
} from "../_core/crypto";
import { ENV } from "../_core/env";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

// ── Helpers ────────────────────────────────────────────────────────────────

function assertCryptoReady() {
  if (!isCryptoConfigured()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Blueprint integration is not configured. An administrator must set BLUEPRINT_ENCRYPTION_KEY in Netlify.",
    });
  }
}

function sanitizeConnection(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    providerUserId: row.provider_user_id ?? null,
    providerEmail: row.provider_email ?? null,
    authMethod: row.auth_method as "oauth" | "api_key",
    hasAccessToken: Boolean(row.access_token_enc),
    hasApiKey: Boolean(row.api_key_enc),
    expiresAt: row.expires_at ?? null,
    scopes: row.scopes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Return the current user's connection row with decrypted secrets, or null. */
async function loadConnection(userId: string) {
  const { data, error } = await db
    .from("blueprint_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let apiKey: string | null = null;
  try {
    if (data.access_token_enc)
      accessToken = decryptSecret(data.access_token_enc);
    if (data.refresh_token_enc)
      refreshToken = decryptSecret(data.refresh_token_enc);
    if (data.api_key_enc) apiKey = decryptSecret(data.api_key_enc);
  } catch (err) {
    console.error("[blueprint] Failed to decrypt stored secret:", err);
  }
  return { row: data, accessToken, refreshToken, apiKey };
}

/** Compute the status summary for a connection row. */
function statusFor(
  row: any
): "connected" | "expired" | "disconnected" | "invalid" {
  if (!row) return "disconnected";
  if (row.auth_method === "api_key") {
    if (!row.api_key_enc) return "disconnected";
    // Attempt decryption so a rotated/invalid encryption key surfaces as
    // "invalid" rather than silently masquerading as connected.
    try {
      decryptSecret(row.api_key_enc);
      return "connected";
    } catch {
      return "invalid";
    }
  }
  if (!row.access_token_enc) return "disconnected";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return "expired";
  }
  try {
    decryptSecret(row.access_token_enc);
    return "connected";
  } catch {
    return "invalid";
  }
}

// ── Input schemas ──────────────────────────────────────────────────────────

const SaveApiKeyInput = z.object({
  apiKey: z.string().min(8).max(500),
  providerEmail: z.string().email().optional(),
});

const CompleteOAuthInput = z.object({
  providerUserId: z.string().max(320).optional(),
  providerEmail: z.string().email().optional(),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  scopes: z.string().optional(),
});

const AttachArtifactInput = z.object({
  projectId: z.number().int().positive(),
  blueprintResourceId: z.string().min(1).max(200),
  resourceType: z.string().max(50).default("plan"),
  title: z.string().max(500).optional(),
  url: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  visibleToClient: z.boolean().default(false),
});

// ── Router ────────────────────────────────────────────────────────────────

export const blueprintRouter = router({
  /** Status + non-secret metadata for the caller's own connection. */
  getConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await db
      .from("blueprint_connections")
      .select("*")
      .eq("user_id", ctx.user!.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      status: statusFor(data),
      connection: sanitizeConnection(data),
      cryptoConfigured: isCryptoConfigured(),
      oauthConfigured: Boolean(
        ENV.blueprintClientId && ENV.blueprintClientSecret
      ),
    };
  }),

  /**
   * Begin an OAuth authorization request. Returns the URL the client should
   * redirect the user to.  The caller is responsible for verifying the
   * returned `state` matches on callback.
   */
  startOAuth: protectedProcedure
    .input(
      z
        .object({
          returnTo: z.string().startsWith("/").max(500).optional(),
        })
        .default({})
    )
    .mutation(async ({ ctx, input }) => {
      if (!ENV.blueprintClientId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Blueprint OAuth is not configured. Use the API-key flow or contact the administrator.",
        });
      }
      assertCryptoReady();

      // State = base64(JSON({ uid, nonce, returnTo })) — signed with HMAC.
      // Use a cryptographically secure nonce to prevent prediction/guessing.
      const payload = {
        uid: ctx.user!.id,
        nonce: randomBytes(16).toString("hex"),
        returnTo: input.returnTo ?? "/admin/blueprint",
        iat: Date.now(),
      };
      const raw = Buffer.from(JSON.stringify(payload), "utf8").toString(
        "base64url"
      );
      const sig = signState(raw);
      const state = `${raw}.${sig}`;

      const redirectUri = `${ENV.siteUrl || ""}/.netlify/functions/blueprint-oauth-callback`;
      const url = new URL("/oauth/authorize", ENV.blueprintBaseUrl);
      url.searchParams.set("client_id", ENV.blueprintClientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "read");
      url.searchParams.set("state", state);

      return { authorizeUrl: url.toString(), state };
    }),

  /**
   * Persist an OAuth result.  Called by the `blueprint-oauth-callback`
   * Netlify Function after it has exchanged the auth code for tokens.
   * Also callable directly from the UI for manual completion flows.
   */
  completeOAuth: protectedProcedure
    .input(CompleteOAuthInput)
    .mutation(async ({ ctx, input }) => {
      assertCryptoReady();

      const accessTokenEnc = encryptSecret(input.accessToken);
      const refreshTokenEnc = input.refreshToken
        ? encryptSecret(input.refreshToken)
        : null;

      const { data, error } = await db
        .from("blueprint_connections")
        .upsert(
          {
            user_id: ctx.user!.id,
            auth_method: "oauth",
            provider_user_id: input.providerUserId ?? null,
            provider_email: input.providerEmail ?? null,
            access_token_enc: accessTokenEnc,
            refresh_token_enc: refreshTokenEnc,
            api_key_enc: null,
            expires_at: input.expiresAt ?? null,
            scopes: input.scopes ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();
      if (error) throw new Error(error.message);

      await logAdminAction(
        db,
        { user: ctx.user },
        "blueprint.connect",
        undefined,
        { method: "oauth" }
      );

      return sanitizeConnection(data);
    }),

  /** Store or replace a per-user Blueprint API key.  Key is encrypted at rest. */
  saveApiKey: protectedProcedure
    .input(SaveApiKeyInput)
    .mutation(async ({ ctx, input }) => {
      assertCryptoReady();

      const apiKeyEnc = encryptSecret(input.apiKey);
      const { data, error } = await db
        .from("blueprint_connections")
        .upsert(
          {
            user_id: ctx.user!.id,
            auth_method: "api_key",
            provider_email: input.providerEmail ?? null,
            api_key_enc: apiKeyEnc,
            access_token_enc: null,
            refresh_token_enc: null,
            expires_at: null,
            scopes: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();
      if (error) throw new Error(error.message);

      await logAdminAction(
        db,
        { user: ctx.user },
        "blueprint.connect",
        undefined,
        { method: "api_key" }
      );

      return sanitizeConnection(data);
    }),

  /** Remove the caller's connection and any cached tokens. */
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await db
      .from("blueprint_connections")
      .delete()
      .eq("user_id", ctx.user!.id);
    if (error) throw new Error(error.message);

    await logAdminAction(
      db,
      { user: ctx.user },
      "blueprint.disconnect",
      undefined,
      {}
    );

    return { success: true };
  }),

  /**
   * Build a deep link to blueprint.am for a given project.
   * Works with or without a connected account.
   */
  buildDeepLink: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive().optional(),
        path: z.string().max(300).optional(),
      })
    )
    .query(async ({ input }) => {
      const url = new URL(input.path ?? "/", ENV.blueprintBaseUrl);
      url.searchParams.set("utm_source", "precision-core-builders");
      if (input.projectId) {
        url.searchParams.set("pcb_project", String(input.projectId));
      }
      return { url: url.toString() };
    }),

  // ── Artifacts (project-scoped references to Blueprint resources) ───────

  /**
   * List attached Blueprint artifacts for a project.
   * Clients only see rows with `visible_to_client = true`; admins see all.
   */
  listArtifacts: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      let q = db
        .from("blueprint_artifacts")
        .select("*")
        .eq("project_id", input.projectId)
        .order("synced_at", { ascending: false });
      if (ctx.user!.role !== "admin") {
        q = q.eq("visible_to_client", true);
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  /** Admin-only: attach a Blueprint resource to a PCB project. */
  attachArtifact: adminProcedure
    .input(AttachArtifactInput)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await db
        .from("blueprint_artifacts")
        .insert({
          project_id: input.projectId,
          blueprint_resource_id: input.blueprintResourceId,
          resource_type: input.resourceType,
          title: input.title ?? null,
          url: input.url ?? null,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          attached_by: ctx.user!.id,
          visible_to_client: input.visibleToClient,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      await logAdminAction(
        db,
        { user: ctx.user },
        "blueprint.attachArtifact",
        input.projectId,
        {
          blueprintResourceId: input.blueprintResourceId,
          resourceType: input.resourceType,
        }
      );

      return data;
    }),

  /** Admin-only: remove an artifact link (does not affect Blueprint itself). */
  removeArtifact: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch first so we can audit the project it belonged to.
      const { data: existing } = await db
        .from("blueprint_artifacts")
        .select("project_id,blueprint_resource_id")
        .eq("id", input.id)
        .maybeSingle();

      const { error } = await db
        .from("blueprint_artifacts")
        .delete()
        .eq("id", input.id);
      if (error) throw new Error(error.message);

      await logAdminAction(
        db,
        { user: ctx.user },
        "blueprint.removeArtifact",
        existing?.project_id,
        { blueprintResourceId: existing?.blueprint_resource_id }
      );

      return { success: true };
    }),
});

/** Internal helper exported for tests: verify an OAuth state blob. */
export function __verifyOAuthState(state: string): {
  ok: boolean;
  uid?: string;
  returnTo?: string;
} {
  if (!state || typeof state !== "string") return { ok: false };
  const [raw, sig] = state.split(".");
  if (!raw || !sig) return { ok: false };
  if (!verifyState(raw, sig)) return { ok: false };
  try {
    const payload = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    ) as { uid: string; returnTo?: string; iat?: number };
    // Expire state after OAUTH_STATE_EXPIRY_MS.
    if (payload.iat && Date.now() - payload.iat > OAUTH_STATE_EXPIRY_MS) {
      return { ok: false };
    }
    return { ok: true, uid: payload.uid, returnTo: payload.returnTo };
  } catch {
    return { ok: false };
  }
}

/** Internal helper exported for the oauth-callback function. */
export async function __loadBlueprintConnection(userId: string) {
  return loadConnection(userId);
}
