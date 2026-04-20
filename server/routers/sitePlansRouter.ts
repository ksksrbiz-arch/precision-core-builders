/**
 * sitePlansRouter — CRUD for Excalidraw site plan canvases.
 * Each plan stores JSON-serialised elements + appState so the canvas can be
 * restored exactly as the user left it.  Thumbnails are optional base-64 PNGs.
 */
import { db } from "../db";
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
      let q = db
        .from("site_plans")
        .select(
          "id,name,project_id,author_id,thumbnail_data_url,created_at,updated_at"
        )
        .order("updated_at", { ascending: false });
      if (input.projectId) q = q.eq("project_id", input.projectId);
      const { data, error } = await q;
      if (error)
        throw new Error(`Failed to fetch site plans: ${error.message}`);
      return data ?? [];
    }),

  /** Load a single plan by ID (returns full elements + appState JSON) */
  getById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { data, error } = await db
        .from("site_plans")
        .select("*")
        .eq("id", input.id)
        .single();
      if (error)
        throw new Error(
          `Failed to fetch site plan with ID ${input.id}: ${error.message}`
        );
      return data;
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
      const { data, error } = await db
        .from("site_plans")
        .insert({
          name: input.name,
          project_id: input.projectId ?? null,
          author_id: ctx.user!.id,
          elements: input.elements,
          app_state: input.appState,
          thumbnail_data_url: input.thumbnailDataUrl ?? null,
        })
        .select()
        .single();
      if (error)
        throw new Error(`Failed to create site plan: ${error.message}`);
      return data;
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
      const { data, error } = await db
        .from("site_plans")
        .update({
          ...rest,
          ...(appState !== undefined && { app_state: appState }),
          ...(thumbnailDataUrl !== undefined && {
            thumbnail_data_url: thumbnailDataUrl,
          }),
          ...(projectId !== undefined && { project_id: projectId }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error)
        throw new Error(
          `Failed to update site plan with ID ${id}: ${error.message}`
        );
      return data;
    }),

  /** Delete a plan permanently */
  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { error } = await db.from("site_plans").delete().eq("id", input.id);
      if (error)
        throw new Error(
          `Failed to delete site plan with ID ${input.id}: ${error.message}`
        );
      return { success: true };
    }),
});
