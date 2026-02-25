FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN VITE_VARIANT=full npm run build
RUN node scripts/build-server.mjs

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/index.mjs ./server/index.mjs
COPY --from=builder /app/server/rpc-gateway.mjs ./server/rpc-gateway.mjs
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server/index.mjs"]
