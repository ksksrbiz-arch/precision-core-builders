/**
 * Deterministic tools the model may call.
 *
 * The division of labour: the model decides *which* tool and *when*; code
 * decides *what the answer is*. A tool never asks a model anything, and a tool
 * result is always derived from the estimating basis or the database — never
 * generated.
 *
 * Surface gates tool access exactly as it gates specialists. A public visitor
 * can price a hypothetical project; only Eric's authenticated admin surface can
 * read a real project, its materials, or its schedule. `toolsForSurface()` is
 * the single place that decides, and `executeTool()` re-checks the surface at
 * execution time — so a model that hallucinates a tool name it was never
 * offered gets an error, not data.
 */
import type { LLMTool } from "../llm";
import type { AiSurface } from "./router";
import { computeEstimate } from "../../../shared/estimating";
import { listProjects, getProjectById } from "../../_data/projectsRepo";
import { listMaterials } from "../../_data/materialsRepo";
import { listScheduleItems } from "../../_data/scheduleRepo";

type ToolDef = {
  tool: LLMTool;
  surfaces: AiSurface[];
  run: (args: Record<string, unknown>) => Promise<unknown> | unknown;
};

const str = (v: unknown, max = 200): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const num = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Bounds every list tool so one call can't drag a whole table into the prompt. */
const MAX_ROWS = 15;

