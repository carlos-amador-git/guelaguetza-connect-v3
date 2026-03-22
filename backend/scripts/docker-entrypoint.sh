#!/bin/bash
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
    
    until nc -z postgres 5432 > /dev/null 2>&1 || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "   Attempt $RETRY_COUNT/$MAX_RETRIES..."
        sleep 2
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "${RED}❌ Could not connect to database after $MAX_RETRIES attempts${NC}"
        exit 1
    fi
    
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
        
        until nc -z redis 6379 > /dev/null 2>&1 || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
            RETRY_COUNT=$((RETRY_COUNT + 1))
            echo "   Attempt $RETRY_COUNT/$MAX_RETRIES..."
            sleep 1
        done
        
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            echo "${YELLOW}⚠️  Could not connect to Redis, continuing anyway...${NC}"
        else
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
    if [ "$AUTO_SEED" = "true" ]; then
        echo "${YELLOW}🌱 Seeding database...${NC}"
        
        if npm run db:seed; then
            echo "${GREEN}✅ Database seeded successfully!${NC}"
        else
            echo "${YELLOW}⚠️  Seed failed or already exists, continuing...${NC}"
        fi
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

run_migrations

seed_database

health_check

echo "================================================"
echo "${GREEN}✅ Initialization complete!${NC}"
echo "${GREEN}🚀 Starting Fastify server...${NC}"
echo "================================================"

exec node dist/index.js