FROM node:20-bookworm-slim AS build-stage
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/api-contracts/package.json ./packages/api-contracts/
COPY apps/api/package.json ./apps/api/
RUN npm ci
COPY packages/api-contracts/ ./packages/api-contracts/
COPY apps/api/ ./apps/api/
RUN npm run build --workspace=@transcode-lab/api-contracts && npm run build --workspace=@transcode-lab/api
RUN npm prune --production

FROM node:20-bookworm-slim
WORKDIR /app
COPY --from=build-stage /app/node_modules ./node_modules
COPY --from=build-stage /app/packages/ ./packages/
COPY --from=build-stage /app/apps/api/ ./apps/api/
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
