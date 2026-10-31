FROM node:20-bookworm-slim AS build-stage
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/api-contracts/package.json ./packages/api-contracts/
COPY apps/web/package.json ./apps/web/
RUN npm ci
COPY packages/api-contracts/ ./packages/api-contracts/
COPY apps/web/ ./apps/web/
RUN npm run build --workspace=@transcode-lab/api-contracts && npm run build --workspace=@transcode-lab/web

FROM nginx:alpine
COPY --from=build-stage /app/apps/web/dist /usr/share/nginx/html
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
