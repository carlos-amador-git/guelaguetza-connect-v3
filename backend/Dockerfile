FROM node:20-alpine

LABEL maintainer="Guelaguetza Connect <dev@guelaguetzaconnect.com>"
LABEL description="Guelaguetza Connect Backend API"

WORKDIR /app

RUN apk add --no-cache \
    openssl \
    libc6-compat \
    wget \
    dumb-init

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build 2>&1 || (echo "=== BUILD ERRORS ===" && npx tsc --noEmit 2>&1 && exit 1)

RUN npm prune --production

COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

ENV NODE_ENV=production \
    PORT=3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["/usr/local/bin/docker-entrypoint.sh"]
