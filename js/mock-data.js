/* ============================================================
   SMART-PARK — mock-data.js
   Todos los datos simulados en memoria
   Locales en Huamanga, Ayacucho (coordenadas reales)
   ============================================================ */

window.mockData = {
  // ── USUARIOS ─────────────────────────────────────────────
  users: [
    { id: 1, name: 'Juan Delgado', email: 'juan.delgado@email.com', role: 'user', avatar: 'JD', phone: '966123456', registered: '2025-03-15' },
    { id: 2, name: 'Carlos Mendoza', email: 'carlos@ecoparking.pe', role: 'local', avatar: 'CM', phone: '966789012', registered: '2024-11-01', localId: 1 },
    { id: 3, name: 'María López', email: 'maria@smartpark.pe', role: 'platform', avatar: 'ML', phone: '966345678', registered: '2024-06-10' },
    { id: 4, name: 'Pedro Sánchez', email: 'pedro@greenpark.pe', role: 'local', avatar: 'PS', phone: '966456789', registered: '2025-01-20', localId: 3 },
    { id: 5, name: 'Ana Quispe', email: 'ana.quispe@email.com', role: 'user', avatar: 'AQ', phone: '966567890', registered: '2025-06-01' },
    { id: 6, name: 'admin', email: 'admin@smartpark.com', role: 'platform', avatar: 'AD', phone: '966000000', registered: '2024-01-01' }
  ],

  // ── PERSONAL / TRABAJADORES DE LOCALES ──────────────────
  staff: [
    { id: 1, localId: 1, name: 'Luis Torres', role: 'Guardia de Seguridad', phone: '966101010', email: 'luis@ecoparking.pe', dni: '41234567', shift: 'Mañana', status: 'activo', hired: '2024-11-15', avatar: 'LT' },
    { id: 2, localId: 1, name: 'María Rojas', role: 'Supervisor', phone: '966202020', email: 'maria.r@ecoparking.pe', dni: '42345678', shift: 'Tarde', status: 'activo', hired: '2024-12-01', avatar: 'MR' },
    { id: 3, localId: 1, name: 'José Huamán', role: 'Cajero', phone: '966303030', email: 'jose@ecoparking.pe', dni: '43456789', shift: 'Noche', status: 'activo', hired: '2025-02-20', avatar: 'JH' },
    { id: 4, localId: 3, name: 'Luis Palomino', role: 'Guardia de Seguridad', phone: '966404040', email: 'luis.p@greenpark.pe', dni: '44567890', shift: 'Mañana', status: 'activo', hired: '2025-03-10', avatar: 'LP' },
    { id: 5, localId: 1, name: 'Rosa Ventura', role: 'Guardia de Seguridad', phone: '966505050', email: 'rosa@ecoparking.pe', dni: '45678901', shift: 'Tarde', status: 'inactivo', hired: '2025-05-05', avatar: 'RV' }
  ],

  currentUser: null,

  // ── LOCALES AFILIADOS (Huamanga, Ayacucho) ───────────────
  // RF11 — 5+ locales
  locales: [
    {
      id: 1,
      name: 'EcoParking Central',
      address: 'Jr. 28 de Julio 250, Huamanga',
      lat: -13.1588,
      lng: -74.2232,
      status: 'Activo',
      schedule: '06:00 - 23:00',
      tolerance: 30,
      payRequired: true,
      payAmount: 2.00,
      camera: true,
      ia: true,
      techCam: true,
      techRoof: true,
      techNet: true,
      admin: 'Carlos Mendoza',
      adminId: 2,
      rating: 4.8,
      totalSpaces: 8,
      distance: 0.5,
      tarifas: [
        { vehiculo: 'Automóvil', hora: 2.50, minuto: 0.05, reserva: 2.00 },
        { vehiculo: 'Motocicleta', hora: 1.00, minuto: 0.02, reserva: 1.00 },
        { vehiculo: 'Camioneta', hora: 3.50, minuto: 0.06, reserva: 3.00 }
      ],
      image: 'img/eco_parking.webp',
      floorPlan: null
    },
    {
      id: 2,
      name: 'ParkSmart Miraflores',
      address: 'Av. Mariscal Cáceres 450, Huamanga',
      lat: -13.1545,
      lng: -74.2195,
      status: 'Activo',
      schedule: '24 horas',
      tolerance: 20,
      payRequired: false,
      payAmount: 0,
      camera: true,
      ia: false,
      techCam: true,
      techRoof: true,
      techNet: false,
      admin: 'María López',
      adminId: 3,
      rating: 4.2,
      totalSpaces: 10,
      distance: 0.8,
      tarifas: [
        { vehiculo: 'Automóvil', hora: 2.50, minuto: 0.06, reserva: 1.50 },
        { vehiculo: 'Motocicleta', hora: 1.00, minuto: 0.03, reserva: 0.50 }
      ],
      image: 'img/park_smart.webp'
    },
    {
      id: 3,
      name: 'GreenPark Universitario',
      address: 'Av. Universitaria 1200, San Juan Bautista',
      lat: -13.1692,
      lng: -74.2268,
      status: 'Activo',
      schedule: '07:00 - 22:00',
      tolerance: 25,
      payRequired: true,
      payAmount: 1.50,
      camera: false,
      ia: false,
      techCam: false,
      techRoof: true,
      techNet: true,
      admin: 'Pedro Sánchez',
      adminId: 4,
      rating: 3.8,
      totalSpaces: 8,
      distance: 1.5,
      tarifas: [
        { vehiculo: 'Automóvil', hora: 2.00, minuto: 0.05, reserva: 1.00 },
        { vehiculo: 'Motocicleta', hora: 1.00, minuto: 0.02, reserva: 0.50 }
      ],
      image: 'img/green_park.webp'
    },
    {
      id: 4,
      name: 'AutoPark Alameda',
      address: 'Jr. Grau 380, Huamanga',
      lat: -13.1610,
      lng: -74.2270,
      status: 'En revisión',
      schedule: '06:00 - 22:00',
      tolerance: 30,
      payRequired: false,
      payAmount: 0,
      camera: false,
      ia: false,
      techCam: false,
      techRoof: false,
      techNet: false,
      admin: '',
      adminId: null,
      rating: 0,
      totalSpaces: 6,
      distance: 0.5,
      tarifas: [
        { vehiculo: 'Automóvil', hora: 1.50, minuto: 0.04, reserva: 0 }
      ],
      image: 'img/park_smart.webp'
    },
    {
      id: 5,
      name: 'CityPark Libertadores',
      address: 'Av. Independencia 520, Huamanga',
      lat: -13.1565,
      lng: -74.2310,
      status: 'Inactivo',
      schedule: '08:00 - 20:00',
      tolerance: 15,
      payRequired: false,
      payAmount: 0,
      camera: false,
      ia: false,
      techCam: false,
      techRoof: false,
      techNet: false,
      admin: 'María López',
      adminId: 3,
      rating: 3.5,
      totalSpaces: 5,
      distance: 1.2,
      tarifas: [
        { vehiculo: 'Automóvil', hora: 1.50, minuto: 0.04, reserva: 0 }
      ],
      image: 'img/eco_parking.webp'
    }
  ],

  // ── ESPACIOS (distribuidos en 3 locales activos) ─────────
  // RF32 — 15+ espacios
  spaces: [
    // EcoParking Central (local 1) - 8 espacios (Align to slots 1-8 on top row)
    { id: 'A-01', localId: 1, type: 'Automóvil', status: 'available', reservable: true, x: 19, y: 19 },
    { id: 'A-02', localId: 1, type: 'Automóvil', status: 'occupied', reservable: true, plate: 'ABC-123', vehicleType: 'Automóvil', x: 25, y: 19 },
    { id: 'A-03', localId: 1, type: 'Automóvil', status: 'reserved', reservable: true, x: 31, y: 19 },
    { id: 'A-04', localId: 1, type: 'Automóvil', status: 'available', reservable: true, x: 36, y: 19 },
    { id: 'A-05', localId: 1, type: 'Camioneta', status: 'occupied', reservable: true, plate: 'XYZ-789', vehicleType: 'Camioneta', x: 42, y: 19 },
    { id: 'A-06', localId: 1, type: 'Camioneta', status: 'available', reservable: true, x: 48, y: 19 },
    { id: 'A-07', localId: 1, type: 'Motocicleta', status: 'available', reservable: true, x: 53.5, y: 19 },
    { id: 'A-08', localId: 1, type: 'Automóvil', status: 'blocked', reservable: false, blockReason: 'Mantenimiento', x: 59, y: 19 },
    // ParkSmart (local 2) - 4 espacios
    { id: 'B-01', localId: 2, type: 'Automóvil', status: 'available', reservable: true, x: 15, y: 25 },
    { id: 'B-02', localId: 2, type: 'Automóvil', status: 'occupied', reservable: true, plate: 'GHI-101', vehicleType: 'Automóvil', x: 35, y: 25 },
    { id: 'B-03', localId: 2, type: 'Automóvil', status: 'reserved', reservable: true, x: 15, y: 65 },
    { id: 'B-04', localId: 2, type: 'Motocicleta', status: 'available', reservable: true, x: 35, y: 65 },
    // GreenPark (local 3) - 4 espacios
    { id: 'C-01', localId: 3, type: 'Automóvil', status: 'available', reservable: true, x: 20, y: 30 },
    { id: 'C-02', localId: 3, type: 'Automóvil', status: 'available', reservable: true, x: 40, y: 30 },
    { id: 'C-03', localId: 3, type: 'Automóvil', status: 'occupied', reservable: true, plate: 'JKL-202', vehicleType: 'Automóvil', x: 60, y: 30 },
    { id: 'C-04', localId: 3, type: 'Motocicleta', status: 'available', reservable: true, x: 80, y: 30 }
  ],

  // ── ELEMENTOS DE DISEÑO ESTRUCTURAL (Paredes, Vías, Textos) ─────────
  designElements: [
    // Elementos pre-creados para el local 1 (EcoParking) para que el demo se vea bien
    { id: 'wall-1', localId: 1, type: 'wall', x: 50, y: 5, width: 90, height: 2, rotation: 0, color: '#333333' },
    { id: 'wall-2', localId: 1, type: 'wall', x: 5, y: 50, width: 2, height: 90, rotation: 0, color: '#333333' },
    { id: 'wall-3', localId: 1, type: 'wall', x: 95, y: 50, width: 2, height: 90, rotation: 0, color: '#333333' },
    { id: 'wall-4', localId: 1, type: 'wall', x: 50, y: 95, width: 90, height: 2, rotation: 0, color: '#333333' },
    { id: 'text-1', localId: 1, type: 'text', text: 'ENTRADA', x: 50, y: 90, rotation: 0, color: '#22c55e', fontSize: 18 }
  ],

  // ── RESERVAS ─────────────────────────────────────────────
  // RF39-RF49 — 8+ reservas en distintos estados
  reservations: [
    { id: 'RSV-001', userId: 1, localId: 1, spaceId: 'A-03', plate: 'DEF-456', vehicleType: 'Automóvil', status: 'active', code: 'SP-7842', created: '2026-08-01 14:30', arrival: '2026-08-01 15:00', toleranceMin: 30, expiresAt: '2026-08-01 15:30', payConfirm: true, payAmount: 2.00 },
    { id: 'RSV-002', userId: 5, localId: 1, spaceId: 'A-02', plate: 'ABC-123', vehicleType: 'Automóvil', status: 'occupied', code: 'SP-3291', created: '2026-08-01 10:15', arrival: '2026-08-01 10:45', toleranceMin: 30, entryTime: '2026-08-01 10:40', payConfirm: true, payAmount: 2.00 },
    { id: 'RSV-003', userId: 1, localId: 2, spaceId: 'B-03', plate: 'DEF-456', vehicleType: 'Automóvil', status: 'active', code: 'SP-5510', created: '2026-08-01 16:00', arrival: '2026-08-01 16:30', toleranceMin: 20 },
    { id: 'RSV-004', userId: 1, localId: 1, spaceId: 'A-04', plate: 'DEF-456', vehicleType: 'Automóvil', status: 'completed', code: 'SP-1187', created: '2026-07-30 09:00', arrival: '2026-07-30 09:30', entryTime: '2026-07-30 09:25', exitTime: '2026-07-30 12:30', totalPaid: 9.00 },
    { id: 'RSV-005', userId: 5, localId: 3, spaceId: 'C-03', plate: 'JKL-202', vehicleType: 'Automóvil', status: 'occupied', code: 'SP-8834', created: '2026-08-01 08:00', arrival: '2026-08-01 08:30', entryTime: '2026-08-01 08:25' },
    { id: 'RSV-006', userId: 1, localId: 1, spaceId: 'A-01', plate: 'DEF-456', vehicleType: 'Automóvil', status: 'expired', code: 'SP-2290', created: '2026-07-28 14:00', arrival: '2026-07-28 14:30', toleranceMin: 30 },
    { id: 'RSV-007', userId: 5, localId: 2, spaceId: 'B-01', plate: 'MNO-303', vehicleType: 'Automóvil', status: 'cancelled', code: 'SP-6671', created: '2026-07-29 11:00', cancelledAt: '2026-07-29 11:20' },
    { id: 'RSV-008', userId: 1, localId: 1, spaceId: 'A-06', plate: 'DEF-456', vehicleType: 'Camioneta', status: 'completed', code: 'SP-4455', created: '2026-07-25 15:00', entryTime: '2026-07-25 15:20', exitTime: '2026-07-25 18:45', totalPaid: 15.00, extended: true, extendedMin: 30, extendCost: 2.00 }
  ],

  // ── VEHÍCULOS REGISTRADOS ────────────────────────────────
  vehicles: [
    { id: 1, userId: 1, plate: 'DEF-456', type: 'Automóvil', brand: 'Toyota', model: 'Corolla', color: 'Blanco', year: 2022 },
    { id: 2, userId: 1, plate: 'PQR-789', type: 'Camioneta', brand: 'Nissan', model: 'Frontier', color: 'Negro', year: 2021 },
    { id: 3, userId: 5, plate: 'ABC-123', type: 'Automóvil', brand: 'Hyundai', model: 'Accent', color: 'Gris', year: 2023 },
    { id: 4, userId: 5, plate: 'MNO-303', type: 'Automóvil', brand: 'Kia', model: 'Rio', color: 'Rojo', year: 2020 },
    { id: 5, userId: 5, plate: 'JKL-202', type: 'Automóvil', brand: 'Suzuki', model: 'Swift', color: 'Azul', year: 2024 }
  ],

  // ── DETECCIONES DE VEHÍCULOS ─────────────────────────────
  // RF50-RF63, RF86-RF90
  detections: [
    { id: 1, localId: 1, spaceId: 'A-02', plate: 'ABC-123', confidence: 97, type: 'Automóvil', color: 'Gris', status: 'authorized', matchReservation: 'RSV-002', entryTime: '2026-08-01 10:40', exitTime: null },
    { id: 2, localId: 1, spaceId: 'A-05', plate: 'XYZ-789', confidence: 94, type: 'Camioneta', color: 'Blanco', status: 'no-reservation', entryTime: '2026-08-01 09:15', exitTime: null },
    { id: 3, localId: 3, spaceId: 'C-03', plate: 'JKL-202', confidence: 99, type: 'Automóvil', color: 'Azul', status: 'authorized', matchReservation: 'RSV-005', entryTime: '2026-08-01 08:25', exitTime: null },
    { id: 4, localId: 2, spaceId: 'B-02', plate: 'GHI-101', confidence: 91, type: 'Automóvil', color: 'Negro', status: 'no-reservation', entryTime: '2026-08-01 11:00', exitTime: null },
    { id: 5, localId: 1, spaceId: 'A-04', plate: 'DEF-456', confidence: 98, type: 'Automóvil', color: 'Blanco', status: 'authorized', matchReservation: 'RSV-004', entryTime: '2026-07-30 09:25', exitTime: '2026-07-30 12:30' },
    { id: 6, localId: 1, spaceId: 'A-06', plate: 'DEF-456', confidence: 96, type: 'Camioneta', color: 'Blanco', status: 'authorized', matchReservation: 'RSV-008', entryTime: '2026-07-25 15:20', exitTime: '2026-07-25 18:45' }
  ],

  // ── TRANSACCIONES DE PAGO ────────────────────────────────
  // RF64-RF79
  transactions: [
    { id: 'TXN-001', reservationId: 'RSV-004', userId: 1, localId: 1, type: 'parking', amount: 9.00, method: 'Tarjeta Visa', status: 'completed', date: '2026-07-30 12:35', receipt: 'REC-20260730-001' },
    { id: 'TXN-002', reservationId: 'RSV-008', userId: 1, localId: 1, type: 'parking', amount: 13.00, method: 'Yape', status: 'completed', date: '2026-07-25 18:50', receipt: 'REC-20260725-001' },
    { id: 'TXN-003', reservationId: 'RSV-008', userId: 1, localId: 1, type: 'extension', amount: 2.00, method: 'Yape', status: 'completed', date: '2026-07-25 17:15', receipt: 'REC-20260725-002' },
    { id: 'TXN-004', reservationId: 'RSV-001', userId: 1, localId: 1, type: 'confirmation', amount: 2.00, method: 'Tarjeta Visa', status: 'completed', date: '2026-08-01 14:32', receipt: 'REC-20260801-001' },
    { id: 'TXN-005', reservationId: 'RSV-002', userId: 5, localId: 1, type: 'confirmation', amount: 2.00, method: 'Plin', status: 'completed', date: '2026-08-01 10:18', receipt: 'REC-20260801-002' },
    { id: 'TXN-006', reservationId: null, userId: 1, localId: 2, type: 'parking', amount: 5.00, method: 'QR', status: 'pending', date: '2026-08-01 16:45', receipt: null }
  ],

  // ── RESEÑAS ──────────────────────────────────────────────
  // RF111-RF119
  reviews: [
    { id: 1, userId: 1, userName: 'Juan Delgado', localId: 1, rating: 5, comment: 'Excelente servicio. El sistema de reservas es muy intuitivo y la cámara IA funcionó perfectamente.', date: '2026-07-30 13:00', reservationId: 'RSV-004', response: 'Gracias Juan, nos alegra tu experiencia!', responseDate: '2026-07-30 15:00' },
    { id: 2, userId: 5, userName: 'Ana Quispe', localId: 1, rating: 4, comment: 'Muy buen estacionamiento, aunque el espacio era un poco estrecho para mi camioneta.', date: '2026-07-28 11:30', reservationId: null, response: null },
    { id: 3, userId: 1, userName: 'Juan Delgado', localId: 2, rating: 4, comment: 'Buena ubicación y precio razonable. Falta techado en algunas zonas.', date: '2026-07-26 09:15', reservationId: null, response: null },
    { id: 4, userId: 5, userName: 'Ana Quispe', localId: 3, rating: 3, comment: 'El lugar está bien pero falta implementar la tecnología de cámaras.', date: '2026-07-22 14:00', reservationId: null, response: 'Estamos trabajando en ello, gracias por tu feedback.', responseDate: '2026-07-23 09:00' },
    { id: 5, userId: 1, userName: 'Juan Delgado', localId: 1, rating: 5, comment: 'Segunda visita y sigue siendo impecable. El cobro automático es genial.', date: '2026-07-25 19:00', reservationId: 'RSV-008', response: null },
    { id: 6, userId: 5, userName: 'Ana Quispe', localId: 2, rating: 4, comment: 'Servicio 24h es muy conveniente. Buen precio.', date: '2026-07-20 22:30', reservationId: null, response: null }
  ],

  // ── NOTIFICACIONES ───────────────────────────────────────
  // RF120-RF128
  notifications: [
    { id: 1, userId: 1, type: 'reservation-expiring', title: 'Reserva por vencer', message: 'Tu reserva RSV-001 en EcoParking Central vence en 15 minutos.', date: '2026-08-01 15:15', read: false, actionModule: 'reservas', reservationId: 'RSV-001' },
    { id: 2, userId: 1, type: 'payment-confirmed', title: 'Pago confirmado', message: 'Se procesó tu pago de S/ 2.00 en EcoParking Central. Comprobante: REC-20260801-001', date: '2026-08-01 14:33', read: false, actionModule: 'pagos-electronicos', receiptId: 'REC-20260801-001' },
    { id: 3, userId: 1, type: 'vehicle-location', title: 'Ubicación de tu vehículo', message: 'Tu vehículo DEF-456 está en el espacio A-03 de EcoParking Central.', date: '2026-08-01 14:35', read: true },
    { id: 4, userId: 2, type: 'plate-discrepancy', title: 'Discrepancia de placa', message: 'La placa detectada XYZ-789 en A-05 no coincide con ninguna reserva activa.', date: '2026-08-01 09:16', read: false, actionModule: 'reconocimiento-placas' },
    { id: 5, userId: 2, type: 'no-reservation-entry', title: 'Ingreso sin reserva', message: 'El vehículo XYZ-789 ingresó al espacio A-05 sin reserva previa.', date: '2026-08-01 09:16', read: false },
    { id: 6, userId: 1, type: 'auto-release', title: 'Reserva liberada', message: 'Tu reserva RSV-006 en EcoParking Central fue liberada automáticamente por exceder el tiempo de tolerancia.', date: '2026-07-28 14:30', read: true },
    { id: 7, userId: 1, type: 'review-response', title: 'Respuesta a tu reseña', message: 'EcoParking Central respondió a tu reseña: "Gracias Juan, nos alegra tu experiencia!"', date: '2026-07-30 15:01', read: true }
  ],

  // ── HISTORIAL DE ACCESOS ─────────────────────────────────
  // RF07
  accessLog: [
    { id: 1, userId: 2, date: '2026-08-01', time: '08:00', method: 'Biométrico - Facial', result: 'Exitoso' },
    { id: 2, userId: 2, date: '2026-07-31', time: '07:55', method: 'Biométrico - Huella', result: 'Exitoso' },
    { id: 3, userId: 3, date: '2026-08-01', time: '09:00', method: 'Biométrico - Facial', result: 'Exitoso' },
    { id: 4, userId: 3, date: '2026-07-31', time: '08:45', method: 'Contraseña', result: 'Fallido' },
    { id: 5, userId: 3, date: '2026-07-31', time: '08:46', method: 'Biométrico - Facial', result: 'Exitoso' }
  ],

  // ── PROMOCIONES ──────────────────────────────────────────
  // RF69
  promotions: [
    { code: 'SMART10', discount: 10, type: 'percent', description: '10% de descuento', active: true, minAmount: 5.00 },
    { code: 'NUEVO5', discount: 5, type: 'fixed', description: 'S/ 5.00 de descuento', active: true, minAmount: 10.00 },
    { code: 'FINDE20', discount: 20, type: 'percent', description: '20% fin de semana', active: false, minAmount: 0 }
  ],

  // ── TÉRMINOS Y CONDICIONES ───────────────────────────────
  // RF129-RF135
  terms: {
    version: '2.1.0',
    lastUpdated: '2026-07-01 00:00',
    content: `<h3>1. Términos Generales</h3>
<p>Al utilizar la plataforma Smart-Park, usted acepta estos términos y condiciones en su totalidad. Smart-Park es una plataforma tecnológica que conecta usuarios con estacionamientos afiliados.</p>
<h3>2. Política de Reservas</h3>
<p>Las reservas están sujetas a disponibilidad. Cada local define su tiempo de tolerancia (entre 15 y 30 minutos). Si el usuario no llega dentro del tiempo de tolerancia, la reserva se libera automáticamente sin reembolso del pago de confirmación.</p>
<h3>3. Política de Cancelaciones</h3>
<p>El usuario puede cancelar su reserva antes del inicio del tiempo de tolerancia con reembolso completo. Cancelaciones posteriores no generan reembolso.</p>
<h3>4. Política de Privacidad</h3>
<p>Los datos personales se procesan conforme a la Ley N° 29733 de Protección de Datos Personales del Perú. Las imágenes captadas por cámaras de IA se utilizan exclusivamente para la gestión del estacionamiento.</p>
<h3>5. Pagos y Reembolsos</h3>
<p>Los pagos se procesan a través de pasarelas de pago certificadas. Los comprobantes electrónicos se emiten automáticamente y están disponibles en el historial del usuario.</p>
<h3>6. Responsabilidad</h3>
<p>Smart-Park actúa como intermediario tecnológico. La responsabilidad sobre los vehículos estacionados corresponde al administrador del local afiliado.</p>`
  },

  // ── CONFIGURACIÓN DE NOTIFICACIONES ──────────────────────
  // RF128
  notifPreferences: {
    reservationExpiring: true,
    paymentConfirmed: true,
    vehicleLocation: true,
    autoRelease: true,
    reviewResponse: true,
    promotions: false,
    emailNotif: true,
    pushNotif: true,
    smsNotif: false
  },

  // ── ESTADÍSTICAS RÁPIDAS ─────────────────────────────────
  // RF96-RF104
  stats: {
    occupancyByDay: [
      { day: 'Lun', value: 72 },
      { day: 'Mar', value: 68 },
      { day: 'Mié', value: 85 },
      { day: 'Jue', value: 78 },
      { day: 'Vie', value: 92 },
      { day: 'Sáb', value: 95 },
      { day: 'Dom', value: 45 }
    ],
    revenueByMonth: [
      { month: 'Mar', value: 2400 },
      { month: 'Abr', value: 3100 },
      { month: 'May', value: 2800 },
      { month: 'Jun', value: 3500 },
      { month: 'Jul', value: 4200 },
      { month: 'Ago', value: 1240 }
    ],
    demandHeatmap: [
      { hour: '06-08', lun: 30, mar: 25, mie: 35, jue: 28, vie: 40, sab: 20, dom: 10 },
      { hour: '08-10', lun: 75, mar: 70, mie: 80, jue: 72, vie: 85, sab: 45, dom: 20 },
      { hour: '10-12', lun: 90, mar: 85, mie: 95, jue: 88, vie: 92, sab: 70, dom: 35 },
      { hour: '12-14', lun: 85, mar: 80, mie: 88, jue: 82, vie: 90, sab: 80, dom: 45 },
      { hour: '14-16', lun: 70, mar: 65, mie: 75, jue: 68, vie: 80, sab: 75, dom: 40 },
      { hour: '16-18', lun: 80, mar: 78, mie: 82, jue: 76, vie: 88, sab: 60, dom: 30 },
      { hour: '18-20', lun: 65, mar: 60, mie: 70, jue: 62, vie: 75, sab: 50, dom: 25 },
      { hour: '20-22', lun: 40, mar: 35, mie: 45, jue: 38, vie: 55, sab: 40, dom: 15 }
    ],
    ratingHistory: [
      { month: 'Mar', value: 4.1 },
      { month: 'Abr', value: 4.2 },
      { month: 'May', value: 4.3 },
      { month: 'Jun', value: 4.4 },
      { month: 'Jul', value: 4.6 },
      { month: 'Ago', value: 4.6 }
    ]
  }
};

