-- ============================================================================
-- MÓDULO AR - GUELAGUETZA
-- Base de Datos PostgreSQL + PostGIS
-- ============================================================================
-- Versión: 1.0
-- Fecha: Enero 2026
-- Autor: Desarrollo AR Guelaguetza
-- 
-- INSTRUCCIONES DE EJECUCIÓN:
-- 1. Asegúrate de tener PostgreSQL 14+ con PostGIS instalado
-- 2. Crea la base de datos si no existe: CREATE DATABASE guelaguetza_db;
-- 3. Conéctate a la BD: \c guelaguetza_db
-- 4. Ejecuta este script: \i ar_migration.sql
-- ============================================================================

-- ============================================================================
-- PARTE 1: CONFIGURACIÓN INICIAL
-- ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear schema dedicado para el módulo AR
DROP SCHEMA IF EXISTS ar CASCADE;
CREATE SCHEMA ar;

-- Establecer search_path para este script
SET search_path TO ar, public;

-- ============================================================================
-- PARTE 2: TIPOS ENUMERADOS (ENUMS)
-- ============================================================================

-- Tipos de puntos AR
CREATE TYPE ar.point_type AS ENUM (
    'character',      -- Personaje regional (Tiliche) - coleccionable
    'monument',       -- Monumento/edificio con overlay AR
    'quest_item',     -- Item de búsqueda (ej: lirios de Donají)
    'info',           -- Punto informativo - no coleccionable
    'easter_egg',     -- Sorpresa escondida - bonus
    'event'           -- Temporal (solo durante evento)
);

-- Tipos de assets
CREATE TYPE ar.asset_type AS ENUM (
    'model_3d',       -- Modelo tridimensional (.glb, .usdz)
    'audio',          -- Audio narración/música
    'image',          -- Imagen/textura
    'video',          -- Video overlay
    'animation'       -- Animación Lottie o similar
);

-- Tipos de vestimenta
CREATE TYPE ar.vestimenta_categoria AS ENUM (
    'traje_completo', -- Conjunto completo
    'cabeza',         -- Tocados, resplandores, penachos
    'torso',          -- Huipiles, blusas
    'falda',          -- Enaguas, faldas
    'accesorio',      -- Joyería, rebozos
    'calzado',        -- Huaraches, zapatos
    'mano'            -- Elementos sostenidos (macana, piña)
);

-- Tipos de tracking AR requerido
CREATE TYPE ar.tracking_type AS ENUM (
    'head',           -- Seguimiento de cabeza
    'face',           -- Seguimiento facial
    'upper_body',     -- Torso superior
    'full_body',      -- Cuerpo completo
    'hand',           -- Seguimiento de manos
    'ground',         -- Anclaje al suelo
    'vertical'        -- Anclaje a pared/fachada
);

-- Tipos de logros
CREATE TYPE ar.achievement_type AS ENUM (
    'collect_count',    -- Recolectar N items
    'collect_all',      -- Recolectar todos
    'collect_region',   -- Completar una región
    'complete_quest',   -- Completar búsqueda
    'first_action',     -- Primera vez haciendo algo
    'time_based',       -- Basado en tiempo
    'creation'          -- Crear algo (alebrije)
);

