/**
 * Shared project-ownership access control for portal-facing procedures.
 *
 * Several `protectedProcedure`s take a `projectId` and were reachable by any
 * authenticated client for an arbitrary id (cross-tenant read/write). Route
 * those through `assertProjectAccess` so a portal client can only touch their
 * own, portal-enabled project; admins pass unconditionally.
 */
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";
import { getProjectById } from "../_data/projectsRepo";

type ProjectWithClient = Awaited<ReturnType<typeof getProjectById>>;

/**
 * Ensure the caller may access `projectId`. Admins always pass. A portal client
 * passes only when the project's owning client row matches the caller and the
 * portal is enabled. Returns the project row (with embedded `clients`) so a
 * caller can reuse it — e.g. to attribute a write to the client — or `null` for
 * the admin fast-path. Throws FORBIDDEN otherwise (and for a missing project,
 * so existence isn't leaked).
 */
export async function assertProjectAccess(
  ctx: TrpcContext,
  projectId: number
): Promise<ProjectWithClient | null> {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (ctx.user.role === "admin") return null;

  let project: ProjectWithClient;
  try {
    project = await getProjectById(projectId);
  } catch {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    });
  }

  if (
    !project ||
    project.clients?.user_id !== ctx.user.id ||
    !project.client_portal_enabled
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    });
  }

  return project;
}
