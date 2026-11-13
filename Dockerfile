FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/dice/package.json packages/dice/
COPY packages/rules-core/package.json packages/rules-core/
COPY packages/rules-5e/package.json packages/rules-5e/
COPY packages/tabletop/package.json packages/tabletop/
COPY packages/shared/package.json packages/shared/
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci
COPY . .
ARG VITE_STUN_URLS=stun:stun.l.google.com:19302
ENV VITE_STUN_URLS=$VITE_STUN_URLS
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/dice/package.json packages/dice/
COPY packages/rules-core/package.json packages/rules-core/
COPY packages/rules-5e/package.json packages/rules-5e/
COPY packages/tabletop/package.json packages/tabletop/
COPY packages/shared/package.json packages/shared/
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --omit=dev -w api -w packages/shared -w packages/dice -w packages/rules-core -w packages/rules-5e -w packages/tabletop --include-workspace-root=false && npm cache clean --force
COPY --from=build /app/packages/dice/dist packages/dice/dist
COPY --from=build /app/packages/rules-core/dist packages/rules-core/dist
COPY --from=build /app/packages/rules-5e/dist packages/rules-5e/dist
COPY --from=build /app/packages/tabletop/dist packages/tabletop/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/api/dist api/dist
COPY --from=build /app/api/drizzle api/drizzle
COPY --from=build /app/api/srd api/srd
COPY --from=build /app/api/demo api/demo
COPY --from=build /app/web/dist web/dist
USER node
EXPOSE 3000
CMD ["node", "api/dist/main.js"]
