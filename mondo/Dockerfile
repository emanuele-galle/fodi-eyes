FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN VITE_VARIANT=full npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html/mondo
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
