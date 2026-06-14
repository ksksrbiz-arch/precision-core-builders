-- ============================================================
-- Precision Core Builders — Ledger Immutability (append-only)
-- ============================================================
-- Run this SQL in the Supabase SQL editor (or via psql) once, after the
-- ledger_entries table exists. Idempotent — safe to re-run.
--
-- Why this exists:
--   The ledger is "append-only" at the API layer only because no update or
--   delete tRPC procedure is exposed. But the server uses the Supabase
--   service-role key, which BYPASSES Row-Level Security — so nothing at the
--   data layer actually prevents a recorded decision or cost from being
--   altered or erased. These triggers make ledger_entries genuinely
--   tamper-evident at the database level.
--
-- What it must NOT break (verified against Postgres 17):
--   • ON DELETE CASCADE from projects — clearDemoData() and ordinary project
--     deletion remove a project's ledger rows. Allowed: during the cascade the
--     parent project row is already gone, so block_delete() lets it through.
--   • ON DELETE SET NULL of author_id — deleting a user nulls author_id on
--     their ledger rows (an UPDATE). Allowed: block_update() compares only the
--     recorded *content* columns, so an author_id-only change passes.
--
-- Behaviour summary:
--   INSERT                       -> allowed
--   UPDATE of any content column -> blocked (restrict_violation)
--   UPDATE of author_id only     -> allowed (FK set-null maintenance)
--   direct DELETE (project live) -> blocked (restrict_violation)
--   cascade DELETE (project gone)-> allowed
-- ============================================================

create or replace function pcb_ledger_block_update()
returns trigger
language plpgsql
as $$
begin
  -- Allow the FK-driven author_id -> NULL update (user deletion); block any
  -- change to the recorded content of an existing entry.
  if (new.id, new.project_id, new.entry_type, new.title, new.description,
      new.amount_delta, new.document_url, new.document_name,
      new.visible_to_client, new.created_at)
     is distinct from
     (old.id, old.project_id, old.entry_type, old.title, old.description,
      old.amount_delta, old.document_url, old.document_name,
      old.visible_to_client, old.created_at)
  then
    raise exception
      'ledger_entries is append-only: entries cannot be modified (id=%)', old.id
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

create or replace function pcb_ledger_block_delete()
returns trigger
language plpgsql
as $$
begin
  -- Permit deletes that occur as part of a parent project cascade (the parent
  -- project row is already gone within this transaction). Block direct deletes
  -- of an entry whose project still exists.
  if exists (select 1 from projects where id = old.project_id) then
    raise exception
      'ledger_entries is append-only: entries cannot be deleted (id=%)', old.id
      using errcode = 'restrict_violation';
  end if;
  return old;
end;
$$;

drop trigger if exists ledger_entries_block_update on ledger_entries;
create trigger ledger_entries_block_update
  before update on ledger_entries
  for each row execute function pcb_ledger_block_update();

drop trigger if exists ledger_entries_block_delete on ledger_entries;
create trigger ledger_entries_block_delete
  before delete on ledger_entries
  for each row execute function pcb_ledger_block_delete();
