#!/bin/sh
# ============================================
# Docker Entrypoint Script - Backend
# ============================================
# Este script se ejecuta al iniciar el contenedor
# Maneja migraciones, seed y health checks
# ============================================

set -e

echo "================================================"
echo "🚀 Guelaguetza Connect - Backend Starting..."
echo "================================================"

# Colores para logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# FUNCIÓN: Wait for database
# ============================================
wait_for_db() {
    echo "${YELLOW}⏳ Waiting for PostgreSQL...${NC}"
    MAX_RETRIES=30
    RETRY_COUNT=0
    
    while ! nc -z postgres 5432 > /dev/null 2>&1; do
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            echo "${RED}❌ Could not connect to database after $MAX_RETRIES attempts${NC}"
            exit 1
        fi
        echo "   Attempt $RETRY_COUNT/$MAX_RETRIES..."
        sleep 2
    done
    
    echo "${GREEN}✅ PostgreSQL is ready!${NC}"
}

# ============================================
# FUNCIÓN: Wait for Redis
# ============================================
wait_for_redis() {
    if [ -n "$REDIS_URL" ]; then
        echo "${YELLOW}⏳ Waiting for Redis...${NC}"
        MAX_RETRIES=30
        RETRY_COUNT=0
        
        while ! nc -z redis 6379 > /dev/null 2>&1; do
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
                echo "${YELLOW}⚠️  Could not connect to Redis, continuing anyway...${NC}"
                break
            fi
            echo "   Attempt $RETRY_COUNT/$MAX_RETRIES..."
            sleep 1
        done
        
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "${GREEN}✅ Redis is ready!${NC}"
        fi
    fi
}

# ============================================
# FUNCIÓN: Run migrations
# ============================================
run_migrations() {
    echo "${YELLOW}📦 Running database migrations...${NC}"
    
    if npx prisma migrate deploy; then
        echo "${GREEN}✅ Migrations completed successfully!${NC}"
    else
        echo "${RED}❌ Migration failed!${NC}"
        exit 1
    fi
}

# ============================================
# FUNCIÓN: Seed database (opcional)
# ============================================
seed_database() {
    echo "AUTO_SEED=$AUTO_SEED"
    echo "Checking if seed file exists..."
    ls -la dist-seed/prisma/seed.js 2>/dev/null || echo "dist-seed/prisma/seed.js NOT FOUND"

    if [ "$AUTO_SEED" = "true" ] || [ "$AUTO_SEED" = "auto" ]; then
        echo "🌱 Seeding database..."
        if [ -f "dist-seed/prisma/seed.js" ]; then
            echo "Running: node dist-seed/prisma/seed.js"
            if node dist-seed/prisma/seed.js 2>&1; then
                echo "✅ Database seeded successfully!"
            else
                echo "⚠️  Seed failed, continuing..."
            fi
        else
            echo "⚠️  Seed file not found at dist-seed/prisma/seed.js"
            echo "Contents of /app:"
            ls dist-seed/ 2>/dev/null || echo "dist-seed/ does not exist"
        fi
    else
        echo "Skipping seed (AUTO_SEED=$AUTO_SEED)"
    fi
}

# ============================================
# FUNCIÓN: Health check
# ============================================
health_check() {
    echo "${YELLOW}🏥 Running health check...${NC}"
    
    if [ ! -d "node_modules/.prisma/client" ]; then
        echo "${YELLOW}⚙️  Generating Prisma Client...${NC}"
        npx prisma generate
    fi
    
    echo "${GREEN}✅ Health check passed!${NC}"
}

# ============================================
# MAIN EXECUTION
# ============================================

wait_for_db
wait_for_redis

if [ ! -d "/app/public/uploads" ]; then
    echo "${YELLOW}📁 Creating uploads directory...${NC}"
    mkdir -p /app/public/uploads
    echo "${GREEN}✅ Uploads directory created!${NC}"
fi

run_migrations

seed_database

health_check

echo "================================================"
echo "${GREEN}✅ Initialization complete!${NC}"
echo "${GREEN}🚀 Starting Fastify server...${NC}"
echo "================================================"

exec node dist/index.js