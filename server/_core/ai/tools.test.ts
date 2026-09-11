/**
 * Tests for the deterministic tool layer.
 *
 * Two properties matter most:
 *   1. Surface gating holds at EXECUTION time, not just at offer time — a model
 *      that emits a tool name it was never given must get an error, never data.
 *   2. estimate_project produces the same figures as /estimator, because both
 *      go through the same deterministic basis. A tool must never become a
 *      second, divergent pricing path.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const listProjects = vi.fn();
const getProjectById = vi.fn();
const listMaterials = vi.fn();
const listScheduleItems = vi.fn();

vi.mock("../../_data/projectsRepo", () => ({
  listProjects: (...a: unknown[]) => listProjects(...a),
  getProjectById: (...a: unknown[]) => getProjectById(...a),
}));
vi.mock("../../_data/materialsRepo", () => ({
  listMaterials: (...a: unknown[]) => listMaterials(...a),
}));
vi.mock("../../_data/scheduleRepo", () => ({
  listScheduleItems: (...a: unknown[]) => listScheduleItems(...a),
}));

import {
  toolsForSurface,
  toolNamesForSurface,
  executeTool,
  toolExecutorFor,
  TOOL_NAMES,
} from "./tools";
import { computeEstimate } from "../../../shared/estimating";

const INTERNAL_ONLY = [
  "find_projects",
  "project_detail",
  "material_shortages",
  "project_schedule",
];

beforeEach(() => {
  listProjects.mockReset();
  getProjectById.mockReset();
  listMaterials.mockReset();
  listScheduleItems.mockReset();
});

describe("surface gating", () => {
  it("offers only the estimator to the public surface", () => {
    expect(toolNamesForSurface("public")).toEqual(["estimate_project"]);
  });

  it("offers only the estimator to the portal surface", () => {
    // A client asking a cost question is fine; reading the materials table
    // or another project is not.
    expect(toolNamesForSurface("portal")).toEqual(["estimate_project"]);
  });

  it("offers the operational tools to the internal surface", () => {
    const names = toolNamesForSurface("internal");
    for (const id of INTERNAL_ONLY) expect(names).toContain(id);
    expect(names).toContain("estimate_project");
  });

  it("refuses to execute an internal tool from the public surface", async () => {
    for (const name of INTERNAL_ONLY) {
      const result = (await executeTool("public", name, {})) as {
        error?: string;
      };
      expect(result.error).toMatch(/not available here/);
    }
    // Crucially, no repo was touched.
    expect(listProjects).not.toHaveBeenCalled();
    expect(getProjectById).not.toHaveBeenCalled();
    expect(listMaterials).not.toHaveBeenCalled();
    expect(listScheduleItems).not.toHaveBeenCalled();
  });

  it("refuses to execute an internal tool from the portal surface", async () => {
    for (const name of INTERNAL_ONLY) {
      const result = (await executeTool("portal", name, {
        projectId: 1,
      })) as { error?: string };
      expect(result.error).toMatch(/not available here/);
    }
    expect(getProjectById).not.toHaveBeenCalled();
  });

  it("rejects a tool name that does not exist", async () => {
    const result = (await executeTool("internal", "drop_tables", {})) as {
      error?: string;
    };
    expect(result.error).toMatch(/Unknown tool/);
  });

  it("every offered tool is executable on that surface", async () => {
    listProjects.mockResolvedValue({ data: [], total: 0 });
    listMaterials.mockResolvedValue({ data: [], total: 0 });
    listScheduleItems.mockResolvedValue([]);
    getProjectById.mockResolvedValue(null);

    for (const surface of ["public", "portal", "internal"] as const) {
      for (const name of toolNamesForSurface(surface)) {
        const result = (await executeTool(surface, name, {
          projectType: "kitchen",
          projectId: 1,
        })) as { error?: string };
        expect(result.error ?? "").not.toMatch(/not available here|Unknown/);
      }
    }
  });

  it("exposes a schema for every registered tool", () => {
    const offered = toolsForSurface("internal");
    expect(offered.length).toBe(TOOL_NAMES.length);
    for (const t of offered) {
      expect(t.description.length).toBeGreaterThan(20);
      expect(t.parameters).toHaveProperty("type", "object");
    }
  });
});

describe("estimate_project", () => {
  it("returns exactly what the deterministic basis computes", async () => {
    const result = (await executeTool("public", "estimate_project", {
      projectType: "kitchen",
      complexity: "medium",
    })) as Record<string, number | string>;

    const expected = computeEstimate({
      projectType: "kitchen",
      complexity: "medium",
    });
    if (expected.status !== "ok") throw new Error("fixture should price");

    expect(result.status).toBe("ok");
    expect(result.estimatedLow).toBe(expected.estimate.estimatedLow);
    expect(result.estimatedMid).toBe(expected.estimate.estimatedMid);
    expect(result.estimatedHigh).toBe(expected.estimate.estimatedHigh);
  });

  it("returns VERIFY rather than a number for an unpriced type", async () => {
    const result = (await executeTool("public", "estimate_project", {
      projectType: "adu",
      squareFootage: 800,
    })) as Record<string, string | undefined>;

    expect(result.status).toBe("verify");
    expect(result.estimatedMid).toBeUndefined();
    expect(result.instruction).toMatch(/Do not produce a number/);
  });

  it("returns VERIFY for an unknown project type", async () => {
    const result = (await executeTool("public", "estimate_project", {
      projectType: "moon base",
    })) as { status?: string };
    expect(result.status).toBe("verify");
  });

  it("tells the model the figures are final", async () => {
    const result = (await executeTool("public", "estimate_project", {
      projectType: "roofing",
    })) as { instruction?: string };
    expect(result.instruction).toMatch(/never restate them differently/i);
  });

  it("ignores junk arguments instead of throwing", async () => {
    const result = (await executeTool("public", "estimate_project", {
      projectType: "kitchen",
      squareFootage: "not a number",
      complexity: "extremely",
      materials: "not an array",
    })) as { status?: string };
    // Flat type, so bad sqft is irrelevant; bad complexity falls to default.
    expect(result.status).toBe("ok");
  });
});

describe("internal tools", () => {
  it("bounds how many rows a single call can return", async () => {
    listProjects.mockResolvedValue({
      data: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `P${i}` })),
      total: 100,
    });
    const result = (await executeTool("internal", "find_projects", {})) as {
      projects: unknown[];
    };
    expect(result.projects.length).toBeLessThanOrEqual(15);
  });

  it("projects only the fields the model needs", async () => {
    getProjectById.mockResolvedValue({
      id: 7,
      name: "Tadlock Residence",
      status: "in_progress",
      contracted_budget: 500000,
      actual_cost: 120000,
      progress: 24,
      // Fields that must not reach the model:
      client_secret_notes: "do not leak",
      clients: { email: "client@example.com", user_id: "uuid" },
    });
    const result = (await executeTool("internal", "project_detail", {
      projectId: 7,
    })) as Record<string, unknown>;

    expect(result.name).toBe("Tadlock Residence");
    expect(result).not.toHaveProperty("client_secret_notes");
    expect(result).not.toHaveProperty("clients");
  });

  it("reports a missing project rather than inventing one", async () => {
    getProjectById.mockResolvedValue(null);
    const result = (await executeTool("internal", "project_detail", {
      projectId: 999,
    })) as { error?: string };
    expect(result.error).toMatch(/No project with id 999/);
  });

  it("requires a projectId rather than guessing one", async () => {
    for (const name of ["project_detail", "project_schedule"]) {
      const result = (await executeTool("internal", name, {})) as {
        error?: string;
      };
      expect(result.error).toMatch(/projectId is required/);
    }
    expect(getProjectById).not.toHaveBeenCalled();
  });

  it("warns the model not to derive purchase quantities", async () => {
    listMaterials.mockResolvedValue({
      data: [{ id: 1, name: "2x6 PT", quantity_needed: 40 }],
      total: 1,
    });
    const result = (await executeTool(
      "internal",
      "material_shortages",
      {}
    )) as {
      note: string;
    };
    expect(result.note).toMatch(/not derive a purchase quantity/i);
  });

  it("only asks the repo for actual shortages", async () => {
    listMaterials.mockResolvedValue({ data: [], total: 0 });
    await executeTool("internal", "material_shortages", { projectId: 3 });
    expect(listMaterials).toHaveBeenCalledWith(
      expect.objectContaining({ shortagesOnly: true, projectId: 3 })
    );
  });

  it("surfaces weather sensitivity from the record, not assumption", async () => {
    listScheduleItems.mockResolvedValue([
      {
        id: 1,
        name: "Roof dry-in",
        status: "planned",
        weather_sensitive: true,
      },
      { id: 2, name: "Drywall", status: "planned" },
    ]);
    const result = (await executeTool("internal", "project_schedule", {
      projectId: 4,
    })) as { tasks: { weather_sensitive: boolean }[] };
    expect(result.tasks[0].weather_sensitive).toBe(true);
    expect(result.tasks[1].weather_sensitive).toBe(false);
  });
});

describe("toolExecutorFor", () => {
  it("binds the surface so the caller cannot widen it", async () => {
    const run = toolExecutorFor("public");
    const result = (await run("material_shortages", {})) as { error?: string };
    expect(result.error).toMatch(/not available here/);
    expect(listMaterials).not.toHaveBeenCalled();
  });
});
