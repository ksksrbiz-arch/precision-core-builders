/**
 * The lead board lives in `pcb_leads` (migration 0016). Production also has an
 * unrelated legacy `leads` table (uuid id, `email NOT NULL`), and pointing the
 * app at it made every website inquiry insert fail silently. These tests pin the
 * table name so that cannot regress unnoticed.
 */
import { describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const tables: string[] = [];

vi.mock("./repository", () => {
  const result = { data: [], error: null };
  const chain: any = new Proxy(() => chain, {
    get: (_t, prop) =>
      prop === "then"
        ? (resolve: (v: unknown) => void) => resolve(result)
        : prop === "single"
          ? () => Promise.resolve({ data: {}, error: null })
          : chain,
    apply: () => chain,
  });
  return {
    data: {
      from: (table: string) => {
        tables.push(table);
        return chain;
      },
    },
  };
});

import { leadsRepo } from "./leadsRepo";

describe("leadsRepo", () => {
  it("only ever touches pcb_leads", async () => {
    await leadsRepo.list(10);
    await leadsRepo.create({
      name: "x",
      score: 0,
      priority: "low",
      estimated_value: null,
      scored_by: null,
    });
    await leadsRepo.delete(1);
    await leadsRepo.clear();
    expect(tables).toHaveLength(4);
    expect(new Set(tables)).toEqual(new Set(["pcb_leads"]));
  });
});

describe("legacy leads table", () => {
  const root = resolve(import.meta.dirname, "../..");
  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap(name => {
      const path = join(dir, name);
      if (name === "node_modules" || name === "__tests__") return [];
      if (statSync(path).isDirectory()) return sources(path);
      return /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [path] : [];
    });
  }

  it("is not referenced by any server, function or client code", () => {
    const offenders = [
      ...sources(join(root, "server")),
      ...sources(join(root, "netlify/functions")),
      ...sources(join(root, "client/src")),
    ].filter(file =>
      /\.from\(\s*["'`]leads["'`]\s*\)/.test(readFileSync(file, "utf8"))
    );
    expect(offenders).toEqual([]);
  });
});
