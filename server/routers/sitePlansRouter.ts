/**
 * sitePlansRouter — CRUD for Excalidraw site plan canvases.
 * Each plan stores JSON-serialised elements + appState so the canvas can be
 * restored exactly as the user left it.  Thumbnails are optional base-64 PNGs.
 */
import { sitePlansRepo } from "../_data/sitePlansRepo";
import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const sitePlansRouter = router({
  /** List all site plans, optionally filtered by project */
  list: adminProcedure
    .input(
      z.object({
        projectId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      return sitePlansRepo.list(input.projectId);
    }),

  /** Load a single plan by ID (returns full elements + appState JSON) */
  getById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      return sitePlansRepo.getById(input.id);
    }),

  /** Create a new plan */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(300),
        projectId: z.number().int().positive().optional(),
        elements: z.string().default("[]"),
        appState: z.string().default("{}"),
        thumbnailDataUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return sitePlansRepo.create({
        name: input.name,
        project_id: input.projectId ?? null,
        author_id: ctx.user!.id,
        elements: input.elements,
        app_state: input.appState,
        thumbnail_data_url: input.thumbnailDataUrl ?? null,
      });
    }),

  /** Update/save an existing plan */
  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(300).optional(),
        elements: z.string().optional(),
        appState: z.string().optional(),
        thumbnailDataUrl: z.string().optional(),
        projectId: z.number().int().positive().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, thumbnailDataUrl, appState, projectId, ...rest } = input;
      return sitePlansRepo.update(id, {
        ...rest,
        ...(appState !== undefined && { app_state: appState }),
        ...(thumbnailDataUrl !== undefined && {
          thumbnail_data_url: thumbnailDataUrl,
        }),
        ...(projectId !== undefined && { project_id: projectId }),
        updated_at: new Date().toISOString(),
      });
    }),

  /** Delete a plan permanently */
  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return sitePlansRepo.delete(input.id);
    }),
});
