# Base de Datos AR Guelaguetza
## Guía de Instalación y Uso

---

## 📋 Resumen

Este script crea la estructura completa de base de datos para el módulo de Realidad Aumentada de la app Guelaguetza.

### Contenido del Script

| Categoría | Cantidad |
|-----------|----------|
| Tablas | 18 |
| Vistas | 4 |
| Funciones | 3 |
| Triggers | 4 |
| Índices | 20+ |

### Datos Seed Incluidos

| Tipo | Registros | Detalles |
|------|-----------|----------|
| Regiones | 8 | Las 8 regiones culturales de Oaxaca |
| Puntos AR | 12 | 2 monumentos + 4 quest items + 6 personajes |
| Quest | 1 | La Búsqueda de Donají |
| Vestimentas | 10 | Trajes de Tehuana, Flor de Piña, Danza de la Pluma, China Oaxaqueña |
| Artesanías | 3 | Alebrije, Barro Negro, Sombrero |
| Logros | 10 | Sistema de gamificación completo |
| Zonas Wi-Fi | 5 | Puntos de descarga en el Centro Histórico |

---

## 🚀 Instalación

### Prerrequisitos

```bash
# PostgreSQL 14+
psql --version

# PostGIS instalado
psql -c "SELECT PostGIS_version();"
```

### Pasos de Instalación

```bash
# 1. Conectar a PostgreSQL
psql -U postgres

# 2. Crear base de datos (si no existe)
CREATE DATABASE guelaguetza_db;

# 3. Conectar a la BD
\c guelaguetza_db

# 4. Ejecutar el script de migración
\i ar_migration_complete.sql
```

### Verificar Instalación

```sql
-- Ver tablas creadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'ar' ORDER BY table_name;

-- Ver conteo de datos seed
SELECT 'Regiones' as tabla, COUNT(*) as registros FROM ar.regiones
UNION ALL
SELECT 'Puntos AR', COUNT(*) FROM ar.points
UNION ALL
SELECT 'Vestimentas', COUNT(*) FROM ar.vestimentas
UNION ALL
SELECT 'Logros', COUNT(*) FROM ar.achievements;
```

---

## 📊 Estructura de Tablas

### Diagrama Simplificado

```
┌─────────────────────────────────────────────────────────────┐
│                    SCHEMA: ar                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CATÁLOGOS              CONTENIDO AR        USUARIO         │
│  ├── regiones           ├── points          ├── user_collections
│  ├── quests             ├── assets          ├── user_achievements
│  └── achievements       ├── vestimentas     ├── user_favorites
│                         └── artesanias      └── user_creations
│                                                             │
│  OPERACIONAL                                                │
│  ├── offline_bundles                                        │
│  ├── wifi_zones                                             │
│  └── analytics_events                                       │
└─────────────────────────────────────────────────────────────┘
```

### Tablas Principales

#### `ar.points` - Puntos AR Geolocalizados
```sql
-- Columnas clave:
- location (GEOGRAPHY)     -- Coordenadas PostGIS
- tipo (ENUM)              -- character, monument, quest_item, etc.
- is_collectible (BOOL)    -- ¿Se puede recolectar?
- activation_radius_meters -- Radio de activación GPS
```

#### `ar.vestimentas` - Catálogo Try-On
```sql
-- Columnas clave:
- tracking_type (ENUM)     -- head, face, upper_body, full_body, hand
- tiene_fisica_tela (BOOL) -- ¿Requiere simulación de tela?
- rigidez (FLOAT)          -- 0=suave, 1=rígido
```

---

## 🔍 Queries de Ejemplo

### Obtener Puntos Cercanos (Core Feature)

```sql
-- Usando la función incluida
SELECT * FROM ar.get_nearby_points(
    17.0617,  -- latitud (usuario)
    -96.7245, -- longitud (usuario)
    500       -- radio en metros
);
```

### Query Manual con PostGIS

```sql
SELECT 
    p.nombre,
    r.nombre AS region,
    ST_Distance(
        p.location::geography,
        ST_SetSRID(ST_MakePoint(-96.7245, 17.0617), 4326)::geography
    ) AS distancia_metros
FROM ar.points p
JOIN ar.regiones r ON p.region_id = r.id
WHERE ST_DWithin(
    p.location::geography,
    ST_SetSRID(ST_MakePoint(-96.7245, 17.0617), 4326)::geography,
    500
)
AND p.active = true
ORDER BY distancia_metros;
```

### Registrar Colección con Función

```sql
-- La función maneja todo: inserción, progreso de quest, puntos, etc.
SELECT ar.collect_point(
    'user_123',           -- user_id
    1,                    -- point_id
    ST_SetSRID(ST_MakePoint(-96.7245, 17.0617), 4326), -- ubicación
    'https://...'         -- screenshot_url (opcional)
);

-- Retorna:
-- {"success": true, "points_earned": 25, "total_collected": 1, ...}
```

