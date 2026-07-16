# Desplegament

## Variables obligatòries

- `DATABASE_URL`: connexió PostgreSQL.
- `GROUP_REGISTRATION_CODE`: codi privat de registre heretat per al tenant `frit14`.

Els tenants nous desen el hash del seu propi codi de registre a la base de dades.
El valor original de `frit14` continua a l'entorn per permetre una migració sense
canviar el codi existent.

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
han de tornar a iniciar sessió indicant el grup `frit14`.

## Crear un altre grup

Després d'aplicar les migracions, configura `DATABASE_URL` i executa:

```powershell
dotnet run --project tools/CreateTenant -- `
  --code segon-grup `
  --name "Segon grup" `
  --registration-code "CODI_PRIVAT" `
  --admin "NomAdmin" `
  --password "CONTRASENYA_ADMIN"
```

L'ordre crea el tenant i el seu primer administrador dins d'una única
transacció. El codi del tenant es normalitza a minúscules i el codi de registre
i la contrasenya es desen amb hash.
