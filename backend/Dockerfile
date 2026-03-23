# ─── Stage 1: Builder ─────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ─── Stage 2: Production ──────────────────────────────
FROM node:20-alpine

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S safelayers -u 1001

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=safelayers:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown safelayers:nodejs logs

USER safelayers

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', r => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "src/server.js"]