/* ── HELPER: obtener nombre de local por ID ─────────────── */
window.mockData.getLocalName = function(id) {
  const l = this.locales.find(l => l.id === id);
  return l ? l.name : 'Desconocido';
};

/* ── HELPER: contar espacios por estado en un local ─────── */
window.mockData.countSpaces = function(localId) {
  const spaces = this.spaces.filter(s => s.localId === localId);
  return {
    total: spaces.length,
    available: spaces.filter(s => s.status === 'available').length,
    occupied: spaces.filter(s => s.status === 'occupied').length,
    reserved: spaces.filter(s => s.status === 'reserved').length,
    blocked: spaces.filter(s => s.status === 'blocked').length
  };
};

/* ── HELPER: obtener notificaciones no leídas ───────────── */
window.mockData.getUnreadNotifications = function(userId) {
  return this.notifications.filter(n => n.userId === userId && !n.read);
};

/* ── HELPER: reservas según el rol del usuario actual ────── */
window.mockData.getReservationsByRole = function(role, onlyHistory = false) {
  const current = this.currentUser;
  let list = this.reservations;

  if (role === 'user') list = list.filter(r => r.userId === current.id);
  else if (role === 'local') list = list.filter(r => r.localId === (current.localId || 1));

  if (onlyHistory) {
    list = list.filter(r => ['completed', 'cancelled', 'expired'].includes(r.status));
  }
  return list;
};

