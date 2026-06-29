/**
 * Data-access layer for the `sub_contractors` table (plus the project read used
 * when assembling a briefing).
 *
 * Query shapes (tables, `select(...)` strings, filters, ordering, and
 * snake_case insert/update mapping) are preserved exactly from the original
 * subContractorsRouter — this is a structural refactor, not a behaviour change.
 */
import { data, unwrapVoid } from "./repository";

export async function listSubContractors() {
  const { data: rows, error } = await data
    .from("sub_contractors")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function getSubContractorById(id: number) {
  const { data: row, error } = await data
    .from("sub_contractors")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export type CreateSubContractorInput = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  trade?: string;
  licenseNumber?: string;
  insuranceExpiry?: string;
  notes?: string;
};

export async function createSubContractor(input: CreateSubContractorInput) {
  const { data: row, error } = await data
    .from("sub_contractors")
    .insert({
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      trade: input.trade,
      license_number: input.licenseNumber,
      insurance_expiry: input.insuranceExpiry,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function updateSubContractor(
  id: number,
  patch: Record<string, unknown>
) {
  const { data: row, error } = await data
    .from("sub_contractors")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

/** Contact fields used to brief a sub-contractor. */
export async function getSubContractorContact(id: number) {
  const { data: sub } = await data
    .from("sub_contractors")
    .select("name,email,phone")
    .eq("id", id)
    .single();
  return sub;
}

/** Project location fields used in a briefing. */
export async function getProjectBriefingInfo(id: number) {
  const { data: project } = await data
    .from("projects")
    .select("name,address,city")
    .eq("id", id)
    .single();
  return project;
}

export async function deleteSubContractor(id: number) {
  return unwrapVoid(await data.from("sub_contractors").delete().eq("id", id));
}