const DEFS: Record<string, ToolDef> = {
  // ── Available to everyone ────────────────────────────────────────────────
  estimate_project: {
    surfaces: ["public", "portal", "internal"],
    tool: {
      name: "estimate_project",
      description:
        "Calculate a planning-level cost estimate from Precision Core Builders' reviewed cost basis. Use when a visitor asks what something costs or would cost. Returns either a computed range or a VERIFY result when the project type has no reviewed cost band — never a guess.",
      parameters: {
        type: "object",
        properties: {
          projectType: {
            type: "string",
            description:
              "One of: new-home, full-remodel, kitchen, bathroom, addition, adu, outdoor, roofing, restoration, cabinets",
          },
          squareFootage: {
            type: "number",
            description: "Required for per-square-foot project types.",
          },
          complexity: { type: "string", enum: ["low", "medium", "high"] },
          materials: {
            type: "array",
            items: { type: "string" },
            description: "Premium material selections, if any were mentioned.",
          },
        },
        required: ["projectType"],
      },
    },
    run: args => {
      const computed = computeEstimate({
        projectType: str(args.projectType, 100),
        squareFootage: num(args.squareFootage),
        complexity: ["low", "medium", "high"].includes(str(args.complexity))
          ? (str(args.complexity) as "low" | "medium" | "high")
          : undefined,
        materials: Array.isArray(args.materials)
          ? args.materials.slice(0, 20).map(m => str(m, 100))
          : undefined,
      });
      if (computed.status === "verify") {
        return {
          status: "verify",
          reason: computed.reason,
          instruction:
            "Do not produce a number. Explain that this project type needs an on-site estimate and invite them to book one.",
        };
      }
      return {
        status: "ok",
        ...computed.estimate,
        derivation: computed.derivation,
        instruction:
          "These figures are final. Explain them; never restate them differently or adjust them.",
      };
    },
  },

  // ── Internal only ────────────────────────────────────────────────────────
  find_projects: {
    surfaces: ["internal"],
    tool: {
      name: "find_projects",
      description:
        "Search Eric's projects by name, or list recent ones. Use when a question names a project you do not already have data for.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Partial project name." },
          status: {
            type: "string",
            enum: ["lead", "contracted", "in_progress", "complete"],
          },
        },
      },
    },
    run: async args => {
      const rows = await listProjects({
        search: str(args.search, 100) || undefined,
        status: str(args.status, 30) || undefined,
        pageSize: MAX_ROWS,
      } as Parameters<typeof listProjects>[0]);
      return {
        projects: rows.data
          .slice(0, MAX_ROWS)
          .map((p: Record<string, unknown>) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            contracted_budget: p.contracted_budget,
            actual_cost: p.actual_cost,
            progress: p.progress,
          })),
      };
    },
  },

  project_detail: {
    surfaces: ["internal"],
    tool: {
      name: "project_detail",
      description:
        "Full detail for one project by id. Call find_projects first if you only have a name.",
      parameters: {
        type: "object",
        properties: { projectId: { type: "number" } },
        required: ["projectId"],
      },
    },
    run: async args => {
      const id = num(args.projectId);
      if (!id) return { error: "projectId is required." };
      const row = (await getProjectById(id)) as Record<string, unknown> | null;
      if (!row) return { error: `No project with id ${id}.` };
      return {
        id: row.id,
        name: row.name,
        status: row.status,
        contracted_budget: row.contracted_budget,
        actual_cost: row.actual_cost,
        progress: row.progress,
        start_date: row.start_date,
        target_end_date: row.target_end_date,
      };
    },
  },

  material_shortages: {
    surfaces: ["internal"],
    tool: {
      name: "material_shortages",
      description:
        "Materials currently flagged short, optionally for one project. Use for procurement questions.",
      parameters: {
        type: "object",
        properties: { projectId: { type: "number" } },
      },
    },
    run: async args => {
      const rows = await listMaterials({
        projectId: num(args.projectId),
        shortagesOnly: true,
        pageSize: MAX_ROWS,
      });
      return {
        shortages: rows.data
          .slice(0, MAX_ROWS)
          .map((m: Record<string, unknown>) => ({
            id: m.id,
            name: m.name,
            unit: m.unit,
            quantity_needed: m.quantity_needed,
            quantity_ordered: m.quantity_ordered,
            project: (m.projects as { name?: string } | null)?.name ?? null,
            vendor: (m.vendors as { name?: string } | null)?.name ?? null,
          })),
        note: "Quantities are as recorded. Do not derive a purchase quantity that is not here.",
      };
    },
  },

  project_schedule: {
    surfaces: ["internal"],
    tool: {
      name: "project_schedule",
      description:
        "Schedule items for one project, including which tasks are weather-sensitive. Use for sequencing and delay questions.",
      parameters: {
        type: "object",
        properties: { projectId: { type: "number" } },
        required: ["projectId"],
      },
    },
    run: async args => {
      const id = num(args.projectId);
      if (!id) return { error: "projectId is required." };
      const rows = (await listScheduleItems(id)) as
        Record<string, unknown>[] | null;
      return {
        tasks: (rows ?? [])
          .slice(0, MAX_ROWS)
          .map((t: Record<string, unknown>) => ({
            id: t.id,
            name: t.name ?? t.title,
            status: t.status,
            planned_start: t.planned_start,
            planned_end: t.planned_end,
            weather_sensitive: t.weather_sensitive ?? false,
          })),
      };
    },
  },
};

/** The tools a surface is permitted to offer the model. */
export function toolsForSurface(surface: AiSurface): LLMTool[] {
  return Object.values(DEFS)
    .filter(d => d.surfaces.includes(surface))
    .map(d => d.tool);
}

/** Tool names a surface may execute — the authorization list. */
export function toolNamesForSurface(surface: AiSurface): string[] {
  return toolsForSurface(surface).map(t => t.name);
}

/**
 * Execute a tool on behalf of a surface.
 *
 * The surface is re-checked here rather than trusted from the offer list: a
 * model can emit any name it likes, including one it was never given, and that
 * must return an error rather than reaching the database.
 */
export async function executeTool(
  surface: AiSurface,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const def = DEFS[name];
  if (!def) return { error: `Unknown tool: ${name}` };
  if (!def.surfaces.includes(surface)) {
    return { error: `Tool ${name} is not available here.` };
  }
  return def.run(args);
}

/** A bound executor for `runToolLoop`. */
export function toolExecutorFor(surface: AiSurface) {
  return (name: string, args: Record<string, unknown>) =>
    executeTool(surface, name, args);
}

export const TOOL_NAMES = Object.keys(DEFS);
