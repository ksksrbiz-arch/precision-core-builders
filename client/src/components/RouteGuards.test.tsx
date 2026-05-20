/**
 * @vitest-environment jsdom
 *
 * Tests for RouteGuards — verifies that unauthenticated users are
 * redirected to /auth/login and that non-admin authenticated users
 * cannot reach AdminRoute children.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const setLocationMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/admin", setLocationMock],
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

async function loadGuards() {
  vi.resetModules();
  return await import("./RouteGuards");
}

describe("RouteGuards", () => {
  beforeEach(() => {
    setLocationMock.mockReset();
    useAuthMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  describe("ProtectedRoute", () => {
    it("renders a loader while auth is loading", async () => {
      useAuthMock.mockReturnValue({ loading: true, isAuthenticated: false });
      const { ProtectedRoute } = await loadGuards();
      render(
        <ProtectedRoute>
          <div>secret</div>
        </ProtectedRoute>
      );
      expect(screen.queryByText("secret")).toBeNull();
      expect(setLocationMock).not.toHaveBeenCalled();
    });

    it("redirects unauthenticated users to /auth/login", async () => {
      useAuthMock.mockReturnValue({ loading: false, isAuthenticated: false });
      const { ProtectedRoute } = await loadGuards();
      render(
        <ProtectedRoute>
          <div>secret</div>
        </ProtectedRoute>
      );
      expect(setLocationMock).toHaveBeenCalledWith("/auth/login");
      expect(screen.queryByText("secret")).toBeNull();
    });

    it("renders children when authenticated", async () => {
      useAuthMock.mockReturnValue({ loading: false, isAuthenticated: true });
      const { ProtectedRoute } = await loadGuards();
      render(
        <ProtectedRoute>
          <div>secret</div>
        </ProtectedRoute>
      );
      expect(screen.getByText("secret")).toBeTruthy();
      expect(setLocationMock).not.toHaveBeenCalled();
    });
  });

  describe("AdminRoute", () => {
    it("redirects unauthenticated users to /auth/login", async () => {
      useAuthMock.mockReturnValue({
        loading: false,
        isAuthenticated: false,
        isAdmin: false,
      });
      const { AdminRoute } = await loadGuards();
      render(
        <AdminRoute>
          <div>command-center</div>
        </AdminRoute>
      );
      expect(setLocationMock).toHaveBeenCalledWith("/auth/login");
      expect(screen.queryByText("command-center")).toBeNull();
    });

    it("redirects authenticated non-admins to /portal", async () => {
      useAuthMock.mockReturnValue({
        loading: false,
        isAuthenticated: true,
        isAdmin: false,
      });
      const { AdminRoute } = await loadGuards();
      render(
        <AdminRoute>
          <div>command-center</div>
        </AdminRoute>
      );
      expect(setLocationMock).toHaveBeenCalledWith("/portal");
      expect(screen.queryByText("command-center")).toBeNull();
    });

    it("renders children for admins", async () => {
      useAuthMock.mockReturnValue({
        loading: false,
        isAuthenticated: true,
        isAdmin: true,
      });
      const { AdminRoute } = await loadGuards();
      render(
        <AdminRoute>
          <div>command-center</div>
        </AdminRoute>
      );
      expect(screen.getByText("command-center")).toBeTruthy();
      expect(setLocationMock).not.toHaveBeenCalled();
    });
  });
});
