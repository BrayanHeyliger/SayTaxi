FROM node:22-bookworm-slim AS build

WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Conserva las dependencias y el código de Drizzle para ejecutar la migración
# como release command antes de activar una nueva versión.
COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts

EXPOSE 8080

CMD ["node", "dist/index.js"]
