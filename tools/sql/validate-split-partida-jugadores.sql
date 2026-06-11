SELECT
  COUNT(*) AS multipersona_rows_left
FROM "PartidaJugadores"
WHERE "NombreMostrado" LIKE '%,%';

SELECT
  COUNT(*) AS total_partida_jugadores
FROM "PartidaJugadores";

SELECT
  "NombreMostrado",
  "UsuarioId",
  COUNT(*) AS rows
FROM "PartidaJugadores"
WHERE "NombreMostrado" IN ('Laia B', 'Laia', 'Júlia', 'Júlia O')
GROUP BY "NombreMostrado", "UsuarioId"
ORDER BY "NombreMostrado", "UsuarioId";

SELECT
  COUNT(*) AS null_user_rows
FROM "PartidaJugadores"
WHERE "UsuarioId" IS NULL;
