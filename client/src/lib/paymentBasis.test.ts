import { describe, expect, it } from "vitest";
import { resolvePaymentBasis } from "./paymentBasis";

const draft = { approved_by_client: false, estimated_mid: 90_000 };
const pending = { approved_by_client: false, estimated_mid: 95_000 };
const approvedOld = { approved_by_client: true, estimated_mid: 80_000 };

describe("resolvePaymentBasis", () => {
  it("uses the contracted budget when there is one, even over an approved estimate", () => {
    expect(
      resolvePaymentBasis({ contracted_budget: "120000.00" }, [approvedOld])
    ).toEqual({ amount: 120_000, source: "contract" });
  });

  it("falls back to the latest APPROVED estimate's mid-point", () => {
    expect(
      resolvePaymentBasis({ contracted_budget: null }, [approvedOld])
    ).toEqual({ amount: 80_000, source: "approved_estimate" });
  });

  it("skips newer unapproved estimates (draft / pending review) in favour of the approved one", () => {
    // estimates arrive newest-first; the approved one is not first.
    expect(resolvePaymentBasis({}, [draft, pending, approvedOld])).toEqual({
      amount: 80_000,
      source: "approved_estimate",
    });
  });

  it("offers no payable number from a draft or pending estimate alone", () => {
    expect(resolvePaymentBasis({}, [draft, pending])).toBeNull();
  });

  it("offers nothing when there is no project, no contract and no estimates", () => {
    expect(resolvePaymentBasis(undefined, [])).toBeNull();
    expect(resolvePaymentBasis(null, [])).toBeNull();
  });

  it("treats zero, negative and non-numeric budgets as absent", () => {
    for (const bad of [0, "0.00", -5, "abc", null, undefined]) {
      expect(
        resolvePaymentBasis({ contracted_budget: bad as never }, [])
      ).toBeNull();
    }
    expect(
      resolvePaymentBasis({ contracted_budget: 0 }, [approvedOld])
    ).toEqual({ amount: 80_000, source: "approved_estimate" });
  });

  it("ignores an approved estimate whose mid-point is missing or zero", () => {
    expect(
      resolvePaymentBasis({}, [{ approved_by_client: true, estimated_mid: 0 }])
    ).toBeNull();
    expect(
      resolvePaymentBasis({}, [
        { approved_by_client: true, estimated_mid: null },
      ])
    ).toBeNull();
  });
});