-- ============================================================================
-- PARTE 3: TABLAS DE CATÁLOGO (DATOS MAESTROS)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: regiones
-- Las 8 regiones culturales de Oaxaca
-- -----------------------------------------------------------------------------
CREATE TABLE ar.regiones (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    nombre_corto VARCHAR(50),
    descripcion TEXT,
    datos_culturales JSONB DEFAULT '{}',
    
    -- Colores de la región
    color_primario VARCHAR(7) NOT NULL,
    color_secundario VARCHAR(7),
    
    -- Assets visuales
    imagen_url VARCHAR(500),
    escudo_url VARCHAR(500),
    icono_url VARCHAR(500),
    
    -- Ubicación geográfica
    centroide GEOGRAPHY(POINT, 4326),
    bounding_box GEOGRAPHY(POLYGON, 4326),
    
    -- Control
    orden_display INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_regiones_codigo ON ar.regiones(codigo);
CREATE INDEX idx_regiones_active ON ar.regiones(active);

COMMENT ON TABLE ar.regiones IS 'Las 8 regiones culturales de Oaxaca';

-- -----------------------------------------------------------------------------
-- Tabla: assets
-- Todos los recursos digitales (modelos 3D, audios, imágenes)
-- -----------------------------------------------------------------------------
CREATE TABLE ar.assets (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    codigo VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo ar.asset_type NOT NULL,
    
    -- URLs por formato/plataforma
    url_glb VARCHAR(500),           -- Android/Web
    url_usdz VARCHAR(500),          -- iOS AR Quick Look
    url_thumbnail VARCHAR(500),
    url_preview VARCHAR(500),        -- GIF o video corto
    url_original VARCHAR(500),       -- Archivo fuente
    
    -- Metadata técnica
    size_bytes_glb INTEGER,
    size_bytes_usdz INTEGER,
    polycount INTEGER,               -- Número de polígonos
    texture_resolution VARCHAR(20),  -- ej: "2048x2048"
    duration_seconds FLOAT,          -- Para audio/video
    
    -- Atributos para IA (prompts usados)
    ai_prompt TEXT,                  -- Prompt usado en Meshy/Tripo
    ai_model VARCHAR(50),            -- "meshy-4", "tripo", etc.
    
    -- Versionado y validación
    version INTEGER DEFAULT 1,
    checksum_glb VARCHAR(64),
    checksum_usdz VARCHAR(64),
    
    -- Categorización
    tags TEXT[],
    categoria VARCHAR(100),
    
    -- Control
    is_essential BOOLEAN DEFAULT false,  -- Incluir en pack offline
    is_premium BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assets_tipo ON ar.assets(tipo);
CREATE INDEX idx_assets_codigo ON ar.assets(codigo);
CREATE INDEX idx_assets_essential ON ar.assets(is_essential) WHERE is_essential = true;
CREATE INDEX idx_assets_tags ON ar.assets USING GIN(tags);

COMMENT ON TABLE ar.assets IS 'Recursos digitales: modelos 3D, audios, imágenes para AR';

-- -----------------------------------------------------------------------------
-- Tabla: quests (Búsquedas/Misiones)
-- Define misiones como "La Búsqueda de Donají"
-- -----------------------------------------------------------------------------
CREATE TABLE ar.quests (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    narrativa TEXT,                  -- Historia de la misión
    
    -- Configuración
    total_items INTEGER NOT NULL,    -- Cuántos items debe encontrar
    orden_requerido BOOLEAN DEFAULT false,  -- ¿Deben encontrarse en orden?
    tiempo_limite_minutos INTEGER,   -- NULL = sin límite
    
    -- Recompensa
    reward_points INTEGER DEFAULT 100,
    reward_asset_id INTEGER REFERENCES ar.assets(id),
    reward_description TEXT,
    
    -- Fechas de disponibilidad
    fecha_inicio DATE,
    fecha_fin DATE,
    
    -- Assets
    icono_url VARCHAR(500),
    imagen_portada_url VARCHAR(500),
    
    -- Control
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE ar.quests IS 'Misiones y búsquedas del tesoro como la de Donají';

-- ============================================================================
-- PARTE 4: TABLAS DE CONTENIDO AR
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: points
-- Puntos AR geolocalizados (el corazón del sistema)
-- -----------------------------------------------------------------------------
CREATE TABLE ar.points (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    codigo VARCHAR(100) UNIQUE NOT NULL,
    
    -- Información básica
    nombre VARCHAR(255) NOT NULL,
    nombre_corto VARCHAR(100),
    descripcion TEXT,
    narrativa TEXT,                  -- Historia/guión para este punto
    datos_historicos JSONB DEFAULT '{}',
    
    -- Clasificación
    tipo ar.point_type NOT NULL,
    region_id INTEGER REFERENCES ar.regiones(id),
    quest_id INTEGER REFERENCES ar.quests(id),  -- Si es parte de una búsqueda
    quest_orden INTEGER,                         -- Orden dentro de la búsqueda
    
    -- Geolocalización (PostGIS)
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    altitude_meters FLOAT,
    
    -- Configuración de activación
    activation_radius_meters INTEGER DEFAULT 50,
    tracking_type ar.tracking_type DEFAULT 'ground',
    vps_anchor_id VARCHAR(255),      -- ID de ancla VPS de Google/8th Wall
    
    -- Assets asociados
    asset_principal_id INTEGER REFERENCES ar.assets(id),
    asset_audio_id INTEGER REFERENCES ar.assets(id),
    thumbnail_url VARCHAR(500),
    
    -- Interacciones disponibles
    interacciones JSONB DEFAULT '[]',  -- Lista de acciones posibles
    
    -- Gamificación
    is_collectible BOOLEAN DEFAULT true,
    points_value INTEGER DEFAULT 10,
    
    -- Visualización
    color VARCHAR(7),
    emoji VARCHAR(10),
    
    -- Disponibilidad temporal
    fecha_inicio DATE,
    fecha_fin DATE,
    horario_inicio TIME,             -- Hora de disponibilidad
    horario_fin TIME,
    
    -- Control
    active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    orden_display INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para points
CREATE INDEX idx_points_location ON ar.points USING GIST(location);
CREATE INDEX idx_points_region ON ar.points(region_id);
CREATE INDEX idx_points_tipo ON ar.points(tipo);
CREATE INDEX idx_points_quest ON ar.points(quest_id);
CREATE INDEX idx_points_active ON ar.points(active);
CREATE INDEX idx_points_collectible ON ar.points(is_collectible) WHERE is_collectible = true;

COMMENT ON TABLE ar.points IS 'Puntos AR geolocalizados - monumentos, personajes, items de búsqueda';

-- -----------------------------------------------------------------------------
-- Tabla: vestimentas
-- Catálogo de indumentaria tradicional para Try-On
-- -----------------------------------------------------------------------------
CREATE TABLE ar.vestimentas (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    codigo VARCHAR(100) UNIQUE NOT NULL,
    
    -- Información básica
    nombre VARCHAR(255) NOT NULL,
    nombre_tradicional VARCHAR(255),  -- Nombre en lengua originaria
    descripcion TEXT,
    datos_culturales TEXT,            -- Significado, historia
    
    -- Clasificación
    region_id INTEGER REFERENCES ar.regiones(id),
    categoria ar.vestimenta_categoria NOT NULL,
    genero VARCHAR(20) DEFAULT 'unisex',  -- 'masculino', 'femenino', 'unisex'
    
    -- Assets 3D
    asset_id INTEGER REFERENCES ar.assets(id),
    thumbnail_url VARCHAR(500),
    preview_gif_url VARCHAR(500),
    
    -- Configuración de Try-On
    tracking_type ar.tracking_type NOT NULL,
    offset_position JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}',
    offset_rotation JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}',
    offset_scale JSONB DEFAULT '{"x": 1, "y": 1, "z": 1}',
    
    -- Física de tela
    tiene_fisica_tela BOOLEAN DEFAULT false,
    rigidez FLOAT DEFAULT 0.5,       -- 0 = muy suave, 1 = rígido
    
    -- Reto técnico (para documentación)
    notas_tecnicas TEXT,
    
    -- Conexión con artesanos
    artesano_nombre VARCHAR(255),
    artesano_comunidad VARCHAR(255),
    artesano_url VARCHAR(500),
    precio_aproximado DECIMAL(10,2),
    
    -- Control
    es_set_completo BOOLEAN DEFAULT false,  -- Si es un conjunto
    set_items INTEGER[],                     -- IDs de items del set
    active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    orden_display INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vestimentas_region ON ar.vestimentas(region_id);
CREATE INDEX idx_vestimentas_categoria ON ar.vestimentas(categoria);
CREATE INDEX idx_vestimentas_active ON ar.vestimentas(active);

COMMENT ON TABLE ar.vestimentas IS 'Catálogo de indumentaria tradicional para Virtual Try-On';

-- -----------------------------------------------------------------------------
-- Tabla: artesanias
-- Catálogo de artesanías para Image-to-3D
-- -----------------------------------------------------------------------------
CREATE TABLE ar.artesanias (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(100) UNIQUE NOT NULL,
    
    -- Información básica
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    region_id INTEGER REFERENCES ar.regiones(id),
    comunidad_origen VARCHAR(255),
    
    -- Assets
    asset_id INTEGER REFERENCES ar.assets(id),
    imagen_original_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    
    -- Datos para generación IA
    ai_prompt TEXT,                  -- Prompt optimizado para Meshy/Tripo
    ai_style VARCHAR(50),            -- 'realistic', 'cartoon', 'stylized'
    
    -- Uso en la app
    uso_en_app TEXT,                 -- "Mascota guía", "Elemento decorativo"
    
    -- Artesano
    artesano_nombre VARCHAR(255),
    artesano_url VARCHAR(500),
    
    -- Control
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_artesanias_region ON ar.artesanias(region_id);

COMMENT ON TABLE ar.artesanias IS 'Catálogo de artesanías para digitalización Image-to-3D';

-- -----------------------------------------------------------------------------
-- Tabla: achievements (Logros)
-- Definición de logros disponibles
-- -----------------------------------------------------------------------------
CREATE TABLE ar.achievements (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    
    -- Tipo y requisitos
    tipo ar.achievement_type NOT NULL,
    requisitos JSONB NOT NULL,       -- Configuración específica por tipo
    
    -- Recompensas
    points_reward INTEGER DEFAULT 0,
    badge_url VARCHAR(500),
    reward_asset_id INTEGER REFERENCES ar.assets(id),
    
    -- Categoría
    categoria VARCHAR(50),           -- 'coleccion', 'exploracion', 'creacion'
    dificultad VARCHAR(20) DEFAULT 'normal',  -- 'facil', 'normal', 'dificil'
    
    -- Control
    orden_display INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE ar.achievements IS 'Definición de logros y medallas del sistema de gamificación';

-- ============================================================================
-- PARTE 5: TABLAS DE USUARIO
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: user_profiles (Opcional - datos adicionales de usuario)
-- -----------------------------------------------------------------------------
CREATE TABLE ar.user_profiles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) UNIQUE NOT NULL,  -- ID del sistema de auth externo
    
    -- Datos de perfil AR
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    
    -- Preferencias
    preferencias JSONB DEFAULT '{}',
    idioma VARCHAR(5) DEFAULT 'es',
    
    -- Estadísticas agregadas
    total_points INTEGER DEFAULT 0,
    total_collected INTEGER DEFAULT 0,
    total_achievements INTEGER DEFAULT 0,
    
    -- Control
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_user_profiles_user_id ON ar.user_profiles(user_id);

COMMENT ON TABLE ar.user_profiles IS 'Perfiles de usuario con estadísticas AR agregadas';

-- -----------------------------------------------------------------------------
-- Tabla: user_collections (Puntos recolectados)
-- -----------------------------------------------------------------------------
CREATE TABLE ar.user_collections (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    point_id INTEGER NOT NULL REFERENCES ar.points(id),
    
    -- Datos de la recolección
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location_collected GEOGRAPHY(POINT, 4326),
    screenshot_url VARCHAR(500),
    
    -- Metadata
    device_info JSONB DEFAULT '{}',
    
    UNIQUE(user_id, point_id)
);

CREATE INDEX idx_user_collections_user ON ar.user_collections(user_id);
CREATE INDEX idx_user_collections_point ON ar.user_collections(point_id);
CREATE INDEX idx_user_collections_date ON ar.user_collections(collected_at DESC);

COMMENT ON TABLE ar.user_collections IS 'Registro de puntos AR recolectados por usuario';

-- -----------------------------------------------------------------------------
-- Tabla: user_quest_progress (Progreso en búsquedas)
-- -----------------------------------------------------------------------------
CREATE TABLE ar.user_quest_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    quest_id INTEGER NOT NULL REFERENCES ar.quests(id),
    
    -- Progreso
    items_collected INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Items específicos encontrados
    items_found INTEGER[] DEFAULT '{}',
    
    UNIQUE(user_id, quest_id)
);

CREATE INDEX idx_user_quest_progress_user ON ar.user_quest_progress(user_id);

COMMENT ON TABLE ar.user_quest_progress IS 'Progreso de usuarios en las búsquedas/misiones';

-- -----------------------------------------------------------------------------
-- Tabla: user_achievements (Logros desbloqueados)
-- -----------------------------------------------------------------------------
CREATE TABLE ar.user_achievements (
    user_id VARCHAR(100) NOT NULL,
    achievement_id INTEGER NOT NULL REFERENCES ar.achievements(id),
    
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified BOOLEAN DEFAULT false,
    
    PRIMARY KEY(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON ar.user_achievements(user_id);

COMMENT ON TABLE ar.user_achievements IS 'Logros desbloqueados por cada usuario';

-- -----------------------------------------------------------------------------
-- Tabla: user_favorites (Vestimentas favoritas)
-- -----------------------------------------------------------------------------
CREATE TABLE ar.user_favorites (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    vestimenta_id INTEGER NOT NULL REFERENCES ar.vestimentas(id),
    
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    screenshot_url VARCHAR(500),
    
    UNIQUE(user_id, vestimenta_id)
);

CREATE INDEX idx_user_favorites_user ON ar.user_favorites(user_id);

COMMENT ON TABLE ar.user_favorites IS 'Vestimentas guardadas como favoritas';

-- -----------------------------------------------------------------------------
-- Tabla: user_creations (Alebrijes creados)
-- -----------------------------------------------------------------------------
CREATE TABLE ar.user_creations (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    user_id VARCHAR(100),
    
    -- Imagen original
    imagen_original_url VARCHAR(500),
    imagen_original_base64 TEXT,      -- Alternativa si no hay storage
    
    -- Modelo generado
    model_url_glb VARCHAR(500),
    model_url_usdz VARCHAR(500),
    thumbnail_url VARCHAR(500),
    
    -- Datos de generación
    ai_service VARCHAR(50),           -- 'meshy', 'tripo', etc.
    ai_task_id VARCHAR(100),
    generation_time_seconds INTEGER,
    
    -- Metadata
    nombre_creacion VARCHAR(100),
    es_publico BOOLEAN DEFAULT false,
    
    -- Control
    status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, completed, failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_user_creations_user ON ar.user_creations(user_id);
CREATE INDEX idx_user_creations_status ON ar.user_creations(status);
CREATE INDEX idx_user_creations_public ON ar.user_creations(es_publico) WHERE es_publico = true;

COMMENT ON TABLE ar.user_creations IS 'Alebrijes y creaciones generadas por usuarios via Image-to-3D';

-- ============================================================================
-- PARTE 6: TABLAS OPERACIONALES
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: offline_bundles (Paquetes de descarga)
-- -----------------------------------------------------------------------------
CREATE TABLE ar.offline_bundles (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    
    -- Configuración
    size_mb_estimated FLOAT,
    version INTEGER DEFAULT 1,
    
    -- Control
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Tabla: bundle_assets (Assets por bundle)
-- -----------------------------------------------------------------------------
CREATE TABLE ar.bundle_assets (
    bundle_id INTEGER NOT NULL REFERENCES ar.offline_bundles(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES ar.assets(id),
    
    orden INTEGER DEFAULT 0,
    es_obligatorio BOOLEAN DEFAULT true,
    
    PRIMARY KEY(bundle_id, asset_id)
);

-- -----------------------------------------------------------------------------
-- Tabla: wifi_zones (Zonas de descarga segura)
-- -----------------------------------------------------------------------------
CREATE TABLE ar.wifi_zones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50),                 -- 'publico', 'comercial', 'cultural'
    
    -- Ubicación
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    direccion TEXT,
    
    -- Metadata
    horario TEXT,
    velocidad_estimada VARCHAR(50),   -- 'alta', 'media', 'baja'
    requiere_password BOOLEAN DEFAULT false,
    
    -- Control
    verificado BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wifi_zones_location ON ar.wifi_zones USING GIST(location);

COMMENT ON TABLE ar.wifi_zones IS 'Zonas con Wi-Fi para descarga de contenido antes del evento';

-- -----------------------------------------------------------------------------
-- Tabla: analytics_events (Tracking de uso - opcional)
-- -----------------------------------------------------------------------------
CREATE TABLE ar.analytics_events (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100),
    session_id VARCHAR(100),
    
    -- Evento
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    
    -- Contexto
    point_id INTEGER REFERENCES ar.points(id),
    vestimenta_id INTEGER REFERENCES ar.vestimentas(id),
    
    -- Ubicación
    location GEOGRAPHY(POINT, 4326),
    
    -- Dispositivo
    device_info JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_user ON ar.analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON ar.analytics_events(event_type);
CREATE INDEX idx_analytics_events_date ON ar.analytics_events(created_at DESC);

-- Particionar por mes si hay mucho volumen (opcional)
-- CREATE INDEX idx_analytics_events_month ON ar.analytics_events(date_trunc('month', created_at));

COMMENT ON TABLE ar.analytics_events IS 'Eventos de uso para analytics (tiempo de visualización, interacciones, etc.)';

-- ============================================================================
-- PARTE 7: VISTAS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Vista: Puntos con información completa
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW ar.v_points_completos AS
SELECT 
    p.id,
    p.uuid,
    p.codigo,
    p.nombre,
    p.descripcion,
    p.narrativa,
    p.tipo,
    p.is_collectible,
    p.points_value,
    p.activation_radius_meters,
    p.tracking_type,
    p.color,
    p.emoji,
    p.active,
    -- Región
    r.id AS region_id,
    r.codigo AS region_codigo,
    r.nombre AS region_nombre,
    r.color_primario AS region_color,
    -- Quest
    q.id AS quest_id,
    q.nombre AS quest_nombre,
    p.quest_orden,
    -- Asset principal
    a.url_glb AS model_url,
    a.url_usdz AS model_url_ios,
    a.url_thumbnail AS thumbnail_url,
    -- Audio
    audio.url_glb AS audio_url,
    -- Coordenadas para frontend
    ST_Y(p.location::geometry) AS lat,
    ST_X(p.location::geometry) AS lng
FROM ar.points p
LEFT JOIN ar.regiones r ON p.region_id = r.id
LEFT JOIN ar.quests q ON p.quest_id = q.id
LEFT JOIN ar.assets a ON p.asset_principal_id = a.id
LEFT JOIN ar.assets audio ON p.asset_audio_id = audio.id;

COMMENT ON VIEW ar.v_points_completos IS 'Vista de puntos AR con toda la información relacionada';

-- -----------------------------------------------------------------------------
-- Vista: Progreso de usuario
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW ar.v_user_progress AS
SELECT 
    uc.user_id,
    COUNT(DISTINCT uc.point_id) AS total_collected,
    (SELECT COUNT(*) FROM ar.points WHERE is_collectible = true AND active = true) AS total_available,
    ROUND(
        (COUNT(DISTINCT uc.point_id)::NUMERIC / 
        NULLIF((SELECT COUNT(*) FROM ar.points WHERE is_collectible = true AND active = true), 0)) * 100, 
        1
    ) AS percentage_complete,
    COALESCE(SUM(p.points_value), 0) AS total_points,
    COUNT(DISTINCT ua.achievement_id) AS achievements_unlocked,
    MIN(uc.collected_at) AS first_collection,
    MAX(uc.collected_at) AS last_collection
FROM ar.user_collections uc
JOIN ar.points p ON uc.point_id = p.id
LEFT JOIN ar.user_achievements ua ON uc.user_id = ua.user_id
GROUP BY uc.user_id;

COMMENT ON VIEW ar.v_user_progress IS 'Resumen del progreso de cada usuario';

-- -----------------------------------------------------------------------------
-- Vista: Leaderboard
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW ar.v_leaderboard AS
SELECT 
    uc.user_id,
    up.display_name,
    up.avatar_url,
    COUNT(DISTINCT uc.point_id) AS items_collected,
    COALESCE(SUM(p.points_value), 0) AS total_points,
    COUNT(DISTINCT ua.achievement_id) AS achievements,
    RANK() OVER (ORDER BY COALESCE(SUM(p.points_value), 0) DESC) AS ranking
FROM ar.user_collections uc
JOIN ar.points p ON uc.point_id = p.id
LEFT JOIN ar.user_profiles up ON uc.user_id = up.user_id
LEFT JOIN ar.user_achievements ua ON uc.user_id = ua.user_id
GROUP BY uc.user_id, up.display_name, up.avatar_url
ORDER BY total_points DESC;

COMMENT ON VIEW ar.v_leaderboard IS 'Ranking de usuarios por puntos';

-- -----------------------------------------------------------------------------
-- Vista: Vestimentas con información de región
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW ar.v_vestimentas_catalogo AS
SELECT 
    v.id,
    v.codigo,
    v.nombre,
    v.nombre_tradicional,
    v.descripcion,
    v.categoria,
    v.genero,
    v.tracking_type,
    v.tiene_fisica_tela,
    v.notas_tecnicas,
    v.artesano_nombre,
    v.artesano_comunidad,
    v.artesano_url,
    v.precio_aproximado,
    v.es_set_completo,
    v.featured,
    -- Región
    r.id AS region_id,
    r.nombre AS region_nombre,
    r.color_primario AS region_color,
    -- Asset
    a.url_glb AS model_url,
    a.url_usdz AS model_url_ios,
    v.thumbnail_url,
    v.preview_gif_url
FROM ar.vestimentas v
LEFT JOIN ar.regiones r ON v.region_id = r.id
LEFT JOIN ar.assets a ON v.asset_id = a.id
WHERE v.active = true;

COMMENT ON VIEW ar.v_vestimentas_catalogo IS 'Catálogo de vestimentas con información completa';

-- ============================================================================
-- PARTE 8: FUNCIONES DE UTILIDAD
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Función: Obtener puntos cercanos
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ar.get_nearby_points(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_meters INTEGER DEFAULT 500
)
RETURNS TABLE (
    id INTEGER,
    codigo VARCHAR,
    nombre VARCHAR,
    tipo ar.point_type,
    region_nombre VARCHAR,
    region_color VARCHAR,
    model_url VARCHAR,
    thumbnail_url VARCHAR,
    is_collectible BOOLEAN,
    points_value INTEGER,
    distance_meters DOUBLE PRECISION,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.codigo,
        p.nombre,
        p.tipo,
        r.nombre AS region_nombre,
        r.color_primario AS region_color,
        a.url_glb AS model_url,
        p.thumbnail_url,
        p.is_collectible,
        p.points_value,
        ST_Distance(
            p.location::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) AS distance_meters,
        ST_Y(p.location::geometry) AS lat,
        ST_X(p.location::geometry) AS lng
    FROM ar.points p
    LEFT JOIN ar.regiones r ON p.region_id = r.id
    LEFT JOIN ar.assets a ON p.asset_principal_id = a.id
    WHERE ST_DWithin(
        p.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_meters
    )
    AND p.active = true
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION ar.get_nearby_points IS 'Obtiene puntos AR dentro de un radio dado';

-- -----------------------------------------------------------------------------
-- Función: Registrar colección y verificar logros
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ar.collect_point(
    p_user_id VARCHAR,
    p_point_id INTEGER,
    p_location GEOGRAPHY DEFAULT NULL,
    p_screenshot_url VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_point RECORD;
    v_result JSONB;
    v_new_achievements JSONB := '[]'::JSONB;
    v_total_collected INTEGER;
    v_quest_progress RECORD;
BEGIN
    -- Obtener información del punto
    SELECT * INTO v_point FROM ar.points WHERE id = p_point_id AND active = true;
    
    IF v_point IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Punto no encontrado');
    END IF;
    
    IF NOT v_point.is_collectible THEN
        RETURN jsonb_build_object('success', false, 'error', 'Punto no coleccionable');
    END IF;
    
    -- Intentar insertar (ignorar si ya existe)
    INSERT INTO ar.user_collections (user_id, point_id, location_collected, screenshot_url)
    VALUES (p_user_id, p_point_id, p_location, p_screenshot_url)
    ON CONFLICT (user_id, point_id) DO NOTHING;
    
    -- Contar total recolectado
    SELECT COUNT(*) INTO v_total_collected
    FROM ar.user_collections WHERE user_id = p_user_id;
    
    -- Actualizar progreso de quest si aplica
    IF v_point.quest_id IS NOT NULL THEN
        INSERT INTO ar.user_quest_progress (user_id, quest_id, items_collected, items_found)
        VALUES (p_user_id, v_point.quest_id, 1, ARRAY[p_point_id])
        ON CONFLICT (user_id, quest_id) DO UPDATE
        SET items_collected = ar.user_quest_progress.items_collected + 1,
            items_found = array_append(ar.user_quest_progress.items_found, p_point_id);
        
        -- Verificar si completó la quest
        SELECT * INTO v_quest_progress
        FROM ar.user_quest_progress uqp
        JOIN ar.quests q ON uqp.quest_id = q.id
        WHERE uqp.user_id = p_user_id AND uqp.quest_id = v_point.quest_id;
        
        IF v_quest_progress.items_collected >= v_quest_progress.total_items 
           AND v_quest_progress.completed_at IS NULL THEN
            UPDATE ar.user_quest_progress 
            SET completed_at = NOW()
            WHERE user_id = p_user_id AND quest_id = v_point.quest_id;
        END IF;
    END IF;
    
    -- Actualizar perfil de usuario
    INSERT INTO ar.user_profiles (user_id, total_collected, total_points)
    VALUES (p_user_id, 1, v_point.points_value)
    ON CONFLICT (user_id) DO UPDATE
    SET total_collected = ar.user_profiles.total_collected + 1,
        total_points = ar.user_profiles.total_points + v_point.points_value,
        updated_at = NOW(),
        last_active_at = NOW();
    
    -- TODO: Verificar y desbloquear logros aquí
    -- (simplificado por brevedad)
    
    RETURN jsonb_build_object(
        'success', true,
        'points_earned', v_point.points_value,
        'total_collected', v_total_collected,
        'new_achievements', v_new_achievements
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION ar.collect_point IS 'Registra la colección de un punto y actualiza progreso';

-- ============================================================================
-- PARTE 9: TRIGGERS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Trigger: Actualizar updated_at automáticamente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ar.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_regiones_updated_at
    BEFORE UPDATE ON ar.regiones
    FOR EACH ROW EXECUTE FUNCTION ar.update_updated_at();

CREATE TRIGGER trg_points_updated_at
    BEFORE UPDATE ON ar.points
    FOR EACH ROW EXECUTE FUNCTION ar.update_updated_at();

CREATE TRIGGER trg_assets_updated_at
    BEFORE UPDATE ON ar.assets
    FOR EACH ROW EXECUTE FUNCTION ar.update_updated_at();

CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON ar.user_profiles
    FOR EACH ROW EXECUTE FUNCTION ar.update_updated_at();

-- ============================================================================
-- PARTE 10: DATOS SEED
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Seed: Regiones de Oaxaca
-- -----------------------------------------------------------------------------
INSERT INTO ar.regiones (codigo, nombre, nombre_corto, descripcion, color_primario, color_secundario, orden_display) VALUES
('valles_centrales', 'Valles Centrales', 'Valles', 
 'Corazón cultural de Oaxaca, hogar de los zapotecos. Incluye la capital, Monte Albán y los pueblos artesanos de Arrazola, San Bartolo Coyotepec y Teotitlán del Valle.', 
 '#E63946', '#FF6B6B', 1),

('istmo', 'Istmo de Tehuantepec', 'Istmo', 
 'Tierra de las tehuanas, famosas por su vestimenta imponente y la sociedad matriarcal. Región de vientos, cultura zapoteca y tradiciones únicas.', 
 '#9B59B6', '#A569BD', 2),

('mixteca', 'Región Mixteca', 'Mixteca', 
 'Cuna de la civilización mixteca, conocida por su orfebrería prehispánica y la Heroica Ciudad de Huajuapan. Tierra de ñuu savi (pueblo de la lluvia).', 
 '#3498DB', '#5DADE2', 3),

('costa', 'Costa Oaxaqueña', 'Costa', 
 'Playas del Pacífico y tradiciones afromexicanas. Puerto Escondido, Huatulco y Pinotepa Nacional. Hogar de la chilena y culturas mixtas.', 
 '#F4A261', '#F5B041', 4),

('sierra_norte', 'Sierra Norte', 'Sierra Norte', 
 'Pueblos Mancomunados y tradiciones ancestrales. Bosques de niebla, café de altura y turismo comunitario. Pueblos zapotecos de montaña.', 
 '#27AE60', '#2ECC71', 5),

('sierra_sur', 'Sierra Sur', 'Sierra Sur', 
 'Tierra de la chilena, el mezcal y el carnaval de Putla con sus Tiliches. Región montañosa con cultura chatina y tacuate.', 
 '#2A9D8F', '#48C9B0', 6),

('papaloapan', 'Cuenca del Papaloapan', 'Papaloapan', 
 'Región de ríos y selvas tropicales. Tuxtepec y la Flor de Piña. Culturas mazateca, chinanteca y afrodescendiente. Tierra de piña y caña.', 
 '#1ABC9C', '#16A085', 7),

('canada', 'Región Cañada', 'Cañada', 
 'Puente entre culturas mazateca y cuicateca. Cañón del Río Tomellín, Cuicatlán y las plantas mágicas. Reserva de la Biosfera.', 
 '#E67E22', '#D35400', 8);

-- -----------------------------------------------------------------------------
-- Seed: Quest - La Búsqueda de la Princesa Donají
-- -----------------------------------------------------------------------------
INSERT INTO ar.quests (codigo, nombre, descripcion, narrativa, total_items, reward_points, reward_description) VALUES
('busqueda_donaji', 'La Búsqueda de la Princesa Donají', 
 'Encuentra los 4 lirios virtuales escondidos en el Centro Histórico',
 'La leyenda cuenta que la cabeza de la Princesa Donají (alma grande) se mantiene viva y fue encontrada por un pastor cerca del río Atoyac, identificada por un lirio que nacía de ella. Ahora tú puedes seguir sus pasos y descubrir los lirios mágicos que dejó en la ciudad.',
 4, 200, 'Filtro de Guerrero Zapoteca desbloqueado');

-- -----------------------------------------------------------------------------
-- Seed: Puntos AR - Monumentos Históricos
-- -----------------------------------------------------------------------------
INSERT INTO ar.points (codigo, nombre, descripcion, narrativa, tipo, region_id, 
                       location, tracking_type, is_collectible, points_value, color, emoji) VALUES

-- Santo Domingo de Guzmán
('santo_domingo', 'Templo de Santo Domingo de Guzmán', 
 'Joya del barroco novohispano, construido entre 1551 y 1608 por los dominicos.',
 'Al apuntar tu cámara a la fachada, verás desplegarse el majestuoso Árbol Genealógico de Santo Domingo de Guzmán que se encuentra en la bóveda del sotocoro interior. Toca las ramas para descubrir la historia de los reyes y santos dominicos que forjaron Oaxaca.',
 'monument', 
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 ST_SetSRID(ST_MakePoint(-96.7254, 17.0649), 4326),
 'vertical', false, 0, '#D4AF37', '⛪'),

-- Teatro Macedonio Alcalá
('teatro_macedonio', 'Teatro Macedonio Alcalá',
 'Inaugurado en 1909, es uno de los teatros más bellos de México con su estilo Luis XV.',
 'Al apuntar al edificio, verás "fantasmas" digitales de la época porfiriana entrando al recinto como en su inauguración de 1909. Una placa flotante te revelará que originalmente fue un Casino y que el general Vicente Guerrero estuvo preso en el convento contiguo.',
 'monument',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 ST_SetSRID(ST_MakePoint(-96.7246, 17.0616), 4326),
 'vertical', false, 0, '#8B4513', '🎭');

-- -----------------------------------------------------------------------------
-- Seed: Puntos AR - Búsqueda de Donají (Quest Items)
-- -----------------------------------------------------------------------------
INSERT INTO ar.points (codigo, nombre, descripcion, tipo, region_id, quest_id, quest_orden,
                       location, is_collectible, points_value, color, emoji) VALUES

('donaji_lirio_1', 'Lirio de Donají - Catedral',
 'El primer lirio aparece cerca de la Catedral, donde la fe de los oaxaqueños florece.',
 'quest_item',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 (SELECT id FROM ar.quests WHERE codigo = 'busqueda_donaji'), 1,
 ST_SetSRID(ST_MakePoint(-96.7255, 17.0608), 4326),
 true, 30, '#FFD700', '🌸'),

('donaji_lirio_2', 'Lirio de Donají - Alameda de León',
 'El segundo lirio descansa en la sombra de los laureles centenarios.',
 'quest_item',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 (SELECT id FROM ar.quests WHERE codigo = 'busqueda_donaji'), 2,
 ST_SetSRID(ST_MakePoint(-96.7241, 17.0619), 4326),
 true, 30, '#FFD700', '🌸'),

('donaji_lirio_3', 'Lirio de Donají - Museo de las Culturas',
 'El tercer lirio guarda la memoria de todos los pueblos de Oaxaca.',
 'quest_item',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 (SELECT id FROM ar.quests WHERE codigo = 'busqueda_donaji'), 3,
 ST_SetSRID(ST_MakePoint(-96.7252, 17.0651), 4326),
 true, 30, '#FFD700', '🌸'),

('donaji_lirio_final', 'Lirio de Donají - Escudo de la Ciudad',
 'El lirio final te espera donde el escudo oficial muestra la cabeza de la princesa.',
 'quest_item',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 (SELECT id FROM ar.quests WHERE codigo = 'busqueda_donaji'), 4,
 ST_SetSRID(ST_MakePoint(-96.7248, 17.0603), 4326),
 true, 50, '#FFD700', '👑');

-- -----------------------------------------------------------------------------
-- Seed: Puntos AR - Personajes Regionales (Tiliches)
-- -----------------------------------------------------------------------------
INSERT INTO ar.points (codigo, nombre, descripcion, narrativa, tipo, region_id,
                       location, is_collectible, points_value, color, emoji) VALUES

('tiliche_danzante_pluma', 'Danzante de la Pluma',
 'El majestuoso danzante representa la resistencia cultural zapoteca y el sincretismo.',
 'El penacho representa el cosmos y el conocimiento astronómico. Cada pluma cuenta una historia de resistencia y orgullo zapoteca.',
 'character',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 ST_SetSRID(ST_MakePoint(-96.7245, 17.0617), 4326),
 true, 25, '#E63946', '💃'),

('tiliche_china_oaxaquena', 'China Oaxaqueña',
 'La mujer que lleva la canasta enflorada con gracia y equilibrio.',
 'La canasta de carrizo con flores representa la ofrenda y la abundancia. Las figuras de liras y estrellas cuentan historias del cielo oaxaqueño.',
 'character',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 ST_SetSRID(ST_MakePoint(-96.7226, 17.0649), 4326),
 true, 25, '#E63946', '👗'),

('tiliche_tehuana', 'Tehuana',
 'La imponente mujer del Istmo de Tehuantepec con su resplandor.',
 'El resplandor (holán) de encaje blanco almidonado enmarca el rostro como un halo. El huipil de terciopelo con flores grandes y los centenarios de oro muestran la riqueza de la cultura istmeña.',
 'character',
 (SELECT id FROM ar.regiones WHERE codigo = 'istmo'),
 ST_SetSRID(ST_MakePoint(-96.7260, 17.0630), 4326),
 true, 25, '#9B59B6', '👑'),

('tiliche_flor_pina', 'Flor de Piña',
 'La danzante del Papaloapan que honra a la piña tuxtepecana.',
 'El huipil largo con pájaros y flores en punto de cruz cuenta la historia del trópico. La piña en el hombro es símbolo de hospitalidad y abundancia de la región.',
 'character',
 (SELECT id FROM ar.regiones WHERE codigo = 'papaloapan'),
 ST_SetSRID(ST_MakePoint(-96.7300, 17.0590), 4326),
 true, 25, '#1ABC9C', '🍍'),

('tiliche_jarabe_mixteco', 'Jarabe Mixteco',
 'El ritmo vibrante de la región Mixteca.',
 'El jarabe es el baile del cortejo, donde la gracia y el ritmo cuentan historias de amor del pueblo de la lluvia.',
 'character',
 (SELECT id FROM ar.regiones WHERE codigo = 'mixteca'),
 ST_SetSRID(ST_MakePoint(-96.7320, 17.0600), 4326),
 true, 25, '#3498DB', '🎺'),

('tiliche_putla', 'Tiliche de Putla',
 'El misterioso personaje del carnaval de la Sierra Sur.',
 'Los Tiliches aparecen durante el carnaval cubiertos de trapos y máscaras, representando a los espíritus que visitan desde el otro mundo.',
 'character',
 (SELECT id FROM ar.regiones WHERE codigo = 'sierra_sur'),
 ST_SetSRID(ST_MakePoint(-96.7280, 17.0580), 4326),
 true, 25, '#2A9D8F', '🎭'),

('tiliche_chilena', 'La Chilena',
 'El baile costeño nacido de la influencia sudamericana.',
 'La chilena llegó con los marineros chilenos en el siglo XIX y se fusionó con los ritmos afromexicanos de la costa.',
 'character',
 (SELECT id FROM ar.regiones WHERE codigo = 'costa'),
 ST_SetSRID(ST_MakePoint(-96.7350, 17.0550), 4326),
 true, 25, '#F4A261', '🌊'),

('tiliche_sandunga', 'La Sandunga',
 'La melancolía bella del son istmeño.',
 'La Sandunga es el vals de los tehuanos, un canto de amor y despedida que se baila en las velas y fiestas del Istmo.',
 'character',
 (SELECT id FROM ar.regiones WHERE codigo = 'istmo'),
 ST_SetSRID(ST_MakePoint(-96.7200, 17.0670), 4326),
 true, 25, '#9B59B6', '🎵');

-- -----------------------------------------------------------------------------
-- Seed: Vestimentas para Virtual Try-On
-- -----------------------------------------------------------------------------
INSERT INTO ar.vestimentas (codigo, nombre, nombre_tradicional, descripcion, datos_culturales, 
                            region_id, categoria, genero, tracking_type, tiene_fisica_tela, 
                            rigidez, notas_tecnicas) VALUES

-- TEHUANA - Set completo (3 elementos)
('tehuana_resplandor', 'Resplandor de Tehuana', 'Bidaani',
 'Encaje blanco almidonado que enmarca el rostro como un halo de luz.',
 'El resplandor es la prenda más icónica del traje de tehuana. También llamado "holán", se usaba originalmente para ir a la iglesia. Frida Kahlo lo inmortalizó en sus pinturas.',
 (SELECT id FROM ar.regiones WHERE codigo = 'istmo'),
 'cabeza', 'femenino', 'head', true, 0.9,
 'Debe tener física de tela RÍGIDA. El encaje mantiene su forma. Requiere Head Tracking preciso.'),

('tehuana_huipil', 'Huipil de Tehuana', 'Huipil',
 'Blusa de terciopelo o satín con bordados de flores grandes y coloridas.',
 'El huipil istmeño se caracteriza por sus flores de cadena bordadas a mano. Los colores vivos representan la alegría y riqueza de la cultura zapoteca del Istmo.',
 (SELECT id FROM ar.regiones WHERE codigo = 'istmo'),
 'torso', 'femenino', 'upper_body', true, 0.5,
 'Terciopelo con caída natural. Upper Body Tracking. Los bordados deben tener relieve visible.'),

('tehuana_joyeria', 'Joyería de Tehuana', 'Bidaani oro',
 'Ahogador y monedas de oro (centenarios) que adornan el cuello.',
 'Los centenarios de oro son símbolo de estatus y riqueza heredada. Se usan en fiestas y velas importantes.',
 (SELECT id FROM ar.regiones WHERE codigo = 'istmo'),
 'accesorio', 'femenino', 'upper_body', false, 1.0,
 'Elementos rígidos. Deben reflejar luz como oro real. Seguimiento de cuello/pecho.'),

-- FLOR DE PIÑA
('flor_pina_huipil', 'Huipil de Flor de Piña', 'Huipil Tuxtepecano',
 'Huipil largo con diseños de pájaros y flores en punto de cruz o telar.',
 'El huipil de Tuxtepec representa la riqueza natural del Papaloapan con sus aves tropicales y flores exuberantes.',
 (SELECT id FROM ar.regiones WHERE codigo = 'papaloapan'),
 'traje_completo', 'femenino', 'full_body', true, 0.4,
 'Tela con mucha caída. Full Body Tracking. Los colores deben ser muy vivos.'),

('flor_pina_trenzas', 'Trenzas con Listones', 'Trenzas de fiesta',
 'Trenzas adornadas con listones multicolores entretejidos.',
 'Los listones representan los colores de las flores tropicales y los pájaros del Papaloapan.',
 (SELECT id FROM ar.regiones WHERE codigo = 'papaloapan'),
 'cabeza', 'femenino', 'head', true, 0.3,
 'Head tracking. Los listones deben tener física suave y movimiento natural.'),

('flor_pina_accesorio', 'Piña Tradicional', 'Piña de Tuxtepec',
 'Piña que se sostiene en el hombro durante la danza.',
 'La piña es el símbolo de Tuxtepec y representa la hospitalidad y abundancia de la región tropical.',
 (SELECT id FROM ar.regiones WHERE codigo = 'papaloapan'),
 'mano', 'femenino', 'hand', false, 1.0,
 'Hand Tracking necesario. La piña debe ser realista con textura detallada.'),

-- DANZA DE LA PLUMA
('danza_pluma_penacho', 'Penacho de la Danza de la Pluma', 'Penacho',
 'Cilindro con plumas de colores, espejos y monedas que representa el cosmos.',
 'El penacho representa el sincretismo y el conocimiento astronómico. Cada color de pluma tiene un significado: rojo (sangre/vida), verde (tierra), blanco (pureza), azul (cielo).',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 'cabeza', 'masculino', 'head', true, 0.7,
 'ELEMENTO MÁS COMPLEJO. Las plumas necesitan física individual. Los espejos deben reflejar. Head tracking muy estable.'),

('danza_pluma_macana', 'Macana de Danzante', 'Macana',
 'Cetro de mando que porta el danzante.',
 'La macana representa la autoridad y el poder del guerrero zapoteca.',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 'mano', 'masculino', 'hand', false, 1.0,
 'Hand Tracking. Objeto rígido con detalles tallados.'),

-- CHINA OAXAQUEÑA
('china_canasta', 'Canasta Enflorada', 'Canasta de carrizo',
 'Canasta de carrizo con figuras de liras y estrellas hechas de flores naturales.',
 'La canasta representa la ofrenda a la Virgen del Carmen. Las flores se preparan especialmente para la festividad.',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 'cabeza', 'femenino', 'head', false, 1.0,
 'INTERACCIÓN ESPECIAL: El usuario debe mantener equilibrio usando acelerómetro para que no se caiga. Head tracking estricto.'),

('china_rebozo', 'Rebozo de Seda', 'Rebozo oaxaqueño',
 'Rebozo de seda brillante en colores vivos.',
 'El rebozo es símbolo de la mujer mexicana. Los de seda de Oaxaca son especialmente finos y brillantes.',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 'accesorio', 'femenino', 'upper_body', true, 0.2,
 'Tela muy suave con mucha caída. Debe brillar como seda real.');

-- -----------------------------------------------------------------------------
-- Seed: Artesanías para Image-to-3D
-- -----------------------------------------------------------------------------
INSERT INTO ar.artesanias (codigo, nombre, descripcion, region_id, comunidad_origen,
                           ai_prompt, ai_style, uso_en_app) VALUES

('alebrije_dragon', 'Alebrije Dragón-Nahual', 
 'Figura fantástica de copal tallada y pintada a mano con patrones de puntos vibrantes.',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 'San Martín Tilcajete / San Antonio Arrazola',
 'Colorful wooden mexican carving, fantastical creature, mix of lizard and dragon with wings, vibrant dots pattern in red blue yellow green, copal wood texture, folk art style, Oaxaca alebrije, highly detailed painting, traditional mexican craft',
 'realistic',
 'Mascota virtual que guía al usuario por el mapa. Puede animarse volando.'),

('barro_negro_olla', 'Olla de Barro Negro',
 'Cerámica negra brillante con técnica de calado y patrones geométricos.',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 'San Bartolo Coyotepec',
 'Black clay pottery vase, highly polished shiny black finish, calado technique with geometric holes pattern, traditional Oaxaca style, elegant curved shape, reflective surface, artisan craft',
 'realistic',
 'Elemento decorativo interactivo. El usuario puede "romper" virtualmente para obtener descuentos.'),

('sombrero_panza_burro', 'Sombrero Panza de Burro',
 'Sombrero tradicional tejido de palma con textura rústica.',
 (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
 'Valles Centrales / Mixteca',
 'Traditional mexican sombrero hat, woven palm fiber, worn authentic texture, natural beige color, wide brim, Oaxaca countryside style, rustic artisan craft',
 'realistic',
 'Accesorio para selfies rápidas. Filtro simple de cara.');

-- -----------------------------------------------------------------------------
-- Seed: Logros
-- -----------------------------------------------------------------------------
INSERT INTO ar.achievements (codigo, nombre, descripcion, tipo, requisitos, points_reward, categoria, dificultad) VALUES

('primera_captura', '¡Primera Captura!', 
 'Recolectaste tu primer personaje de la Guelaguetza',
 'first_action', '{"action": "collect_point"}',
 50, 'coleccion', 'facil'),

('medio_camino', 'A Medio Camino',
 'Has recolectado 4 de los 8 personajes regionales',
 'collect_count', '{"count": 4, "type": "character"}',
 100, 'coleccion', 'normal'),

('embajador_cultural', 'Embajador Cultural',
 '¡Completaste la colección de las 8 regiones de Oaxaca!',
 'collect_all', '{"type": "character"}',
 500, 'coleccion', 'dificil'),

('guardian_donaji', 'Guardián de Donají',
 'Completaste la búsqueda de la Princesa Donají encontrando los 4 lirios',
 'complete_quest', '{"quest_code": "busqueda_donaji"}',
 200, 'exploracion', 'normal'),

('conocedor_valles', 'Conocedor de los Valles',
 'Recolectaste todos los personajes de Valles Centrales',
 'collect_region', '{"region_code": "valles_centrales"}',
 150, 'coleccion', 'normal'),

('cazador_veloz', 'Cazador Veloz',
 'Recolectaste 4 personajes en menos de 1 hora',
 'time_based', '{"count": 4, "minutes": 60}',
 100, 'exploracion', 'dificil'),

('artista_digital', 'Artista Digital',
 'Creaste tu primer Alebrije virtual con la herramienta de dibujo',
 'creation', '{"type": "alebrije"}',
 75, 'creacion', 'facil'),

('explorador_nocturno', 'Explorador Nocturno',
 'Visitaste un punto AR después de las 8pm',
 'time_based', '{"after_hour": 20}',
 50, 'exploracion', 'normal'),

('istmo_completo', 'Alma del Istmo',
 'Recolectaste todos los personajes del Istmo de Tehuantepec',
 'collect_region', '{"region_code": "istmo"}',
 150, 'coleccion', 'normal'),

('fashionista', 'Fashionista Oaxaqueña',
 'Probaste 5 vestimentas diferentes en el probador virtual',
 'collect_count', '{"count": 5, "type": "try_on"}',
 100, 'creacion', 'normal');

-- -----------------------------------------------------------------------------
-- Seed: Zonas Wi-Fi para descarga
-- -----------------------------------------------------------------------------
INSERT INTO ar.wifi_zones (nombre, descripcion, tipo, location, direccion, 
                           horario, velocidad_estimada, requiere_password, verificado) VALUES

('Zócalo de Oaxaca', 
 'Punto de acceso público del gobierno en la plaza principal',
 'publico',
 ST_SetSRID(ST_MakePoint(-96.7250, 17.0608), 4326),
 'Plaza de la Constitución, Centro Histórico',
 '24 horas', 'media', false, true),

('Alameda de León',
 'Jardín público con conectividad y restaurantes cercanos',
 'publico',
 ST_SetSRID(ST_MakePoint(-96.7241, 17.0619), 4326),
 'Alameda de León, frente a Catedral',
 '24 horas', 'media', false, true),

('Explanada Santo Domingo',
 'Área del Centro Cultural con mejor cobertura',
 'cultural',
 ST_SetSRID(ST_MakePoint(-96.7252, 17.0651), 4326),
 'Centro Cultural Santo Domingo, Macedonio Alcalá',
 '10:00-20:00', 'alta', false, true),

('Café Brújula - Alcalá',
 'Cafetería con excelente Wi-Fi para descargar el pack completo',
 'comercial',
 ST_SetSRID(ST_MakePoint(-96.7248, 17.0635), 4326),
 'Macedonio Alcalá 104, Centro',
 '08:00-22:00', 'alta', true, true),

('Restaurante Terranova',
 'Restaurante en el zócalo con conectividad estable',
 'comercial',
 ST_SetSRID(ST_MakePoint(-96.7253, 17.0605), 4326),
 'Portal de Clavería, Zócalo',
 '08:00-23:00', 'alta', true, true);

-- -----------------------------------------------------------------------------
-- Seed: Bundle Offline
-- -----------------------------------------------------------------------------
INSERT INTO ar.offline_bundles (codigo, nombre, descripcion, size_mb_estimated) VALUES
('pack_guelaguetza_2026', 'Pack Guelaguetza 2026', 
 'Todos los modelos 3D, audios y assets necesarios para la experiencia completa sin conexión',
 85.0),
 
('pack_esencial', 'Pack Esencial',
 'Solo los 8 personajes regionales y assets básicos',
 35.0),
 
('pack_donaji', 'Pack Búsqueda de Donají',
 'Assets para completar la búsqueda de los lirios de Donají',
 15.0);

-- ============================================================================
-- PARTE 11: PERMISOS (ajustar según tu configuración)
-- ============================================================================

-- Crear rol para la aplicación (ajustar nombre según necesidad)
-- CREATE ROLE ar_app_user WITH LOGIN PASSWORD 'tu_password_seguro';
-- GRANT USAGE ON SCHEMA ar TO ar_app_user;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ar TO ar_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ar TO ar_app_user;

-- ============================================================================
-- FIN DEL SCRIPT DE MIGRACIÓN
-- ============================================================================

-- Confirmar éxito
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada exitosamente';
    RAISE NOTICE '📊 Tablas creadas: 18';
    RAISE NOTICE '👁️ Vistas creadas: 4';
    RAISE NOTICE '⚡ Funciones creadas: 3';
    RAISE NOTICE '🌍 Regiones: 8';
    RAISE NOTICE '📍 Puntos AR: 12 (2 monumentos, 4 quest items, 6 personajes)';
    RAISE NOTICE '👗 Vestimentas: 10';
    RAISE NOTICE '🎨 Artesanías: 3';
    RAISE NOTICE '🏆 Logros: 10';
    RAISE NOTICE '📶 Zonas Wi-Fi: 5';
END $$;
