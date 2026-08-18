-- ==========================================================
-- SMART-PARK: DATOS SEMILLA (SEED DATA) PARA HUAMANGA - AYACUCHO
-- ==========================================================

-- 1. Usuarios Principales
INSERT INTO users (id, email, full_name, hashed_password, phone, role)
VALUES 
(1, 'superadmin@smartpark.pe', 'Carlos Mendoza (SuperAdmin)', '$2b$12$e8Y...hash', '+51966112233', 'superadmin'),
(2, 'admin.ayacucho@smartpark.pe', 'Elena Ramos (Admin Local Plaza Mayor)', '$2b$12$e8Y...hash', '+51966445566', 'local'),
(3, 'conductor1@gmail.com', 'Juan Quispe (Conductor)', '$2b$12$e8Y...hash', '+51988776655', 'user')
ON CONFLICT (id) DO NOTHING;

-- 2. Vehículos
INSERT INTO vehicles (id, user_id, plate, brand, model, color, vehicle_type, is_primary)
VALUES
(1, 3, 'ABC-123', 'Toyota', 'Corolla', 'Blanco', 'auto', TRUE),
(2, 3, 'XYZ-789', 'Hyundai', 'Tucson', 'Gris', 'auto', FALSE),
(3, 3, 'AYC-501', 'Honda', 'Civic', 'Negro', 'auto', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 3. Estacionamientos en Ayacucho
INSERT INTO parkings (id, owner_id, name, slug, address, city, latitude, longitude, hourly_rate, lot_shape)
VALUES
(1, 2, 'Smart Park Plaza Mayor Ayacucho', 'smart-park-plaza-mayor', 'Portal Unión 42, Centro Histórico', 'Ayacucho - Huamanga', -13.1631, -74.2236, 5.00, 'l_shape'),
(2, 2, 'Estacionamiento 28 de Julio', 'estacionamiento-28-de-julio', 'Jr. 28 de Julio 350', 'Ayacucho - Huamanga', -13.1605, -74.2250, 4.50, 'diagonal'),
(3, 2, 'Cochera Mariscal Cáceres', 'cochera-mariscal-caceres', 'Av. Mariscal Cáceres 780', 'Ayacucho - Huamanga', -13.1650, -74.2210, 4.00, 'u_shape')
ON CONFLICT (id) DO NOTHING;