/* ── HELPER: transacciones del usuario actual ────────────── */
window.mockData.getUserTransactions = function() {
  const current = this.currentUser;
  if (!current) return [];
  if (current.role === 'platform') return this.transactions;
  if (current.role === 'local') return this.transactions.filter(t => t.localId === (current.localId || 1));
  return this.transactions.filter(t => t.userId === current.id);
};

/* ── HELPER: local gestionado por el rol actual ──────────── */
window.mockData.getLocalConfig = function() {
  const current = this.currentUser;
  if (!current) return null;
  const localId = current.localId || 1;
  return this.locales.find(l => l.id === localId) || null;
};

/* ── HELPER: generar id numérico incremental ─────────────── */
window.mockData.nextId = function(collectionKey) {
  const col = this[collectionKey] || [];
  return col.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
};

/* ── HELPER: PERSISTENCIA EN LOCALSTORAGE ────────────── */
window.mockData.saveToStorage = function() {
  try {
    const dataToSave = {
      spaces: this.spaces,
      designElements: this.designElements,
      locales: this.locales,
      reservations: this.reservations,
      vehicles: this.vehicles,
      staff: this.staff,
      incidents: this.incidents
    };
    localStorage.setItem('smart_park_data_v1', JSON.stringify(dataToSave));
  } catch(e) {
    console.error('[Smart-Park] Error al guardar en localStorage:', e);
  }
};

