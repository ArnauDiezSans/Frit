BEGIN;

WITH updated AS (
  UPDATE "PartidaJugadores" pj
  SET "UsuarioId" = u."UsuarioId"
  FROM "Usuarios" u
  WHERE lower(pj."NombreMostrado") = lower(u."Nombre")
    AND (
      pj."UsuarioId" IS NULL
      OR pj."UsuarioId" <> u."UsuarioId"
    )
  RETURNING pj."PartidaJugadorId"
)
SELECT COUNT(*) AS linked_rows
FROM updated;

COMMIT;
