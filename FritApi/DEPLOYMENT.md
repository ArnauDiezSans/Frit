# Desplegament

## Variables obligatòries

- `DATABASE_URL`: connexió PostgreSQL.
- `GROUP_REGISTRATION_CODE`: codi privat requerit per registrar usuaris.

El codi de registre només es valida al servidor i no es desa a la base de dades.

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
