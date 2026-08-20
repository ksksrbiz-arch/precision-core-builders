/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ isAdmin: true, accessToken: "fake-admin-token" }),
}));

vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/admin/setup", vi.fn()],
}));

afterEach(cleanup);

async function loadPage() {
  vi.resetModules();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "healthy",
        summary: { healthy: 0, total: 0 },
        services: [],
        timestamp: new Date().toISOString(),
      }),
    })
  );
  const mod = await import("./SetupWizard");
  return mod.default;
}

describe("SetupWizard", () => {
  it("labels the per-service API key input, not placeholder-only", async () => {
    const SetupWizard = await loadPage();
    render(<SetupWizard />);
    // Expand the Stripe card, which has real guide steps and so is
    // configurable; the key input only mounts once expanded.
    fireEvent.click(screen.getByText(/stripe payments/i));
    expect(screen.getByLabelText(/stripe payments.*key/i)).toBeTruthy();
  });

  it("conveys per-service configured/error status as text, not icon+color alone", async () => {
    const SetupWizard = await loadPage();
    const { container } = render(<SetupWizard />);
    const statusTexts = Array.from(container.querySelectorAll(".sr-only")).map(
      el => el.textContent
    );
    expect(statusTexts).toContain("Not configured");
  });

  it("labels the admin-token gate input", async () => {
    vi.resetModules();
    vi.doMock("@/_core/hooks/useAuth", () => ({
      useAuth: () => ({ isAdmin: false, accessToken: null }),
    }));
    const mod = await import("./SetupWizard");
    const SetupWizard = mod.default;
    render(<SetupWizard />);
    expect(screen.getByLabelText(/admin token/i)).toBeTruthy();
  });
});
