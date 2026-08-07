# Backlog de millores

Document de seguiment per reprendre les millores tècniques pendents sense repetir
l'auditoria. L'ordre reflecteix risc i retorn aproximats, però cada bloc s'ha de
planificar i verificar per separat.

## Prioritat alta

### Actualitzar Angular

- Migrar Angular, Angular CLI i Angular ESLint des de la versió 19 fins a una
  versió suportada i sense les vulnerabilitats detectades per `npm audit`.
- Fer l'actualització versió major a versió major i revisar les guies oficials.
- Criteri d'acceptació: `npm audit --omit=dev`, lint, proves i build sense errors
  atribuïbles a les vulnerabilitats actuals.

### Completar l'accessibilitat dels modals

- Tancar amb `Escape`.
- Traslladar el focus al modal quan s'obre.
- Confinar el focus dins del modal.
- Retornar el focus a l'element que l'ha obert.
- Bloquejar el desplaçament del contingut de fons.
- Valorar Angular CDK Dialog per centralitzar aquest comportament.
- Criteri d'acceptació: tots els modals es poden operar només amb teclat i passen
  una revisió amb lector de pantalla.

### Afegir protecció CSRF explícita

- Incorporar antiforgery tokens als endpoints que modifiquen dades i a les
  peticions Angular corresponents.
- Mantenir les cookies `HttpOnly`, `Secure` i amb una política `SameSite`
  adequada.
- Criteri d'acceptació: peticions mutables sense token vàlid són rebutjades.

### Endurir el rate limiting

- Separar les polítiques de login i registre.
- Combinar límits per IP i nom d'usuari.
- Afegir bloqueig o retard progressiu i logging d'intents sospitosos.
- Configurar forwarded headers per obtenir la IP real darrere de Railway.
- Criteri d'acceptació: els límits funcionen amb la IP real i no bloquegen
  globalment usuaris legítims que comparteixen proxy.

## Arquitectura i mantenibilitat

### Dividir components Angular grans

Ordre suggerit:

1. Rankings.
2. Partides.
3. Assistències.
4. A què juguem.
5. Jocs.

Extreure filtres, formularis, taules, modals i càlculs en components o serveis
petits. Mantenir el comportament cobert per proves abans de cada extracció.

### Dividir `HallOfFameService`

- Separar medalles de partides, jocs, cinema/assistència i remades.
- Separar medalles manuals, rangs i construcció del Saló de la fama.
- Criteri d'acceptació: serveis amb una responsabilitat clara i resultats
  idèntics als actuals.

### Centralitzar autorització

- Substituir literals com `"Admin"` per constants i polítiques compartides.
- Crear un servei de permisos equivalent al frontend.
- Afegir una ordre o eina administrativa auditada per concedir i retirar rols.

### Unificar components visuals

- Crear components compartits per a modals, confirmacions, botons, camps,
  errors, taules, càrrega i estats buits.
- Substituir gradualment `window.confirm` per un diàleg accessible.

## Proves

### Proves d'integració HTTP

- Verificar respostes `401` sense sessió i `403` sense rol.
- Verificar login, logout, cookies i validació de sessió.
- Verificar rate limiting i registre amb codi correcte/incorrecte.
- Verificar que canviar el nom no altera els permisos.

### Ampliar proves Angular

- Guards i interceptor d'autenticació.
- Visibilitat de controls administratius.
- Remades, formularis de partides i jocs.
- Filtres de rankings i medalles.
- Canvis d'estat després de login i logout.

### Proves end-to-end

- Configurar Playwright.
- Cobrir registre/login, partida nova, perfil, contrasenya, permisos, remades,
  assistències i navegació mòbil.

### Cobertura i CI

- Generar cobertura frontend i backend.
- Introduir llindars mínims progressius.
- Executar lint, proves, build i auditoria de dependències a cada pull request.

## Rendiment i dades

### Portar càlculs a SQL

- Projectar només les columnes necessàries a rankings i medalles.
- Fer agregacions a PostgreSQL quan sigui viable.
- Mesurar temps, memòria i nombre de consultes amb dades reals.

### Afegir caché al backend

- Cachejar rankings i Saló de la fama.
- Invalidar després de canvis en partides, jocs, remades, cinema o assistències.

### Paginar llistes grans

- Partides, jocs i registres administratius.
- Traslladar filtres principals a query parameters del servidor.

### Revisar caché del frontend

- Auditar totes les invalidacions després de mutacions.
- Assegurar que les dades d'un usuari no persisteixen després de canviar de
  sessió.

### Integritat de la base de dades

- Afegir unicitat normalitzada als noms d'usuari.
- Afegir transaccions explícites a operacions complexes.
- Revisar índexs amb `EXPLAIN ANALYZE` sobre consultes reals.

## Desplegament i operació

### Backups i restauració

- Documentar còpies automàtiques de PostgreSQL, retenció i exportacions abans de
  migracions destructives.
- Fer i documentar una prova real de restauració.

### Entorn de staging

- Crear un entorn separat amb base de dades pròpia.
- Executar migracions i proves de fum abans de producció.

### Observabilitat

- Logging estructurat amb request ID, usuari, endpoint, durada i resultat.
- Alertes de disponibilitat, errors 5xx, latència, migracions i bloquejos de
  login.
- No registrar mai contrasenyes, cookies ni secrets.

### Health checks

- Separar liveness i readiness.
- Afegir comprovació de PostgreSQL al readiness check.

### Errors consistents

- Afegir middleware global d'excepcions.
- Retornar `ProblemDetails` de manera homogènia.

## Experiència d'usuari

- Unificar idioma i terminologia de la interfície.
- Millorar esquelets de càrrega i prevenir dobles enviaments.
- Adaptar les taules a mòbil amb targetes o columnes prioritzades.
- Revisar missatges d'error perquè indiquin una acció útil a l'usuari.

## Com reprendre aquest backlog

Per cada bloc:

1. Crear una branca o commit independent.
2. Afegir proves que fixin el comportament actual.
3. Implementar una millora acotada.
4. Executar lint, proves frontend/backend i build de producció.
5. Actualitzar aquest document eliminant o marcant la tasca completada.
