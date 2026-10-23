# Build the static bundle with Node, then serve it with nginx.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.29-alpine
# Files in /etc/nginx/templates are rendered with envsubst at startup.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# Where nginx forwards /api requests (the backend service in docker-compose).
ENV API_UPSTREAM=http://backend:8080
EXPOSE 80
