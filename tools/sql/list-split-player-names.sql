WITH split_names AS (
  SELECT
    trim(split.nom) AS "Nombre"
  FROM "PartidaJugadores" pj
  CROSS JOIN LATERAL regexp_split_to_table(pj."NombreMostrado", '\s*,\s*')
    WITH ORDINALITY AS split(nom, ord)
  WHERE pj."NombreMostrado" LIKE '%,%'
),
usage AS (
  SELECT
    "Nombre",
    COUNT(*) AS appearances
  FROM split_names
  GROUP BY "Nombre"
)
SELECT
  u."Nombre",
  u.appearances,
  usuarios."UsuarioId",
  usuarios."Nombre" AS "UsuarioCoincident"
FROM usage u
LEFT JOIN "Usuarios" usuarios
  ON lower(usuarios."Nombre") = lower(u."Nombre")
ORDER BY
  usuarios."UsuarioId" IS NULL DESC,
  u.appearances DESC,
  u."Nombre";
