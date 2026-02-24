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
COPY <<'EOF' /app/package.json
{
  "name": "fodi-eyes-italia-server",
  "private": true,
  "type": "module",
  "dependencies": {
    "hono": "^4.7.0",
    "@hono/node-server": "^1.14.0"
  }
}
EOF
RUN npm install --omit=dev
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "server/index.mjs"]
