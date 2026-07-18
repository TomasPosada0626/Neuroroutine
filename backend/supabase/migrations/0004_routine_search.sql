-- Full-text search support for routine titles.
-- Adds a GIN index and an RPC function scoped to the authenticated user.

CREATE INDEX IF NOT EXISTS routines_title_fts_idx
  ON public.routines
  USING GIN (to_tsvector('spanish', COALESCE(title, '')));

CREATE OR REPLACE FUNCTION public.search_routines(
  p_query text,
  p_limit integer DEFAULT 50
)
RETURNS SETOF public.routines
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT r.*
  FROM public.routines r
  WHERE r.user_id = auth.uid()
    AND (
      p_query IS NULL
      OR btrim(p_query) = ''
      OR to_tsvector('spanish', COALESCE(r.title, '')) @@ websearch_to_tsquery('spanish', p_query)
    )
  ORDER BY r.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
$$;

GRANT EXECUTE ON FUNCTION public.search_routines(text, integer) TO authenticated;
