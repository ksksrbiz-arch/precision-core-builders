/**
 * Data-access layer for the `clients` domain.
 *
 * Holds the Supabase query chains previously embedded in clientsRouter so the
 * router keeps only validation + shaping. Query shapes (columns, filters,
 * ordering, snake_case field mapping) are preserved exactly.
 */
import {
  data,
  escapePostgrestFilterTerm,
  paginate,
  unwrapList,
  unwrapOne,
  unwrapVoid,
} from "./repository";

export type ListClientsInput = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export async function listClients(input: ListClientsInput) {
  const { from, to } = paginate(input);
  let q = data
    .from("clients")
    .select("*, projects(id,name,status)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (input.search) {
    const term = escapePostgrestFilterTerm(input.search);
    q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  return unwrapList(await q);
}

export async function getClientById(id: number) {
  return unwrapOne(
    await data
      .from("clients")
      .select(
        "*, projects(id,name,status,estimated_budget,actual_cost,completion_percent,created_at)"
      )
      .eq("id", id)
      .single()
  );
}

export type CreateClientInput = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  leadSource?: string;
  userId?: string;
};

export async function createClient(input: CreateClientInput) {
  return unwrapOne(
    await data
      .from("clients")
      .insert({
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
        notes: input.notes,
        lead_source: input.leadSource,
        user_id: input.userId,
      })
      .select()
      .single()
  );
}

export async function updateClient(
  id: number,
  fields: Record<string, unknown>
) {
  return unwrapOne(
    await data.from("clients").update(fields).eq("id", id).select().single()
  );
}

export async function deleteClient(id: number) {
  return unwrapVoid(await data.from("clients").delete().eq("id", id));
}
