# Base con el mismo npm que el entorno local (v11): npm ci exige lockfile
# sincronizado con el árbol ideal que calcula esa versión de npm.
FROM node:22-slim AS base
RUN npm install -g npm@11.19.0

# Etapa de compilación: instala dependencias reproducibles y verifica typecheck + emit.
FROM base AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
# Falla el build de la imagen si el proyecto no compila (typecheck estricto).
RUN npm run build
RUN npx tsc -p tsconfig.build.json

# Etapa de ejecución: el código usa imports relativos sin extensión (resueltos por
# tsx, igual que `npm run start` local); node ESM puro no los resuelve. La etapa de
# build ya validó typecheck + emit, así que aquí se ejecuta el mismo entrypoint local.
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force
COPY src ./src
RUN chown -R node:node /app
USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://localhost:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npx", "tsx", "src/application/server.ts"]
