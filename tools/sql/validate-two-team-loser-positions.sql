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
remaining AS (
  SELECT
    p."PartidaId",
    p."Fecha",
    j."Nombre" AS "Juego",
    counts.player_count,
    pj."PartidaJugadorId",
    pj."NombreMostrado",
    pj."Posicion",
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
  COUNT(DISTINCT "PartidaId") AS partidas_remaining,
  COUNT(*) AS rows_remaining
FROM remaining;

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
  string_agg(
    pj."NombreMostrado" || ' pos ' || pj."Posicion" || ' pts ' || COALESCE(pj."Puntos"::text, 'NULL'),
    ' | '
    ORDER BY pj."Posicion", pj."PartidaJugadorId"
  ) AS players
FROM "Partidas" p
JOIN team_games j
  ON j."JuegoId" = p."JuegoId"
JOIN player_counts counts
  ON counts."PartidaId" = p."PartidaId"
JOIN "PartidaJugadores" pj
  ON pj."PartidaId" = p."PartidaId"
GROUP BY
  p."PartidaId",
  p."Fecha",
  j."Nombre",
  counts.player_count
HAVING COUNT(*) FILTER (WHERE pj."Posicion" = 1) > 1
   AND COUNT(*) FILTER (WHERE pj."Posicion" = counts.player_count) > 1
ORDER BY
  p."Fecha",
  p."PartidaId";
