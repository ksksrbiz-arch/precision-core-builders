import { withGuards } from "./_lib/http";

const DEFAULT_SUPER_SPLAT_URL = "https://superspl.at";
const DEFAULT_SUPER_SPLAT_DEMO_URL =
  "https://supersplat-demo.vercel.app/?model=https://huggingface.co/spaces/nerfstudio-office/nerf_assets/resolve/main/splat-data/office.splat";

const ALLOWED_ACCOUNT_ORIGINS = new Set(["https://superspl.at"]);
const ALLOWED_DEMO_ORIGINS = new Set([
  "https://superspl.at",
  "https://supersplat-demo.vercel.app",
]);

function safeUrl(
  value: string | undefined,
  fallback: string,
  allowedOrigins: Set<string>
): string {
  if (!value) return fallback;

  try {
    const url = new URL(value);
    if (url.protocol === "https:" && allowedOrigins.has(url.origin)) {
      return url.toString();
    }
  } catch {
    // Fall back to the known-safe default below.
  }

  return fallback;
}

export const handler = withGuards(
  {
    methods: ["GET"],
    rateLimit: {
      key: ({ ip }) => `supersplat-config:${ip}`,
      maxRequests: 120,
      windowMs: 60_000,
    },
  },
  async ({ json }) => {
    const accountUrl = safeUrl(
      process.env.SUPERSPLAT_ACCOUNT_URL,
      DEFAULT_SUPER_SPLAT_URL,
      ALLOWED_ACCOUNT_ORIGINS
    );
    const demoUrl = safeUrl(
      process.env.SUPERSPLAT_DEMO_URL,
      DEFAULT_SUPER_SPLAT_DEMO_URL,
      ALLOWED_DEMO_ORIGINS
    );

    return json(
      200,
      {
        provider: "SuperSplat",
        accountUrl,
        demoUrl,
        features: [
          "Create a free SuperSplat account.",
          "Upload and publish 3D Gaussian splat scenes.",
          "Share interactive project links with clients and teams.",
        ],
        fetchedAt: new Date().toISOString(),
      },
      { "Cache-Control": "public, max-age=300" }
    );
  }
);
