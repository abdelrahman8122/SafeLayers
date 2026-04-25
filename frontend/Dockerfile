# ─── Stage 1: Build ───────────────────────────────────
FROM node:20-alpine AS builder

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Stage 2: Serve with nginx ────────────────────────
FROM nginx:alpine

# Security: remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf
RUN apk add --no-cache gettext
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

ENV PORT=80
ARG BACKEND_API_URL
ENV BACKEND_API_URL=$BACKEND_API_URL

HEALTHCHECK --interval=30s --timeout=5s \
  CMD sh -c 'wget -qO- "http://127.0.0.1:${PORT}/health" || exit 1'

CMD ["/bin/sh", "-c", "envsubst '$$BACKEND_API_URL $$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
