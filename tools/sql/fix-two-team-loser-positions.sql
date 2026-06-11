BEGIN;

WITH team_games AS (
  SELECT "JuegoId"
  FROM "Juegos"
  WHERE lower(COALESCE("Tipo", '')) = lower('Equips')
    AND "Nombre" <> 'Samurai Sword'
),
player_counts AS (
  SELECT
    "PartidaId",
    COUNT(*) AS player_count
  FROM "PartidaJugadores"
  GROUP BY "PartidaId"
),
updated AS (
  UPDATE "PartidaJugadores" pj
  SET "Posicion" = counts.player_count
  FROM "Partidas" p
  JOIN team_games j
    ON j."JuegoId" = p."JuegoId"
  JOIN player_counts counts
    ON counts."PartidaId" = p."PartidaId"
  WHERE pj."PartidaId" = p."PartidaId"
    AND pj."Posicion" <> 1
    AND pj."Posicion" <> counts.player_count
  RETURNING
    pj."PartidaJugadorId",
    pj."PartidaId",
    pj."Posicion"
)
SELECT
  COUNT(DISTINCT "PartidaId") AS partidas_updated,
  COUNT(*) AS rows_updated
FROM updated;

COMMIT;
