# ============================================
# Stage 1: Build Frontend (Angular)
# ============================================
FROM node:20-alpine AS frontend-build
WORKDIR /src/FritWeb

# Copiar primero dependencias
COPY FritWeb/package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el resto del frontend
COPY FritWeb/ ./

# Compilar Angular para producción
# El outputPath ya apunta a ../FritApi/wwwroot
RUN node ./node_modules/@angular/cli/bin/ng.js build --configuration production


# ============================================
# Stage 2: Build Backend (.NET)
# ============================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src

# Copiar todo el backend
COPY FritApi/ ./FritApi/

# Copiar el frontend ya compilado dentro de wwwroot del backend
COPY --from=frontend-build /src/FritApi/wwwroot/ /src/FritApi/wwwroot/

WORKDIR /src/FritApi

# Restaurar dependencias
RUN dotnet restore "FritApi.csproj"

# Publicar en modo Release
RUN dotnet publish "FritApi.csproj" -c Release -o /app/publish


# ============================================
# Stage 3: Runtime (Final image)
# ============================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=backend-build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "FritApi.dll"]