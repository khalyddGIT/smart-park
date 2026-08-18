-- ==========================================================
-- SMART-PARK: ESQUEMA DE BASE DE DATOS RELACIONAL (SUPABASE POSTGRESQL)
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
    lot_shape VARCHAR(50) DEFAULT 'rectangular',
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
    elements_json JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Plazas / Cajones (Slots)
CREATE TABLE IF NOT EXISTS parking_slots (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER REFERENCES parkings(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    slot_type VARCHAR(20) DEFAULT 'auto' CHECK (slot_type IN ('auto', 'pmr', 'moto')),
    is_shaded BOOLEAN DEFAULT FALSE,
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
    code VARCHAR(30) UNIQUE NOT NULL,
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

-- ==========================================================
-- DATOS SEMILLA INICIALES
-- ==========================================================

-- Usuarios Principales
INSERT INTO users (id, email, full_name, hashed_password, phone, role)
VALUES 
(1, 'superadmin@smartpark.pe', 'Carlos Mendoza (SuperAdmin)', '$2b$12$e8Y7zHk8x8k9L8M7N6P5Q4R3S2T1U0V9W8X7Y6Z5A4B3C2D1E0F', '+51966112233', 'superadmin'),
(2, 'admin.ayacucho@smartpark.pe', 'Elena Ramos (Admin Local Plaza Mayor)', '$2b$12$e8Y7zHk8x8k9L8M7N6P5Q4R3S2T1U0V9W8X7Y6Z5A4B3C2D1E0F', '+51966445566', 'local'),
(3, 'conductor1@gmail.com', 'Juan Quispe (Conductor)', '$2b$12$e8Y7zHk8x8k9L8M7N6P5Q4R3S2T1U0V9W8X7Y6Z5A4B3C2D1E0F', '+51988776655', 'user')
ON CONFLICT (id) DO NOTHING;

-- Vehículos
INSERT INTO vehicles (id, user_id, plate, brand, model, color, vehicle_type, is_primary)
VALUES
(1, 3, 'ABC-123', 'Toyota', 'Corolla', 'Blanco', 'auto', TRUE),
(2, 3, 'XYZ-789', 'Hyundai', 'Tucson', 'Gris', 'auto', FALSE),
(3, 3, 'AYC-501', 'Honda', 'Civic', 'Negro', 'auto', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Estacionamientos en Ayacucho
INSERT INTO parkings (id, owner_id, name, slug, address, city, latitude, longitude, hourly_rate, lot_shape)
VALUES
(1, 2, 'Smart Park Plaza Mayor Ayacucho', 'smart-park-plaza-mayor', 'Portal Unión 42, Centro Histórico', 'Ayacucho - Huamanga', -13.1631, -74.2236, 5.00, 'l_shape'),
(2, 2, 'Estacionamiento 28 de Julio', 'estacionamiento-28-de-julio', 'Jr. 28 de Julio 350', 'Ayacucho - Huamanga', -13.1605, -74.2250, 4.50, 'diagonal'),
(3, 2, 'Cochera Mariscal Cáceres', 'cochera-mariscal-caceres', 'Av. Mariscal Cáceres 780', 'Ayacucho - Huamanga', -13.1650, -74.2210, 4.00, 'u_shape')
ON CONFLICT (id) DO NOTHING;
