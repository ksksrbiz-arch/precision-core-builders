import { describe, expect, it } from "vitest";
import {
  EMPTY_SUB_FORM,
  buildSubPayload,
  insuranceStatus,
  subToForm,
} from "./subContractors";

describe("buildSubPayload", () => {
  it("omits blank fields on create (never sends an empty email)", () => {
    const p = buildSubPayload(
      { ...EMPTY_SUB_FORM, name: "  Ada  " },
      undefined
    );
    expect(p).toEqual({
      name: "Ada",
      company: undefined,
      email: undefined,
      phone: undefined,
      trade: undefined,
      licenseNumber: undefined,
      insuranceExpiry: undefined,
      notes: undefined,
      rating: undefined,
    });
  });

  it("sends null for blank fields on edit so they are cleared", () => {
    const p = buildSubPayload({ ...EMPTY_SUB_FORM, name: "Ada" }, null);
    expect(p).toMatchObject({
      company: null,
      email: null,
      phone: null,
      trade: null,
      licenseNumber: null,
      insuranceExpiry: null,
      notes: null,
      rating: null,
    });
  });

  it("lower-cases the trade to the enum value and normalises the date", () => {
    const p = buildSubPayload(
      {
        ...EMPTY_SUB_FORM,
        name: "Ada",
        trade: "Electrical",
        insuranceExpiry: "2027-03-01",
        rating: "4",
        email: " ada@example.com ",
      },
      undefined
    );
    expect(p.trade).toBe("electrical");
    expect(p.insuranceExpiry).toBe("2027-03-01T00:00:00.000Z");
    expect(p.rating).toBe(4);
    expect(p.email).toBe("ada@example.com");
  });

  it.each(["0", "6", "abc", "-1"])("ignores an out-of-range rating (%s)", r => {
    expect(
      buildSubPayload({ ...EMPTY_SUB_FORM, name: "A", rating: r }, null).rating
    ).toBeNull();
  });
});

describe("subToForm", () => {
  it("hydrates from a row and maps the stored trade back to its option", () => {
    const f = subToForm({
      name: "Ada",
      trade: "electrical",
      insurance_expiry: "2027-03-01T00:00:00",
      rating: 5,
      is_active: false,
      email: null,
    });
    expect(f).toMatchObject({
      name: "Ada",
      trade: "Electrical",
      insuranceExpiry: "2027-03-01",
      rating: "5",
      isActive: false,
      email: "",
    });
  });

  it("keeps a legacy free-text trade and defaults to active", () => {
    const f = subToForm({ name: "B", trade: "Finish carpentry" });
    expect(f.trade).toBe("Finish carpentry");
    expect(f.isActive).toBe(true);
  });
});

describe("insuranceStatus", () => {
  const now = new Date("2026-10-01T12:00:00Z");

  it("returns null when no expiry is on file", () => {
    expect(insuranceStatus(null, now)).toBeNull();
    expect(insuranceStatus("", now)).toBeNull();
    expect(insuranceStatus("garbage", now)).toBeNull();
  });

  it("flags a past date as expired", () => {
    expect(insuranceStatus("2026-09-01", now)).toMatchObject({
      status: "expired",
    });
  });

  it("flags a date within 30 days as expiring", () => {
    expect(insuranceStatus("2026-10-20", now)).toMatchObject({
      status: "expiring",
      daysLeft: 20,
    });
  });

  it("treats today (end of day) as still valid, not expired", () => {
    expect(insuranceStatus("2026-10-01", now)?.status).toBe("expiring");
  });

  it("is current beyond the window", () => {
    expect(insuranceStatus("2027-03-01T00:00:00.000Z", now)?.status).toBe(
      "current"
    );
  });
});
