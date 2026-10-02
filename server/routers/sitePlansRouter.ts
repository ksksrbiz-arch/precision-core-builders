/**
 * sitePlansRouter — CRUD for Excalidraw site plan canvases.
 * Each plan stores JSON-serialised elements + appState so the canvas can be
 * restored exactly as the user left it.  Thumbnails are optional base-64 PNGs.
 */
import { sitePlansRepo } from "../_data/sitePlansRepo";
import { adminProcedure, router } from "../_core/trpc";
import { authorUuid } from "../_core/identity";
import { computeTakeoff, type PlanElement } from "../../shared/planMeasure";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/** Canvas pixels per foot — bounds mirror the DB CHECK constraint. */
const scaleInput = z.number().min(0.5).max(5000);

function parseElements(raw: string | null | undefined): PlanElement[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (Array.isArray(parsed)) return parsed as PlanElement[];
  } catch {
    // fall through
  }
  throw new TRPCError({
    code: "UNPROCESSABLE_CONTENT",
    message: "This plan's drawing data is unreadable.",
  });
}

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
        scalePxPerFt: scaleInput.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return sitePlansRepo.create({
        name: input.name,
        project_id: input.projectId ?? null,
        author_id: authorUuid(ctx.user),
        elements: input.elements,
        app_state: input.appState,
        thumbnail_data_url: input.thumbnailDataUrl ?? null,
        // Omitted unless calibrated, so an uncalibrated save never touches the
        // column (NULL is its default).
        ...(input.scalePxPerFt !== undefined && {
          scale_px_per_ft: input.scalePxPerFt,
        }),
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
        /** null clears the calibration back to the default scale. */
        scalePxPerFt: scaleInput.nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const {
        id,
        thumbnailDataUrl,
        appState,
        projectId,
        scalePxPerFt,
        ...rest
      } = input;
      return sitePlansRepo.update(id, {
        ...rest,
        ...(appState !== undefined && { app_state: appState }),
        ...(thumbnailDataUrl !== undefined && {
          thumbnail_data_url: thumbnailDataUrl,
        }),
        ...(projectId !== undefined && { project_id: projectId }),
        ...(scalePxPerFt !== undefined && { scale_px_per_ft: scalePxPerFt }),
        updated_at: new Date().toISOString(),
      });
    }),

  /**
   * Quantities (floor area, wall runs, openings, fixtures) computed from the
   * STORED drawing and scale — never from numbers the browser supplies — so
   * what reaches an estimate is derived, not asserted.
   */
  takeoff: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const plan = await sitePlansRepo.getById(input.id);
      const scale =
        plan.scale_px_per_ft == null ? null : Number(plan.scale_px_per_ft);
      return {
        planId: plan.id as number,
        name: plan.name as string,
        calibrated: scale !== null,
        takeoff: computeTakeoff(parseElements(plan.elements), scale),
      };
    }),

  /** Delete a plan permanently */
  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return sitePlansRepo.delete(input.id);
    }),
});
