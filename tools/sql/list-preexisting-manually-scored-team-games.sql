WITH fixed_now("PartidaId") AS (
  VALUES
    (145),
    (213),
    (229),
    (230),
    (231),
    (250),
    (300),
    (666),
    (769),
    (875),
    (876),
    (928),
    (929),
    (966),
    (967),
    (1233),
    (1346),
    (1516),
    (1540),
    (1655),
    (1863)
),
summary AS (
  SELECT
    pj."PartidaId",
    COUNT(*) FILTER (WHERE pj."Posicion" = 1) AS pos1_count,
    COUNT(*) FILTER (WHERE pj."Posicion" = 2) AS pos2_count,
    COUNT(*) FILTER (
      WHERE pj."Posicion" IN (1, 2)
        AND pj."Puntos" IS NOT NULL
        AND pj."Puntos" <> 0
    ) AS nonzero_points,
    COUNT(*) FILTER (
      WHERE pj."Posicion" IN (1, 2)
        AND pj."Puntos" IS NULL
    ) AS null_points,
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
  summary.nonzero_points,
  summary.null_points,
  summary.players
FROM summary
JOIN "Partidas" p
  ON p."PartidaId" = summary."PartidaId"
JOIN "Juegos" j
  ON j."JuegoId" = p."JuegoId"
LEFT JOIN fixed_now f
  ON f."PartidaId" = p."PartidaId"
WHERE f."PartidaId" IS NULL
  AND summary.pos1_count > 1
  AND summary.pos2_count > 1
  AND summary.nonzero_points > 0
ORDER BY
  p."Fecha",
  p."PartidaId";