### Ver Progreso de Usuario

```sql
SELECT * FROM ar.v_user_progress WHERE user_id = 'user_123';
```

### Ver Leaderboard

```sql
SELECT * FROM ar.v_leaderboard LIMIT 10;
```

### Catálogo de Vestimentas por Región

```sql
SELECT * FROM ar.v_vestimentas_catalogo 
WHERE region_codigo = 'istmo'
ORDER BY categoria;
```

---

## 🗺️ Coordenadas de Referencia

### Centro Histórico de Oaxaca

| Lugar | Latitud | Longitud |
|-------|---------|----------|
| Zócalo | 17.0608 | -96.7250 |
| Santo Domingo | 17.0649 | -96.7254 |
| Teatro Macedonio | 17.0616 | -96.7246 |
| Alameda de León | 17.0619 | -96.7241 |

### Formato para Insertar Puntos

```sql
-- Usar ST_SetSRID con SRID 4326 (WGS84)
INSERT INTO ar.points (nombre, location, ...)
VALUES (
    'Mi Punto',
    ST_SetSRID(ST_MakePoint(-96.7250, 17.0608), 4326), -- (lng, lat)
    ...
);
```

⚠️ **Nota**: PostGIS usa el orden `(longitud, latitud)`, no `(lat, lng)`.

---

## 🔧 Mantenimiento

### Agregar Nuevo Punto AR

```sql
INSERT INTO ar.points (
    codigo, nombre, descripcion, tipo, region_id,
    location, is_collectible, points_value, color, emoji
) VALUES (
    'nuevo_punto',
    'Mi Nuevo Punto',
    'Descripción del punto',
    'character',
    (SELECT id FROM ar.regiones WHERE codigo = 'valles_centrales'),
    ST_SetSRID(ST_MakePoint(-96.7250, 17.0608), 4326),
    true,
    25,
    '#E63946',
    '🎉'
);
```

### Agregar Nueva Vestimenta

```sql
INSERT INTO ar.vestimentas (
    codigo, nombre, descripcion,
    region_id, categoria, tracking_type,
    tiene_fisica_tela, rigidez
) VALUES (
    'mi_vestimenta',
    'Nueva Vestimenta',
    'Descripción',
    (SELECT id FROM ar.regiones WHERE codigo = 'istmo'),
    'torso',
    'upper_body',
    true,
    0.5
);
```

### Actualizar Asset de un Punto

```sql
-- 1. Crear el asset
INSERT INTO ar.assets (codigo, nombre, tipo, url_glb, url_usdz)
VALUES ('asset_nuevo', 'Mi Asset', 'model_3d', 
        'https://cdn.../model.glb', 
        'https://cdn.../model.usdz')
RETURNING id;

-- 2. Asignar al punto
UPDATE ar.points 
SET asset_principal_id = <id_retornado>
WHERE codigo = 'mi_punto';
```

---

## 📱 Integración con Node.js

### Conexión

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Importante: establecer search_path
  options: '-c search_path=ar,public'
});
```

### Ejemplo: Endpoint de Puntos Cercanos

```javascript
app.get('/api/ar/nearby', async (req, res) => {
  const { lat, lng, radius = 500 } = req.query;
  
  const result = await pool.query(
    'SELECT * FROM ar.get_nearby_points($1, $2, $3)',
    [parseFloat(lat), parseFloat(lng), parseInt(radius)]
  );
  
  res.json(result.rows);
});
```

### Ejemplo: Registrar Colección

```javascript
app.post('/api/ar/collect', async (req, res) => {
  const { userId, pointId, lat, lng, screenshotUrl } = req.body;
  
  const location = lat && lng 
    ? `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)` 
    : 'NULL';
  
  const result = await pool.query(
    `SELECT ar.collect_point($1, $2, ${location}, $3)`,
    [userId, pointId, screenshotUrl]
  );
  
  res.json(result.rows[0].collect_point);
});
```

---

## 🔄 Rollback

Para eliminar completamente el schema AR:

```sql
DROP SCHEMA IF EXISTS ar CASCADE;
```

---

## 📝 Notas Importantes

1. **PostGIS es obligatorio** - Sin él, las queries geoespaciales no funcionarán.

2. **Orden de coordenadas** - PostGIS usa `(longitud, latitud)`, el estándar geográfico. La mayoría de APIs de mapas usan `(lat, lng)`.

3. **User ID como VARCHAR** - Diseñado para ser flexible con cualquier sistema de autenticación externo.

4. **Assets externos** - Los URLs de modelos 3D (url_glb, url_usdz) deben apuntar a tu CDN o storage.

5. **Modo Offline** - La tabla `offline_bundles` y `bundle_assets` permiten pre-definir paquetes de descarga.

---

## 📞 Soporte

Este script es parte del proyecto AR Guelaguetza.
Para dudas sobre la estructura, consulta el documento `Plan_Analisis_BD_AR_Guelaguetza.md`.
