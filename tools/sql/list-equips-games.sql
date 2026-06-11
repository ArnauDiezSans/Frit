SELECT
  "JuegoId",
  "Nombre",
  "Tipo"
FROM "Juegos"
WHERE lower(COALESCE("Tipo", '')) = lower('Equips')
ORDER BY "Nombre";
