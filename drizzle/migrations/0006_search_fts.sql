-- Operational search — Postgres full-text search (FTS) with ranking.
--
-- Apply via the Supabase SQL editor or `pnpm db:push`. Until this migration is
-- applied, `netlify/functions/search.ts` transparently falls back to its prior
-- PostgREST ILIKE behavior — search never regresses. Once the `search_all`
-- function and its GIN indexes exist, the function calls the RPC for ranked,
-- stemmed, multi-word full-text search.
--
-- Fully idempotent: safe to run repeatedly (CREATE OR REPLACE FUNCTION,
-- CREATE INDEX IF NOT EXISTS, CREATE EXTENSION IF NOT EXISTS).

-- pg_trgm powers optional typo/fuzzy tolerance (available for future use).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── IMMUTABLE enum→text helper ───────────────────────────────────────────────
-- Casting an enum to text (`col::text`) calls the enum I/O function `enum_out`,
-- which Postgres marks STABLE (labels can change via ALTER TYPE ... RENAME
-- VALUE), so a bare `enum::text` is rejected inside an expression index with
-- "functions in index expression must be marked IMMUTABLE" (42P17). We wrap the
-- cast in an IMMUTABLE SQL function so it is usable in the GIN index below. This
-- is safe in practice: enum labels are effectively constant; if one is ever
-- renamed, REINDEX the affected index. The search_all query uses this same
-- helper so its expression matches the index exactly (planner can use it).
CREATE OR REPLACE FUNCTION immutable_enum_text(anyenum)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT $1::text $$;

-- ─── GIN expression indexes ───────────────────────────────────────────────────
-- Each index's to_tsvector(...) expression must match the expression used by the
-- search_all function EXACTLY, or the planner won't use the index. 'english' is
-- passed explicitly so to_tsvector is IMMUTABLE (required for expression indexes).

CREATE INDEX IF NOT EXISTS idx_projects_fts ON projects USING gin (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(address, ''))
);

CREATE INDEX IF NOT EXISTS idx_clients_fts ON clients USING gin (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(email, ''))
);

CREATE INDEX IF NOT EXISTS idx_field_reports_fts ON field_reports USING gin (
  to_tsvector(
    'english',
    coalesce(summary, '') || ' ' || coalesce(transcription, '')
  )
);

CREATE INDEX IF NOT EXISTS idx_materials_fts ON materials USING gin (
  to_tsvector(
    'english',
    coalesce(name, '') || ' ' || coalesce(category, '') || ' ' ||
      coalesce(vendor_name, '')
  )
);

CREATE INDEX IF NOT EXISTS idx_schedule_items_fts ON schedule_items USING gin (
  to_tsvector(
    'english',
    coalesce(title, '') || ' ' || coalesce(immutable_enum_text(task_type), '')
  )
);

