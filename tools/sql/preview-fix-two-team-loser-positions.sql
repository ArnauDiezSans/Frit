WITH team_games AS (
  SELECT "JuegoId", "Nombre"
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
candidates AS (
  SELECT
    p."PartidaId",
    p."Fecha",
    j."Nombre" AS "Juego",
    counts.player_count,
    pj."PartidaJugadorId",
    pj."NombreMostrado",
    pj."Posicion" AS current_position,
    counts.player_count AS next_position,
    pj."Puntos"
  FROM "Partidas" p
  JOIN team_games j
    ON j."JuegoId" = p."JuegoId"
  JOIN player_counts counts
    ON counts."PartidaId" = p."PartidaId"
  JOIN "PartidaJugadores" pj
    ON pj."PartidaId" = p."PartidaId"
  WHERE pj."Posicion" <> 1
    AND pj."Posicion" <> counts.player_count
)
SELECT
  COUNT(DISTINCT "PartidaId") AS partidas_to_update,
  COUNT(*) AS rows_to_update
FROM candidates;

WITH team_games AS (
  SELECT "JuegoId", "Nombre"
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
candidates AS (
  SELECT
    p."PartidaId",
    p."Fecha",
    j."Nombre" AS "Juego",
    counts.player_count,
    pj."PartidaJugadorId",
    pj."NombreMostrado",
    pj."Posicion" AS current_position,
    counts.player_count AS next_position,
    pj."Puntos"
  FROM "Partidas" p
  JOIN team_games j
    ON j."JuegoId" = p."JuegoId"
  JOIN player_counts counts
    ON counts."PartidaId" = p."PartidaId"
  JOIN "PartidaJugadores" pj
    ON pj."PartidaId" = p."PartidaId"
  WHERE pj."Posicion" <> 1
    AND pj."Posicion" <> counts.player_count
)
SELECT
  "Juego",
  COUNT(DISTINCT "PartidaId") AS partidas,
  COUNT(*) AS rows
FROM candidates
GROUP BY "Juego"
ORDER BY "Juego";

WITH team_games AS (
  SELECT "JuegoId", "Nombre"
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
)
SELECT
  p."PartidaId",
  p."Fecha",
  j."Nombre" AS "Juego",
  counts.player_count,
  pj."PartidaJugadorId",
  pj."NombreMostrado",
  pj."Posicion" AS current_position,
  counts.player_count AS next_position,
  pj."Puntos"
FROM "Partidas" p
JOIN team_games j
  ON j."JuegoId" = p."JuegoId"
JOIN player_counts counts
  ON counts."PartidaId" = p."PartidaId"
JOIN "PartidaJugadores" pj
  ON pj."PartidaId" = p."PartidaId"
WHERE pj."Posicion" <> 1
  AND pj."Posicion" <> counts.player_count
ORDER BY
  p."Fecha",
  p."PartidaId",
  pj."PartidaJugadorId"
LIMIT 120;
