/**
 * Environment variable configuration for Netlify Functions and dev server.
 * All secrets are managed via the Netlify dashboard — never hardcode values.
 */
export const ENV = {
  // Supabase (auth, database, storage)
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  // AI / LLM
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  // Google Gemini — free tier via Google AI Studio (no credit card required)
  // Get a free key at: https://aistudio.google.com/app/apikey
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY ?? "",

  // External APIs
  openWeatherApiKey: process.env.OPENWEATHERMAP_API_KEY ?? "",
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL ?? "",

  // Billing
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  // Free billing handles (PayPal.me / Venmo / Zelle / mailto invoices).
  // Set any combination — BillingView will generate payment links for
  // whichever ones are configured.  No API keys or accounts required
  // beyond signing up for the consumer service.
  paypalMeUsername: process.env.PAYPAL_ME_USERNAME ?? "",
  venmoUsername: process.env.VENMO_USERNAME ?? "",
  zelleHandle: process.env.ZELLE_HANDLE ?? "",

  // Blueprint.am integration
  // Public site URL (used to build OAuth redirect URIs) — prefer SITE_URL,
  // fall back to Netlify's built-in URL env var.
  siteUrl: process.env.SITE_URL ?? process.env.URL ?? "",
  blueprintClientId: process.env.BLUEPRINT_CLIENT_ID ?? "",
  blueprintClientSecret: process.env.BLUEPRINT_CLIENT_SECRET ?? "",
  blueprintBaseUrl: process.env.BLUEPRINT_BASE_URL ?? "https://blueprint.am",
  blueprintApiBaseUrl:
    process.env.BLUEPRINT_API_BASE_URL ?? "https://api.blueprint.am",
  /** Hex-encoded 32-byte key used by server/_core/crypto.ts (AES-256-GCM). */
  blueprintEncryptionKey: process.env.BLUEPRINT_ENCRYPTION_KEY ?? "",

  // Application
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
};
