import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  requireSupabaseAdmin,
} from "./supabase";

const SAVED = {
  url: process.env.SUPABASE_URL,
  viteUrl: process.env.VITE_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

afterEach(() => {
  process.env.SUPABASE_URL = SAVED.url;
  process.env.VITE_SUPABASE_URL = SAVED.viteUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = SAVED.key;
});

describe("getSupabaseAdmin", () => {
  it("returns null when Supabase is not configured", () => {
    expect(getSupabaseAdmin()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("returns a memoised client when configured", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const first = getSupabaseAdmin();
    const second = getSupabaseAdmin();
    expect(first).not.toBeNull();
    expect(second).toBe(first); // same memoised instance
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("falls back to VITE_SUPABASE_URL for the url", () => {
    process.env.VITE_SUPABASE_URL = "https://vite.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    expect(getSupabaseAdmin()).not.toBeNull();
  });

  it("requireSupabaseAdmin throws when unconfigured", () => {
    expect(() => requireSupabaseAdmin()).toThrow(/not configured/);
  });
});
