import { describe, expect, it } from "vitest";
import { authorUuid, isUuid } from "./identity";

describe("identity", () => {
  it("recognises canonical UUIDs", () => {
    expect(isUuid("3f2b8c1e-5d4a-4b7e-9a10-0c2d3e4f5a6b")).toBe(true);
    expect(isUuid("3F2B8C1E-5D4A-4B7E-9A10-0C2D3E4F5A6B")).toBe(true);
  });

  it("rejects synthetic admin ids and junk", () => {
    expect(isUuid("admin")).toBe(false);
    expect(isUuid("dev-admin-local")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid("3f2b8c1e-5d4a-4b7e-9a10-0c2d3e4f5a6b; drop")).toBe(false);
  });

  it("authorUuid returns the id only for real users", () => {
    const id = "3f2b8c1e-5d4a-4b7e-9a10-0c2d3e4f5a6b";
    expect(authorUuid({ id })).toBe(id);
    expect(authorUuid({ id: "admin" })).toBeNull();
    expect(authorUuid(null)).toBeNull();
    expect(authorUuid(undefined)).toBeNull();
  });
});