window.mockData.loadFromStorage = function() {
  try {
    const saved = localStorage.getItem('smart_park_data_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.spaces && Array.isArray(parsed.spaces)) this.spaces = parsed.spaces;
      if (parsed.designElements && Array.isArray(parsed.designElements)) this.designElements = parsed.designElements;
      if (parsed.locales && Array.isArray(parsed.locales)) this.locales = parsed.locales;
      if (parsed.reservations && Array.isArray(parsed.reservations)) this.reservations = parsed.reservations;
      if (parsed.vehicles && Array.isArray(parsed.vehicles)) this.vehicles = parsed.vehicles;
      if (parsed.staff && Array.isArray(parsed.staff)) this.staff = parsed.staff;
      if (parsed.incidents && Array.isArray(parsed.incidents)) this.incidents = parsed.incidents;
    }
  } catch(e) {
    console.error('[Smart-Park] Error al cargar de localStorage:', e);
  }
};

window.mockData.resetStorage = function() {
  try {
    localStorage.removeItem('smart_park_data_v1');
    location.reload();
  } catch(e) {
    console.error('[Smart-Park] Error al reiniciar localStorage:', e);
  }
};

// Cargar estado guardado al iniciar
window.mockData.loadFromStorage();

console.log('[Smart-Park] mock-data.js loaded —', window.mockData.locales.length, 'locales,', window.mockData.spaces.length, 'spaces');
