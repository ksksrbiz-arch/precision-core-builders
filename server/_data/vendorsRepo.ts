/**
 * Data-access layer for the `vendors` table — the standalone, deduped supplier
 * catalog. Mirrors subContractorsRepo: thin repository functions over the shared
 * service-role Supabase handle, with camelCase → snake_case insert/update
 * mapping so routers focus on validation + shaping.
 */
import { data, unwrapVoid } from "./repository";

export async function listVendors() {
  const { data: rows, error } = await data
    .from("vendors")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function getVendorById(id: number) {
  const { data: row, error } = await data
    .from("vendors")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export type CreateVendorInput = {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  category?: string;
  accountNumber?: string;
  paymentTerms?: string;
  notes?: string;
  isActive?: boolean;
};

export async function createVendor(input: CreateVendorInput) {
  const { data: row, error } = await data
    .from("vendors")
    .insert({
      name: input.name,
      contact_name: input.contactName,
      email: input.email,
      phone: input.phone,
      website: input.website,
      address: input.address,
      category: input.category,
      account_number: input.accountNumber,
      payment_terms: input.paymentTerms,
      notes: input.notes,
      is_active: input.isActive,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function updateVendor(id: number, patch: Record<string, unknown>) {
  const { data: row, error } = await data
    .from("vendors")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function deleteVendor(id: number) {
  return unwrapVoid(await data.from("vendors").delete().eq("id", id));
}
