WITH summary AS (
  SELECT
    pj."PartidaId",
    COUNT(*) FILTER (WHERE pj."Posicion" = 1) AS pos1_count,
    COUNT(*) FILTER (WHERE pj."Posicion" = 2) AS pos2_count,
    COUNT(*) FILTER (WHERE pj."Posicion" IN (1, 2) AND pj."Puntos" = 0) AS zero_points,
    COUNT(*) FILTER (WHERE pj."Posicion" IN (1, 2) AND pj."Puntos" IS NULL) AS null_points,
    COUNT(*) FILTER (WHERE pj."Posicion" IN (1, 2) AND COALESCE(pj."Puntos", 0) <> 0) AS nonzero_points,
    string_agg(
      pj."NombreMostrado" || ' pos ' || pj."Posicion" || ' pts ' || COALESCE(pj."Puntos"::text, 'NULL'),
      ' | '
      ORDER BY pj."Posicion", pj."PartidaJugadorId"
    ) FILTER (WHERE pj."Posicion" IN (1, 2)) AS players
  FROM "PartidaJugadores" pj
  GROUP BY pj."PartidaId"
)
SELECT
  p."PartidaId",
  p."Fecha",
  j."Nombre" AS "Juego",
  summary.pos1_count,
  summary.pos2_count,
  summary.zero_points,
  summary.null_points,
  summary.nonzero_points,
  summary.players
FROM summary
JOIN "Partidas" p
  ON p."PartidaId" = summary."PartidaId"
JOIN "Juegos" j
  ON j."JuegoId" = p."JuegoId"
WHERE summary.pos1_count > 1
  AND summary.pos2_count > 1
ORDER BY
  summary.nonzero_points,
  summary.null_points,
  p."Fecha",
  p."PartidaId";
