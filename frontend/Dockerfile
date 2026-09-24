# Etapa de compilación: instala dependencias reproducibles y genera dist/.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src
# La base del backend se fija en build-time (Vite inyecta VITE_* en el bundle).
# Desarrollo navegador -> backend: http://localhost:8080 (ver .env.example y
# backendSDD/Backend-Cors-Security.md; CORS permite http://localhost:5173).
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Falla el build de la imagen si el proyecto no compila (tsc estricto + vite).
RUN npm run build

# Etapa de ejecución: estáticos servidos por nginx. No hay llamadas
# servidor-a-servidor: el navegador contacta al backend directamente, por lo
# que no se usa el nombre de servicio Compose aquí.
FROM nginx:stable-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
