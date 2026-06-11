BEGIN;

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
    pj."Posicion",
    pj."Puntos",
    trim(split.nom) AS "OriginalName",
    COALESCE(a."DisplayName", trim(split.nom)) AS "DisplayName",
    COALESCE(a."UserLookupName", trim(split.nom)) AS "UserLookupName",
    row_number() OVER (
      PARTITION BY pj."PartidaJugadorId"
      ORDER BY split.ord
    ) AS rn
  FROM "PartidaJugadores" pj
  CROSS JOIN LATERAL regexp_split_to_table(pj."NombreMostrado", '\s*,\s*')
    WITH ORDINALITY AS split(nom, ord)
  LEFT JOIN aliases a
    ON lower(a."OriginalName") = lower(trim(split.nom))
  WHERE pj."NombreMostrado" LIKE '%,%'
),
resolved AS (
  SELECT
    m."PartidaJugadorId",
    m."PartidaId",
    u."UsuarioId",
    m."DisplayName",
    m."Posicion",
    m."Puntos",
    m.rn
  FROM multipersona m
  LEFT JOIN "Usuarios" u
    ON lower(u."Nombre") = lower(m."UserLookupName")
),
updated_first AS (
  UPDATE "PartidaJugadores" pj
  SET
    "NombreMostrado" = r."DisplayName",
    "UsuarioId" = r."UsuarioId",
    "Posicion" = r."Posicion",
    "Puntos" = r."Puntos"
  FROM resolved r
  WHERE pj."PartidaJugadorId" = r."PartidaJugadorId"
    AND r.rn = 1
  RETURNING pj."PartidaJugadorId"
),
inserted_rest AS (
  INSERT INTO "PartidaJugadores"
    ("PartidaId", "UsuarioId", "NombreMostrado", "Posicion", "Puntos")
  SELECT
    r."PartidaId",
    r."UsuarioId",
    r."DisplayName",
    r."Posicion",
    r."Puntos"
  FROM resolved r
  WHERE r.rn > 1
  RETURNING "PartidaJugadorId"
)
SELECT
  (SELECT COUNT(*) FROM updated_first) AS updated_rows,
  (SELECT COUNT(*) FROM inserted_rest) AS inserted_rows;

COMMIT;