-- ─── search_all(q) ────────────────────────────────────────────────────────────
-- Ranked FTS across the five operational entities. Uses websearch_to_tsquery so
-- multi-word queries, quoted phrases, and "-" negation work out of the box.
-- Returns a uniform, pre-formatted shape the function maps 1:1 to the frontend
-- SearchResult contract (title/subtitle already match the ILIKE path). Each
-- entity is capped at 5 rows (matching the prior per-entity limits), then the
-- union is ordered by ts_rank descending.
CREATE OR REPLACE FUNCTION search_all(q text)
RETURNS TABLE (
  entity text,
  id integer,
  title text,
  subtitle text,
  rank real,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  WITH tsq AS (SELECT websearch_to_tsquery('english', q) AS query)
  SELECT * FROM (
    -- Projects
    (
      SELECT
        'project'::text AS entity,
        p.id,
        p.name::text AS title,
        concat_ws(
          ' · ',
          nullif(p.city, ''),
          nullif(replace(p.status::text, '_', ' '), '')
        ) AS subtitle,
        ts_rank(
          to_tsvector(
            'english',
            coalesce(p.name, '') || ' ' || coalesce(p.address, '')
          ),
          tsq.query
        ) AS rank,
        p.created_at
      FROM projects p, tsq
      WHERE to_tsvector(
              'english',
              coalesce(p.name, '') || ' ' || coalesce(p.address, '')
            ) @@ tsq.query
      ORDER BY rank DESC
      LIMIT 5
    )
    UNION ALL
    -- Clients
    (
      SELECT
        'client'::text AS entity,
        c.id,
        c.name::text AS title,
        concat_ws(' · ', nullif(c.email, ''), nullif(c.city, '')) AS subtitle,
        ts_rank(
          to_tsvector(
            'english',
            coalesce(c.name, '') || ' ' || coalesce(c.email, '')
          ),
          tsq.query
        ) AS rank,
        c.created_at
      FROM clients c, tsq
      WHERE to_tsvector(
              'english',
              coalesce(c.name, '') || ' ' || coalesce(c.email, '')
            ) @@ tsq.query
      ORDER BY rank DESC
      LIMIT 5
    )
    UNION ALL
    -- Field reports
    (
      SELECT
        'field_report'::text AS entity,
        fr.id,
        'Field Report — ' || to_char(fr.report_date, 'Mon FMDD, YYYY') AS title,
        CASE
          WHEN coalesce(fr.summary, '') <> ''
            THEN left(fr.summary, 100) ||
              CASE WHEN length(fr.summary) > 100 THEN '…' ELSE '' END
          ELSE 'No summary'
        END AS subtitle,
        ts_rank(
          to_tsvector(
            'english',
            coalesce(fr.summary, '') || ' ' || coalesce(fr.transcription, '')
          ),
          tsq.query
        ) AS rank,
        fr.created_at
      FROM field_reports fr, tsq
      WHERE to_tsvector(
              'english',
              coalesce(fr.summary, '') || ' ' || coalesce(fr.transcription, '')
            ) @@ tsq.query
      ORDER BY rank DESC
      LIMIT 5
    )
    UNION ALL
    -- Materials
    (
      SELECT
        'material'::text AS entity,
        m.id,
        m.name::text AS title,
        concat_ws(
          ' · ',
          nullif(m.category, ''),
          nullif(m.vendor_name, '')
        ) AS subtitle,
        ts_rank(
          to_tsvector(
            'english',
            coalesce(m.name, '') || ' ' || coalesce(m.category, '') || ' ' ||
              coalesce(m.vendor_name, '')
          ),
          tsq.query
        ) AS rank,
        m.created_at
      FROM materials m, tsq
      WHERE to_tsvector(
              'english',
              coalesce(m.name, '') || ' ' || coalesce(m.category, '') || ' ' ||
                coalesce(m.vendor_name, '')
            ) @@ tsq.query
      ORDER BY rank DESC
      LIMIT 5
    )
    UNION ALL
    -- Schedule items
    (
      SELECT
        'schedule_item'::text AS entity,
        s.id,
        s.title::text AS title,
        concat_ws(
          ' · ',
          nullif(s.task_type::text, ''),
          nullif(replace(s.status::text, '_', ' '), '')
        ) AS subtitle,
        ts_rank(
          to_tsvector(
            'english',
            coalesce(s.title, '') || ' ' || coalesce(immutable_enum_text(s.task_type), '')
          ),
          tsq.query
        ) AS rank,
        s.created_at
      FROM schedule_items s, tsq
      WHERE to_tsvector(
              'english',
              coalesce(s.title, '') || ' ' || coalesce(immutable_enum_text(s.task_type), '')
            ) @@ tsq.query
      ORDER BY rank DESC
      LIMIT 5
    )
  ) results
  ORDER BY rank DESC;
$$;

-- Supabase roles. The search function calls this via the service-role key, but
-- grant broadly so it is callable under RLS-aware roles too.
GRANT EXECUTE ON FUNCTION search_all(text) TO anon, authenticated, service_role;
