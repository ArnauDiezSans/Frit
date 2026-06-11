SELECT
  COUNT(*) AS multipersona_rows
FROM "PartidaJugadores"
WHERE "NombreMostrado" LIKE '%,%';

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'PartidaJugadores'
ORDER BY indexname;

WITH multipersona AS (
  SELECT
    pj."PartidaJugadorId",
    trim(split.nom) AS "Nombre"
  FROM "PartidaJugadores" pj
  CROSS JOIN LATERAL regexp_split_to_table(pj."NombreMostrado", '\s*,\s*')
    WITH ORDINALITY AS split(nom, ord)
  WHERE pj."NombreMostrado" LIKE '%,%'
)
SELECT
  COUNT(*) AS split_rows,
  COUNT(*) FILTER (WHERE u."UsuarioId" IS NOT NULL) AS registered_rows,
  COUNT(*) FILTER (WHERE u."UsuarioId" IS NULL) AS external_rows
FROM multipersona m
LEFT JOIN "Usuarios" u
  ON lower(u."Nombre") = lower(m."Nombre");

WITH multipersona AS (
  SELECT
    trim(split.nom) AS "Nombre"
  FROM "PartidaJugadores" pj
  CROSS JOIN LATERAL regexp_split_to_table(pj."NombreMostrado", '\s*,\s*')
    WITH ORDINALITY AS split(nom, ord)
  WHERE pj."NombreMostrado" LIKE '%,%'
)
SELECT
  m."Nombre",
  COUNT(*) AS appearances
FROM multipersona m
LEFT JOIN "Usuarios" u
  ON lower(u."Nombre") = lower(m."Nombre")
WHERE u."UsuarioId" IS NULL
GROUP BY m."Nombre"
ORDER BY appearances DESC, m."Nombre"
LIMIT 80;
