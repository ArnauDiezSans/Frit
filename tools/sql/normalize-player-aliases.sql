BEGIN;

WITH laia AS (
  SELECT "UsuarioId"
  FROM "Usuarios"
  WHERE lower("Nombre") = lower('Laia')
  LIMIT 1
),
updated_laia AS (
  UPDATE "PartidaJugadores" pj
  SET
    "NombreMostrado" = 'Laia',
    "UsuarioId" = laia."UsuarioId"
  FROM laia
  WHERE pj."NombreMostrado" = 'Laia B'
  RETURNING pj."PartidaJugadorId"
),
updated_julia AS (
  UPDATE "PartidaJugadores" pj
  SET
    "NombreMostrado" = 'Júlia O',
    "UsuarioId" = NULL
  WHERE pj."NombreMostrado" = 'Júlia'
  RETURNING pj."PartidaJugadorId"
)
SELECT
  (SELECT COUNT(*) FROM updated_laia) AS laia_b_to_laia,
  (SELECT COUNT(*) FROM updated_julia) AS julia_to_julia_o;

COMMIT;
