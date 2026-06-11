WITH aliases AS (
  SELECT *
  FROM (VALUES
    ('Laia B', 'Laia', 'Laia'),
    ('Júlia', 'Júlia O', NULL)
  ) AS alias("OriginalName", "DisplayName", "UserLookupName")
),
multipersona AS (
  SELECT
    pj."PartidaJugadorId",
    pj."PartidaId",
    trim(split.nom) AS "OriginalName",
    COALESCE(a."DisplayName", trim(split.nom)) AS "DisplayName",
    COALESCE(a."UserLookupName", trim(split.nom)) AS "UserLookupName",
    pj."Posicion",
    pj."Puntos"
  FROM "PartidaJugadores" pj
  CROSS JOIN LATERAL regexp_split_to_table(pj."NombreMostrado", '\s*,\s*')
    WITH ORDINALITY AS split(nom, ord)
  LEFT JOIN aliases a
    ON lower(a."OriginalName") = lower(trim(split.nom))
  WHERE pj."NombreMostrado" LIKE '%,%'
),
resolved AS (
  SELECT
    m.*,
    u."UsuarioId"
  FROM multipersona m
  LEFT JOIN "Usuarios" u
    ON lower(u."Nombre") = lower(m."UserLookupName")
)
SELECT
  COUNT(DISTINCT "PartidaJugadorId") AS source_rows,
  COUNT(*) AS split_rows,
  COUNT(*) FILTER (WHERE "UsuarioId" IS NOT NULL) AS registered_rows,
  COUNT(*) FILTER (WHERE "UsuarioId" IS NULL) AS external_rows
FROM resolved;

WITH aliases AS (
  SELECT *
  FROM (VALUES
    ('Laia B', 'Laia', 'Laia'),
    ('Júlia', 'Júlia O', NULL)
  ) AS alias("OriginalName", "DisplayName", "UserLookupName")
),
multipersona AS (
  SELECT
    trim(split.nom) AS "OriginalName",
    COALESCE(a."DisplayName", trim(split.nom)) AS "DisplayName",
    COALESCE(a."UserLookupName", trim(split.nom)) AS "UserLookupName"
  FROM "PartidaJugadores" pj
  CROSS JOIN LATERAL regexp_split_to_table(pj."NombreMostrado", '\s*,\s*')
    WITH ORDINALITY AS split(nom, ord)
  LEFT JOIN aliases a
    ON lower(a."OriginalName") = lower(trim(split.nom))
  WHERE pj."NombreMostrado" LIKE '%,%'
)
SELECT
  "OriginalName",
  "DisplayName",
  COUNT(*) AS appearances,
  u."UsuarioId",
  u."Nombre" AS "UsuarioCoincident"
FROM multipersona m
LEFT JOIN "Usuarios" u
  ON lower(u."Nombre") = lower(m."UserLookupName")
GROUP BY
  "OriginalName",
  "DisplayName",
  u."UsuarioId",
  u."Nombre"
ORDER BY
  u."UsuarioId" IS NULL DESC,
  appearances DESC,
  "DisplayName";
