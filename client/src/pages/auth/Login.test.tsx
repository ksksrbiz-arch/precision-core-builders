/**
 * @vitest-environment jsdom
 *
 * The login page is password-only: no magic link, no social sign-in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const setLocationMock = vi.fn();
const signInMock = vi.fn();
const supabaseState = { configured: true };

vi.mock("wouter", () => ({
  useLocation: () => ["/auth/login", setLocationMock],
}));
vi.mock("@/lib/signIn", () => ({
  signInWithPassword: (...a: unknown[]) => signInMock(...a),
}));
vi.mock("@/lib/supabase", () => ({
  get isSupabaseConfigured() {
    return supabaseState.configured;
  },
}));

import AuthLogin from "./Login";

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { value: password },
  });
}

describe("AuthLogin", () => {
  beforeEach(() => {
    setLocationMock.mockReset();
    signInMock.mockReset();
    supabaseState.configured = true;
  });
  afterEach(cleanup);

  it("offers email + password only — no magic link or social sign-in", () => {
    render(<AuthLogin />);
    expect(screen.getByLabelText(/email address/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
    expect(screen.queryByText(/magic link/i)).toBeNull();
    expect(screen.queryByText(/facebook/i)).toBeNull();
    expect(screen.queryByText(/continue with/i)).toBeNull();
    expect(screen.queryByText(/resend/i)).toBeNull();
  });

  it("keeps Sign In disabled until both fields are filled", () => {
    render(<AuthLogin />);
    const btn = screen.getByRole("button", { name: /sign in/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    fill("eric@pcb.com", "secret");
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it("toggles password visibility", () => {
    render(<AuthLogin />);
    const input = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(input.type).toBe("text");
  });

  it("navigates to the destination on success", async () => {
    signInMock.mockResolvedValue({ ok: true, destination: "/admin" });
    render(<AuthLogin />);
    fill("eric@pcb.com", "secret");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(setLocationMock).toHaveBeenCalledWith("/admin"));
    expect(signInMock).toHaveBeenCalledWith("eric@pcb.com", "secret");
  });

  it("shows the error and stays put on failure", async () => {
    signInMock.mockResolvedValue({
      ok: false,
      error: "The email or password is incorrect.",
    });
    render(<AuthLogin />);
    fill("eric@pcb.com", "nope");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /incorrect/i
    );
    expect(setLocationMock).not.toHaveBeenCalled();
  });

  it("explains when Supabase isn't configured instead of calling it", async () => {
    supabaseState.configured = false;
    render(<AuthLogin />);
    fill("eric@pcb.com", "secret");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /not configured/i
    );
    expect(signInMock).not.toHaveBeenCalled();
  });
});
