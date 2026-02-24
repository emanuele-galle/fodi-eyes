FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/src/wordlists ./wordlists
COPY --from=builder /app/frontend ./frontend
RUN npm ci --omit=dev
RUN chown -R node:node /app
USER node
EXPOSE 3003
CMD ["node", "dist/index.js"]
