# ============================================
# Stage 1: Build Frontend (Angular)
# ============================================
FROM node:20-alpine AS frontend-build
WORKDIR /src/FritWeb

# Copiar package.json y package-lock.json
COPY FritWeb/package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente del frontend
COPY FritWeb .

# Compilar Angular para producción
RUN npm run build:prod

# ============================================
# Stage 2: Build Backend (.NET)
# ============================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src

# Copiar archivos del proyecto
COPY FritApi ./FritApi

# Copiar archivos comunes (si existen)
COPY . .

WORKDIR /src/FritApi

# Restaurar dependencias
RUN dotnet restore "FritApi.csproj"

# Publicar en modo Release
RUN dotnet publish "FritApi.csproj" -c Release -o /app/publish

# ============================================
# Stage 3: Copy Frontend build to Backend publish
# ============================================
FROM backend-build AS backend-with-frontend
RUN mkdir -p /app/publish/wwwroot
COPY --from=frontend-build /src/FritWeb/dist /app/publish/wwwroot

# ============================================
# Stage 4: Runtime (Final image)
# ============================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Copiar la carpeta publish con backend + frontend
COPY --from=backend-with-frontend /app/publish .

# Exponer puerto (Railway lo sobrescribe con env PORT)
EXPOSE 8080

# Ejecutar la aplicación
ENTRYPOINT ["dotnet", "FritApi.dll"]