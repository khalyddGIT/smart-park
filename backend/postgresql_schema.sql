-- =============================================================================
-- SCRIPT OFICIAL COMPLETO PARA POSTGRESQL (RAILWAY / PRODUCCIÓN)
-- Proyecto: SMART-PARK Enterprise & Marketplace
-- Motor: PostgreSQL 14 / 15 / 16 / 17
-- =============================================================================

-- 0. EXTENSIONES DE POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ESTRUCTURA DE TABLAS (DDL) EN ESPAÑOL
-- =============================================================================

-- Tabla: usuarios
DROP TABLE IF EXISTS usuarios CASCADE;
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30),
    hashed_password VARCHAR(255) NOT NULL,
    security_pin VARCHAR(255) DEFAULT '1234',
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'local', 'platform')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_role ON usuarios(role);

-- Tabla: vehiculos
DROP TABLE IF EXISTS vehiculos CASCADE;
CREATE TABLE vehiculos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    license_plate VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(20) DEFAULT 'auto' CHECK (vehicle_type IN ('auto', 'moto', 'suv', 'truck', 'bike')),
    brand VARCHAR(50),
    model VARCHAR(50),
    color VARCHAR(30)
);

CREATE INDEX idx_vehiculos_user_id ON vehiculos(user_id);
CREATE INDEX idx_vehiculos_license_plate ON vehiculos(license_plate);

-- Tabla: estacionamientos
DROP TABLE IF EXISTS estacionamientos CASCADE;
CREATE TABLE estacionamientos (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Ayacucho - Huamanga',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    hourly_rate DOUBLE PRECISION NOT NULL DEFAULT 8.50,
    tolerance_minutes INTEGER DEFAULT 15,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    total_capacity INTEGER DEFAULT 30,
    image_url VARCHAR(255)
);

CREATE INDEX idx_estacionamientos_city ON estacionamientos(city);
CREATE INDEX idx_estacionamientos_status ON estacionamientos(status);

