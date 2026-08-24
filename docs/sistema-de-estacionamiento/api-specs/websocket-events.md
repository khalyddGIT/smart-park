# Protocolo de Eventos en Tiempo Real (WebSocket)

El gateway de WebSockets de **Smart-Park** opera en el puerto `8080` (`ws://localhost:8080`) o en el endpoint de FastAPI `/ws/events`.

---

## 📡 1. Esquema de Mensajes

### 1.1. Detección de Vehículo por Cámara ANPR (`ANPR_DETECTION`)
```json
{
  "event": "ANPR_DETECTION",
  "timestamp": "2026-08-15T02:00:00Z",
  "data": {
    "parking_id": 1,
    "gate_id": "GARITA-01",
    "plate": "ABC-123",
    "confidence": 0.98,
    "action": "BARRIER_OPEN_AUTHORIZED",
    "assigned_slot": "A-02"
  }
}
```

### 1.2. Actualización de Estado de Cajón (`SLOT_STATUS_UPDATE`)
```json
{
  "event": "SLOT_STATUS_UPDATE",
  "timestamp": "2026-08-15T02:00:05Z",
  "data": {
    "parking_id": 1,
    "slot_code": "A-02",
    "status": "occupied",
    "plate": "ABC-123",
    "driver": "Juan Quispe",
    "sensor_led_color": "#ef4444"
  }
}
```

### 1.3. Sincronización de Plano Arquitectónico en Vivo (`LAYOUT_UPDATED`)
```json
{
  "event": "LAYOUT_UPDATED",
  "timestamp": "2026-08-15T02:00:10Z",
  "data": {
    "parking_id": 1,
    "level": "Nivel 1 - Superficie",
    "total_slots": 26,
    "free_slots": 19,
    "lot_shape": "l_shape",
    "elements_count": 27
  }
}
```
