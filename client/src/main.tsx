import { trpc } from "@/lib/trpc";
import { getAccessToken } from "@/lib/supabase";
import {
  DEV_BYPASS_KEY,
  getStoredAdminSessionToken,
} from "@/_core/hooks/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes("10001"))
          return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
  },
});

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    console.error("[Query Error]", event.query.state.error);
  }
});
queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    console.error("[Mutation Error]", event.mutation.state.error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        // In dev mode with the bypass active, send the dev token
        if (
          import.meta.env.VITE_DEV_MODE === "true" &&
          localStorage.getItem(DEV_BYPASS_KEY) === "true"
        ) {
          return { Authorization: "Bearer dev-admin-token" };
        }
        const adminToken = getStoredAdminSessionToken();
        if (adminToken) {
          return { Authorization: `Bearer ${adminToken}` };
        }
        // Attach Supabase JWT so server context can verify identity
        const token = await getAccessToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

// ── Service Worker Registration ─────────────────────────────────────────
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  // If a controller was already present on load, a subsequent controllerchange
  // means a new SW activated and claimed the page — reload once so the UI
  // picks up the freshly deployed JS/CSS instead of running stale cached code.
  // Guarding on the pre-existing controller prevents an unwanted reload on
  // first-ever install.
  if (navigator.serviceWorker.controller) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(reg => {
        // Check for updates every 30 min
        setInterval(() => reg.update(), 30 * 60 * 1000);
      })
      .catch(err => console.warn("[SW] Registration failed:", err));
  });
}
