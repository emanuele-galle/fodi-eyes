FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
RUN mkdir -p /app/server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
# Install only server dependencies
RUN npm init -y && npm install hono @hono/node-server
EXPOSE 3000
CMD ["node", "server/index.mjs"]
