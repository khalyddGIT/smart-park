-- ==========================================================
-- SMART-PARK: ESQUEMA DE BASE DE DATOS RELACIONAL (POSTGRESQL / SQLITE)
-- ==========================================================

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(30) DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'local', 'guard', 'user')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Vehículos de Usuarios
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plate VARCHAR(15) UNIQUE NOT NULL,
    brand VARCHAR(50),
    model VARCHAR(50),
    color VARCHAR(30),
    vehicle_type VARCHAR(20) DEFAULT 'auto' CHECK (vehicle_type IN ('auto', 'moto', 'van', 'pmr')),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Estacionamientos (Parkings)
CREATE TABLE IF NOT EXISTS parkings (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) DEFAULT 'Ayacucho',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    night_rate DECIMAL(10, 2) DEFAULT 7.00,
    grace_minutes INTEGER DEFAULT 15,
    total_capacity INTEGER DEFAULT 50,
    lot_shape VARCHAR(50) DEFAULT 'rectangular', -- 'rectangular', 'l_shape', 'diagonal', 'u_shape', 'custom'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Elementos y Planos Arquitectónicos CAD (Floor Plans)
CREATE TABLE IF NOT EXISTS parking_layouts (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER REFERENCES parkings(id) ON DELETE CASCADE,
    level_name VARCHAR(50) DEFAULT 'Nivel 1 - Superficie',
    canvas_width INTEGER DEFAULT 1100,
    canvas_height INTEGER DEFAULT 700,
    elements_json JSONB NOT NULL, -- Almacena muros, cajones, calles, garitas, edificios colindantes y jardines
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Plazas / Cajones (Slots)
CREATE TABLE IF NOT EXISTS parking_slots (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER REFERENCES parkings(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL, -- ej. 'A-01', 'N-02', 'S-03'
    slot_type VARCHAR(20) DEFAULT 'auto' CHECK (slot_type IN ('auto', 'pmr', 'moto')),
    is_shaded BOOLEAN DEFAULT FALSE, -- Plaza techada / con sombra
    status VARCHAR(20) DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved', 'maintenance')),
    current_plate VARCHAR(15),
    x_pos DOUBLE PRECISION DEFAULT 0,
    y_pos DOUBLE PRECISION DEFAULT 0,
    width DOUBLE PRECISION DEFAULT 75,
    height DOUBLE PRECISION DEFAULT 140,
    rotation DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Reservas
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL, -- ej. 'RSV-8912'
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    parking_id INTEGER REFERENCES parkings(id) ON DELETE CASCADE,
    slot_id INTEGER REFERENCES parking_slots(id) ON DELETE SET NULL,
    slot_code VARCHAR(20) NOT NULL,
    plate VARCHAR(15) NOT NULL,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_hours INTEGER DEFAULT 2,
    total_amount DECIMAL(10, 2) NOT NULL,
    qr_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Transacciones y Pagos
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'yape' CHECK (payment_method IN ('yape', 'plin', 'card', 'cash')),
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
    transaction_id VARCHAR(100) UNIQUE,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla de Registros y Eventos ANPR (Garita de Control)
CREATE TABLE IF NOT EXISTS anpr_events (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER REFERENCES parkings(id) ON DELETE CASCADE,
    plate VARCHAR(15) NOT NULL,
    event_type VARCHAR(20) CHECK (event_type IN ('entry', 'exit', 'unknown')),
    confidence_score DOUBLE PRECISION DEFAULT 0.95,
    snapshot_url VARCHAR(255),
    barrier_triggered BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
