-- =============================================================================
-- SMART-PARK DATABASE SCHEMA (PostgreSQL / SQLite Compatible)
-- Nombres de Tablas Relacionales en Español con Claves Foráneas e Índices
-- =============================================================================

-- 1. TABLA: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30),
    hashed_password VARCHAR(255) NOT NULL,
    security_pin VARCHAR(255) DEFAULT '1234',
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'user', 'local', 'platform'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- 2. TABLA: vehiculos
CREATE TABLE IF NOT EXISTS vehiculos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    license_plate VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(20) DEFAULT 'auto', -- 'auto', 'moto', 'suv', 'truck', 'bike', 'pmr'
    brand VARCHAR(50),
    model VARCHAR(50),
    color VARCHAR(30)
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_license_plate ON vehiculos(license_plate);

-- 3. TABLA: estacionamientos
CREATE TABLE IF NOT EXISTS estacionamientos (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Ayacucho - Huamanga',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    hourly_rate DOUBLE PRECISION NOT NULL DEFAULT 8.50,
    tolerance_minutes INTEGER DEFAULT 15,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'maintenance'
    total_capacity INTEGER DEFAULT 30,
    image_url VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_estacionamientos_city ON estacionamientos(city);

-- 4. TABLA: plazas
CREATE TABLE IF NOT EXISTS plazas (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER NOT NULL REFERENCES estacionamientos(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    floor_level VARCHAR(20) DEFAULT 'Piso 1',
    slot_type VARCHAR(20) DEFAULT 'auto', -- 'auto', 'moto', 'suv', 'truck', 'bike', 'pmr'
    status VARCHAR(20) DEFAULT 'free', -- 'free', 'occupied', 'reserved', 'disabled'
    pos_x INTEGER DEFAULT 0,
    pos_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 60,
    height INTEGER DEFAULT 100,
    rotation INTEGER DEFAULT 0
);

-- 5. TABLA: elementos_plano
CREATE TABLE IF NOT EXISTS elementos_plano (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER NOT NULL REFERENCES estacionamientos(id) ON DELETE CASCADE,
    element_type VARCHAR(30) NOT NULL, -- 'wall', 'crosswalk', 'text', 'gate'
    pos_x INTEGER NOT NULL,
    pos_y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    rotation INTEGER DEFAULT 0,
    z_index INTEGER DEFAULT 1,
    properties_json TEXT
);

-- 6. TABLA: reservas
CREATE TABLE IF NOT EXISTS reservas (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    parking_id INTEGER NOT NULL REFERENCES estacionamientos(id),
    slot_id INTEGER NOT NULL REFERENCES plazas(id),
    license_plate VARCHAR(20) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    actual_entry TIMESTAMP,
    actual_exit TIMESTAMP,
    total_cost DOUBLE PRECISION NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'cancelled'
    qr_code VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reservas_code ON reservas(code);

-- 7. TABLA: personal
CREATE TABLE IF NOT EXISTS personal (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER NOT NULL REFERENCES estacionamientos(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    dni VARCHAR(20) NOT NULL,
    position VARCHAR(50) NOT NULL, -- 'Operador Garita', 'Supervisor', 'Mantenimiento'
    shift VARCHAR(30) DEFAULT 'Mañana', -- 'Mañana', 'Tarde', 'Noche'
    status VARCHAR(20) DEFAULT 'active',
    email VARCHAR(150),
    security_pin VARCHAR(20) DEFAULT '1234',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA: resenas
CREATE TABLE IF NOT EXISTS resenas (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER NOT NULL REFERENCES estacionamientos(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    user_name VARCHAR(150) NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5, -- 1 a 5 estrellas
    comment TEXT NOT NULL,
    response TEXT, -- Respuesta del administrador local de la cochera
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABLA: incidencias
CREATE TABLE IF NOT EXISTS incidencias (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER NOT NULL REFERENCES estacionamientos(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    user_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    description TEXT NOT NULL,
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'reported', -- 'reported', 'in_progress', 'resolved'
    resolution_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- =============================================================================
-- FIN DEL SCRIPT DE BASE DE DATOS SMART-PARK
-- =============================================================================
