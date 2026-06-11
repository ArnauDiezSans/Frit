BEGIN;

WITH summary AS (
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
    ) AS null_points
  FROM "PartidaJugadores" pj
  GROUP BY pj."PartidaId"
),
candidates AS (
  SELECT "PartidaId"
  FROM summary
  WHERE pos1_count > 1
    AND pos2_count > 1
    AND nonzero_points = 0
    AND null_points > 0
),
updated AS (
  UPDATE "PartidaJugadores" pj
  SET "Puntos" = CASE
    WHEN pj."Posicion" = 1 THEN 1
    WHEN pj."Posicion" = 2 THEN 0
    ELSE pj."Puntos"
  END
  FROM candidates c
  WHERE pj."PartidaId" = c."PartidaId"
    AND pj."Posicion" IN (1, 2)
    AND pj."Puntos" IS NULL
  RETURNING
    pj."PartidaJugadorId",
    pj."PartidaId",
    pj."Posicion",
    pj."Puntos"
)
SELECT
  COUNT(DISTINCT "PartidaId") AS partidas_updated,
  COUNT(*) AS rows_updated,
  COUNT(*) FILTER (WHERE "Posicion" = 1 AND "Puntos" = 1) AS pos1_to_1,
  COUNT(*) FILTER (WHERE "Posicion" = 2 AND "Puntos" = 0) AS pos2_to_0
FROM updated;

COMMIT;
