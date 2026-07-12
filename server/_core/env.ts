/**
 * Environment variable configuration for Netlify Functions and dev server.
 * All secrets are managed via the Netlify dashboard — never hardcode values.
 */
export const ENV = {
  // Supabase (auth, database, storage)
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey:
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey:
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "",

  // AI / LLM (free-tier providers only)
  // OpenAI — legacy/optional paid Whisper transcription (free Groq Whisper is
  // the default; this is only used when GROQ_API_KEY is unset).
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  // Groq — free tier, ultra-fast LPU inference (OpenAI-compatible). Primary
  // provider for both the LLM router and voice (Whisper) transcription.
  // Get a free key (no credit card) at: https://console.groq.com/keys
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  // OpenRouter — one key, 400+ models incl. many free (:free) models. LLM
  // fallback and the Vision Studio provider.
  // Get a key at: https://openrouter.ai/keys
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  // Optional per-provider model overrides
  groqModel: process.env.GROQ_MODEL ?? "",
  openrouterModel: process.env.OPENROUTER_MODEL ?? "",
  // Free vision-capable OpenRouter model used by Vision Studio.
  openrouterVisionModel: process.env.OPENROUTER_VISION_MODEL ?? "",
  // Comma-separated provider priority override, e.g. "openrouter,groq".
  // All providers are free-tier; default order is groq → openrouter.
  llmProviderOrder: process.env.LLM_PROVIDER_ORDER ?? "",

  // External APIs
  openWeatherApiKey: process.env.OPENWEATHERMAP_API_KEY ?? "",
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL ?? "",

  // Notification delivery (all optional — features no-op when unset).
  // Email via Resend (free tier): https://resend.com → API Keys
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  briefingEmailFrom:
    process.env.BRIEFING_EMAIL_FROM ?? "briefing@precisioncorebuilders.com",
  briefingEmailTo: process.env.BRIEFING_EMAIL_TO ?? "",
  // SMS via Twilio: https://console.twilio.com
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFrom: process.env.TWILIO_FROM ?? "",
  briefingSmsTo: process.env.BRIEFING_SMS_TO ?? "",

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
