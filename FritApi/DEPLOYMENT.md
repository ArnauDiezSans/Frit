# Desplegament

## Variables obligatòries

- `DATABASE_URL`: connexió PostgreSQL.

## Migracions

Les migracions no s'executen durant l'arrencada normal de l'API. Cal executar-les
com un pas previ i independent del desplegament:

```text
dotnet FritApi.dll --migrate
```

Railway ja rep aquesta ordre des del fitxer `railway.json` de l'arrel del
repositori. Un cop finalitzi correctament, l'aplicació s'inicia amb l'ordre
normal definida al Dockerfile:

```text
dotnet FritApi.dll
```

La primera migració multi-tenant crea `frit14` i assigna totes les dades
preexistents a aquest tenant. Les sessions creades abans d'aquesta migració
deixen de ser vàlides perquè no contenen el claim del tenant; els usuaris només
han de tornar a iniciar sessió amb el seu usuari i contrasenya habituals.

## Crear un altre grup

Un administrador autenticat pot crear el grup i el seu primer administrador amb:

```http
POST /api/tenants
Content-Type: application/json

{
  "codi": "segon-grup",
  "nom": "Segon grup",
  "adminNombre": "NomAdmin",
  "adminPassword": "CONTRASENYA_ADMIN"
}
```

També es manté l'eina de consola per a operacions administratives:

Després d'aplicar les migracions, configura `DATABASE_URL` i executa:

```powershell
dotnet run --project tools/CreateTenant -- `
  --code segon-grup `
  --name "Segon grup" `
  --admin "NomAdmin" `
  --password "CONTRASENYA_ADMIN"
```

L'ordre crea el tenant i el seu primer administrador dins d'una única
transacció. El codi del tenant es normalitza a minúscules i la contrasenya es
desa amb hash.
