FROM node:20-alpine

LABEL maintainer="Guelaguetza Connect <dev@guelaguetzaconnect.com>"
LABEL description="Guelaguetza Connect Backend API"

RUN apk add --no-cache \
    openssl \
    libc6-compat \
    wget \
    dumb-init \
    netcat-openbsd

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app
RUN chown nodejs:nodejs /app

COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nodejs

COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs prisma ./prisma/

RUN npm ci

COPY --chown=nodejs:nodejs . .

RUN npx prisma generate

RUN npx tsc || true
RUN npx tsc --outDir dist-seed --rootDir . --skipLibCheck --esModuleInterop --module NodeNext --moduleResolution NodeNext --target ES2022 --resolveJsonModule prisma/seed.ts 2>&1; \
    ls dist-seed/prisma/seed.js && echo "SEED OK" || echo "SEED MISSING"

RUN npm prune --omit=dev

EXPOSE 3001

ENV NODE_ENV=production \
    PORT=3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["/usr/local/bin/docker-entrypoint.sh"]
