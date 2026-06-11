WITH partida_position_summary AS (
  SELECT
    pj."PartidaId",
    COUNT(*) FILTER (WHERE pj."Posicion" = 1) AS pos1_count,
    COUNT(*) FILTER (WHERE pj."Posicion" = 2) AS pos2_count,
    COUNT(*) FILTER (
      WHERE pj."Posicion" IN (1, 2)
        AND COALESCE(pj."Puntos", 0) <> 0
    ) AS nonzero_pos1_or_pos2_count,
    COUNT(*) FILTER (
      WHERE pj."Posicion" IN (1, 2)
        AND pj."Puntos" IS NULL
    ) AS null_pos1_or_pos2_count
  FROM "PartidaJugadores" pj
  GROUP BY pj."PartidaId"
),
candidates AS (
  SELECT
    summary."PartidaId"
  FROM partida_position_summary summary
  WHERE summary.pos1_count > 1
    AND summary.pos2_count > 1
    AND summary.nonzero_pos1_or_pos2_count = 0
    AND summary.null_pos1_or_pos2_count = 0
)
SELECT
  p."PartidaId",
  p."Fecha",
  j."JuegoId",
  j."Nombre" AS "Juego",
  pj."PartidaJugadorId",
  pj."NombreMostrado",
  pj."UsuarioId",
  pj."Posicion",
  pj."Puntos"
FROM candidates c
JOIN "Partidas" p
  ON p."PartidaId" = c."PartidaId"
JOIN "Juegos" j
  ON j."JuegoId" = p."JuegoId"
JOIN "PartidaJugadores" pj
  ON pj."PartidaId" = p."PartidaId"
WHERE pj."Posicion" IN (1, 2)
ORDER BY
  p."Fecha",
  p."PartidaId",
  pj."Posicion",
  pj."PartidaJugadorId";

WITH partida_position_summary AS (
  SELECT
    pj."PartidaId",
    COUNT(*) FILTER (WHERE pj."Posicion" = 1) AS pos1_count,
    COUNT(*) FILTER (WHERE pj."Posicion" = 2) AS pos2_count,
    COUNT(*) FILTER (
      WHERE pj."Posicion" IN (1, 2)
        AND COALESCE(pj."Puntos", 0) <> 0
    ) AS nonzero_pos1_or_pos2_count,
    COUNT(*) FILTER (
      WHERE pj."Posicion" IN (1, 2)
        AND pj."Puntos" IS NULL
    ) AS null_pos1_or_pos2_count
  FROM "PartidaJugadores" pj
  GROUP BY pj."PartidaId"
),
candidates AS (
  SELECT
    summary."PartidaId"
  FROM partida_position_summary summary
  WHERE summary.pos1_count > 1
    AND summary.pos2_count > 1
    AND summary.nonzero_pos1_or_pos2_count = 0
    AND summary.null_pos1_or_pos2_count = 0
)
SELECT
  j."Nombre" AS "Juego",
  COUNT(DISTINCT p."PartidaId") AS partidas,
  COUNT(*) FILTER (WHERE pj."Posicion" = 1) AS jugadores_pos1,
  COUNT(*) FILTER (WHERE pj."Posicion" = 2) AS jugadores_pos2
FROM candidates c
JOIN "Partidas" p
  ON p."PartidaId" = c."PartidaId"
JOIN "Juegos" j
  ON j."JuegoId" = p."JuegoId"
JOIN "PartidaJugadores" pj
  ON pj."PartidaId" = p."PartidaId"
WHERE pj."Posicion" IN (1, 2)
GROUP BY j."Nombre"
ORDER BY partidas DESC, j."Nombre";
