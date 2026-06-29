import { describe, expect, it } from "vitest";
import { sha256Hex, timingSafeEqualStr, verifySha256 } from "../_lib/crypto";

describe("timingSafeEqualStr", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeEqualStr("hunter2", "hunter2")).toBe(true);
  });

  it("returns false for different strings of equal length", () => {
    expect(timingSafeEqualStr("hunter2", "hunter3")).toBe(false);
  });

  it("returns false for different lengths without throwing", () => {
    expect(timingSafeEqualStr("a", "abc")).toBe(false);
    expect(timingSafeEqualStr("", "x")).toBe(false);
  });
});

describe("sha256Hex", () => {
  it("produces the known digest for a known input", () => {
    // echo -n "abc" | sha256sum
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });
});

describe("verifySha256", () => {
  it("matches a plaintext against its digest", () => {
    expect(verifySha256("abc", sha256Hex("abc"))).toBe(true);
    expect(verifySha256("abc", sha256Hex("abd"))).toBe(false);
  });
});
