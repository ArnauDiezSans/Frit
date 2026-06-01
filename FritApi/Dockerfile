# ============================================
# Stage 1: Build Frontend (Angular)
# ============================================
FROM node:20-alpine AS frontend-build
WORKDIR /src/FritWeb

# Copiar primero los archivos de dependencias
COPY FritWeb/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del frontend
COPY FritWeb/ ./

# Asegurar permisos de ejecución en binarios locales
RUN chmod -R +x node_modules/.bin

# Compilar Angular para producción sin depender del binario "ng"
RUN node ./node_modules/@angular/cli/bin/ng.js build --configuration production


# ============================================
# Stage 2: Build Backend (.NET)
# ============================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src

# Copiar todo el repositorio
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

# Angular moderno suele generar el build en dist/browser
COPY --from=frontend-build /src/FritWeb/dist/browser/ /app/publish/wwwroot/


# ============================================
# Stage 4: Runtime (Final image)
# ============================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Copiar backend + frontend ya publicados
COPY --from=backend-with-frontend /app/publish .

# Puerto por defecto
EXPOSE 8080

# Ejecutar la aplicación
ENTRYPOINT ["dotnet", "FritApi.dll"]