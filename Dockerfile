FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --omit=dev -w api -w packages/shared --include-workspace-root=false && npm cache clean --force
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/api/dist api/dist
COPY --from=build /app/api/drizzle api/drizzle
COPY --from=build /app/web/dist web/dist
USER node
EXPOSE 3000
CMD ["node", "api/dist/main.js"]
