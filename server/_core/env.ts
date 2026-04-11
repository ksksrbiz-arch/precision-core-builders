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

  // External APIs
  openWeatherApiKey: process.env.OPENWEATHERMAP_API_KEY ?? "",
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL ?? "",

  // Billing
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",

  // Application
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
};
