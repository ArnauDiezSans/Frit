FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["FritApi.csproj", "./"]
RUN dotnet restore "FritApi.csproj"

COPY . .
RUN dotnet publish "FritApi.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "FritApi.dll"]