-- Tabla: plazas
DROP TABLE IF EXISTS plazas CASCADE;
CREATE TABLE plazas (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER NOT NULL REFERENCES estacionamientos(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    floor_level VARCHAR(20) DEFAULT 'Piso 1',
    slot_type VARCHAR(20) DEFAULT 'auto' CHECK (slot_type IN ('auto', 'moto', 'suv', 'truck', 'bike')),
    status VARCHAR(20) DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved', 'disabled')),
    pos_x INTEGER DEFAULT 0,
    pos_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 60,
    height INTEGER DEFAULT 100,
    rotation INTEGER DEFAULT 0
);

CREATE INDEX idx_plazas_parking_id ON plazas(parking_id);
CREATE INDEX idx_plazas_status ON plazas(status);

-- Tabla: elementos_plano
DROP TABLE IF EXISTS elementos_plano CASCADE;
CREATE TABLE elementos_plano (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER NOT NULL REFERENCES estacionamientos(id) ON DELETE CASCADE,
    element_type VARCHAR(30) NOT NULL,
    pos_x INTEGER NOT NULL,
    pos_y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    rotation INTEGER DEFAULT 0,
    z_index INTEGER DEFAULT 1,
    properties_json TEXT
);

CREATE INDEX idx_elementos_plano_parking_id ON elementos_plano(parking_id);

-- Tabla: reservas
DROP TABLE IF EXISTS reservas CASCADE;
CREATE TABLE reservas (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    parking_id INTEGER NOT NULL REFERENCES estacionamientos(id) ON DELETE CASCADE,
    slot_id INTEGER NOT NULL REFERENCES plazas(id) ON DELETE CASCADE,
    license_plate VARCHAR(20) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_entry TIMESTAMP WITH TIME ZONE,
    actual_exit TIMESTAMP WITH TIME ZONE,
    total_cost DOUBLE PRECISION NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    qr_code VARCHAR(255) NOT NULL
);

CREATE INDEX idx_reservas_code ON reservas(code);
CREATE INDEX idx_reservas_user_id ON reservas(user_id);
CREATE INDEX idx_reservas_parking_id ON reservas(parking_id);

-- Tabla: personal
DROP TABLE IF EXISTS personal CASCADE;
CREATE TABLE personal (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER NOT NULL REFERENCES estacionamientos(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    dni VARCHAR(20) NOT NULL,
    position VARCHAR(50) NOT NULL,
    shift VARCHAR(30) DEFAULT 'Mañana',
    status VARCHAR(20) DEFAULT 'active',
    email VARCHAR(150),
    security_pin VARCHAR(20) DEFAULT '1234',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_personal_parking_id ON personal(parking_id);

-- Tabla: resenas
DROP TABLE IF EXISTS resenas CASCADE;
CREATE TABLE resenas (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER NOT NULL REFERENCES estacionamientos(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    user_name VARCHAR(150) NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resenas_parking_id ON resenas(parking_id);

-- Tabla: incidencias
DROP TABLE IF EXISTS incidencias CASCADE;
CREATE TABLE incidencias (
    id SERIAL PRIMARY KEY,
    parking_id INTEGER NOT NULL REFERENCES estacionamientos(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    user_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    description TEXT NOT NULL,
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'in_progress', 'resolved')),
    resolution_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_incidencias_parking_id ON incidencias(parking_id);
CREATE INDEX idx_incidencias_status ON incidencias(status);

-- =============================================================================
-- 2. DATOS DE PRUEBA INICIALES (SEED DEMO DATA)
-- =============================================================================

-- Insertar Usuarios Maestros (Passwords hasheadas con Bcrypt)
INSERT INTO usuarios (full_name, email, phone, hashed_password, security_pin, role, is_active) VALUES
('Super Administrador', 'superadmin@smartpark.com', '+51 999999999', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', '7391', 'platform', TRUE),
('Administrador Local Cochera', 'adminlocal@smartpark.com', '+51 988888888', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', '4826', 'local', TRUE),
('Conductor Demo', 'conductor@smartpark.com', '+51 987654321', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', '1234', 'user', TRUE);

-- Insertar Estacionamientos de Ayacucho
INSERT INTO estacionamientos (name, address, city, latitude, longitude, hourly_rate, tolerance_minutes, status, total_capacity, image_url) VALUES
('Estacionamiento Central Ayacucho', 'Jr. 28 de Julio 340, Huamanga', 'Ayacucho - Huamanga', -13.1606, -74.2257, 8.50, 15, 'active', 30, 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800'),
('Cochera Plaza Mayor Huamanga', 'Portal Constitución 12, Plaza de Armas', 'Ayacucho - Huamanga', -13.1612, -74.2241, 10.00, 10, 'active', 15, 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800');

-- Insertar Vehículos de Conductor Demo
INSERT INTO vehiculos (user_id, license_plate, vehicle_type, brand, model, color) VALUES
(3, 'AYC-501', 'suv', 'Toyota', 'RAV4', 'Gris Plata'),
(3, 'W3B-987', 'auto', 'Honda', 'Civic', 'Negro Noche');

-- Insertar Plazas
INSERT INTO plazas (parking_id, code, floor_level, slot_type, status, pos_x, pos_y, width, height, rotation) VALUES
(1, 'A-01', 'Piso 1', 'auto', 'free', 50, 50, 60, 100, 0),
(1, 'A-02', 'Piso 1', 'auto', 'occupied', 130, 50, 60, 100, 0),
(1, 'A-03', 'Piso 1', 'auto', 'free', 210, 50, 60, 100, 0),
(1, 'A-04', 'Piso 1', 'moto', 'free', 290, 50, 50, 60, 0);

-- Insertar Elementos Plano
INSERT INTO elementos_plano (parking_id, element_type, pos_x, pos_y, width, height, rotation, z_index) VALUES
(1, 'crosswalk', 50, 180, 300, 60, 0, 2),
(1, 'wall', 20, 20, 10, 300, 0, 1);

-- Insertar Personal
INSERT INTO personal (parking_id, full_name, dni, position, shift, status, email, security_pin) VALUES
(1, 'Carlos Mendoza', '72819203', 'Operador Garita LPR', 'Mañana', 'active', 'carlos@cochera.com', '1234'),
(1, 'Ana Torres', '73920192', 'Supervisora Turno', 'Tarde', 'active', 'ana@cochera.com', '5678');

-- Insertar Reseñas
INSERT INTO resenas (parking_id, user_id, user_name, rating, comment, response) VALUES
(1, 3, 'Conductor Demo', 5, 'Excelente cochera techada a pasos de la Plaza de Armas de Ayacucho. El sistema LPR abrió el portón de inmediato.', '¡Muchas gracias por su preferencia! Seguimos mejorando para el centro histórico.');

-- =============================================================================
-- FIN DEL SCRIPT POSTGRESQL SMART-PARK
-- =============================================================================
