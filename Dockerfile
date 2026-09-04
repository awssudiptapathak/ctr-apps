# CTR-CMS API server (Express + tsx) — multi-stage
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN npm ci --workspaces --include-workspace-root

FROM base AS runtime
COPY packages packages
COPY apps apps
WORKDIR /app/apps/server
ENV NODE_ENV=production
EXPOSE 4200
CMD ["npx", "tsx", "src/index.ts"]
