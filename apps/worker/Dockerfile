FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/crypto/package.json packages/crypto/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
RUN pnpm install --filter @afterimage/worker... --frozen-lockfile=false

FROM deps AS build
COPY packages/shared packages/shared
COPY packages/crypto packages/crypto
COPY apps/api/prisma apps/api/prisma
COPY apps/worker apps/worker
RUN pnpm --filter @afterimage/shared build \
 && pnpm --filter @afterimage/crypto build \
 && pnpm --filter @afterimage/api exec prisma generate \
 && pnpm --filter @afterimage/worker build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
