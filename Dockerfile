# RivalSKU production image
# Web app + optional in-process scanner (set SCAN_INTERVAL_MINUTES).
# Persist /app/data so SQLite survives deploys.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure public/ exists; git does not track empty directories.
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV DB_PATH=/app/data/rivalsku.db
# Enable 24/7 monitoring inside the web container (override or set to 0 to disable).
ENV SCAN_INTERVAL_MINUTES=30
ENV SCAN_CONCURRENCY=2
ENV SCAN_DELAY_MS=500

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates wget \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/data \
  && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/scripts/start-with-scanner.sh ./scripts/start-with-scanner.sh

RUN chmod +x /app/scripts/start-with-scanner.sh \
  && chown -R nextjs:nodejs /app/data

USER nextjs
# Render injects $PORT at runtime (often 10000). Default 3000 is for local/Fly.
EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD sh -c 'wget -qO- http://127.0.0.1:${PORT:-3000}/api/health || exit 1'

CMD ["./scripts/start-with-scanner.sh"]
