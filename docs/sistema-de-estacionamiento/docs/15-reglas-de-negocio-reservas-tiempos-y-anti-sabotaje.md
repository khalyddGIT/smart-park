# Reglas de Negocio: Ciclo de Vida de Reservas, Gestión de Tiempos y Políticas Anti-Sabotaje

**Código de Documento:** RN-SPK-015  
**Versión:** 1.0.0  
**Fecha:** Septiembre 2026  
**Estado:** Vigente y Aprobado  

---

## 1. Propósito y Alcance

Este documento establece las **reglas de negocio oficiales de Smart-Park** para:
1. La gestión y separación de tiempos (Tiempo de Llegada vs. Tiempo de Estadía Real).
2. El modelo de reserva libre sin fricción económica previa (Pago en Garita al Salir).
3. Las políticas de seguridad y mecanismos **anti-sabotaje** para evitar bloqueos maliciosos de plazas (*Denial of Inventory*).

---

## 2. Modelo de Tiempos en 2 Fases (Ciclo de Vida)

El sistema opera bajo una arquitectura de **relojes independientes** para garantizar que el usuario no pierda tiempo de estancia mientras viaja hacia el estacionamiento, y que la cochera no mantenga plazas bloqueadas si el conductor no se presenta.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            1. FASE DE LLEGADA                               │
│                         (Estado: SCHEDULED / EN RUTA)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ • El usuario indica su ETA (ej. 15 min).                                    │
│ • Se suma la tolerancia de la cochera (ej. 15 min).                         │
│ • La plaza queda bloqueada temporalmente en el plano.                       │
│                                                                             │
│ ┌───────────────────────────────────────┬─────────────────────────────────┐ │
│ │  CASO A: NO LLEGÓ A TIEMPO            │  CASO B: CHECK-IN A TIEMPO      │ │
│ │  • Cronómetro llega a 00:00:00.       │  • Cámara ANPR detecta placa, o │ │
│ │  • Worker ejecuta cancelación auto.   │    garita escanea pase QR.      │ │
│ │  • Estado pasa a CANCELLED.           │  • Se cierra la Fase 1.         │ │
│ │  • Cajón se LIBERA de inmediato.      │  • Pasa de inmediato a FASE 2.  │ │
│ └───────────────────────────────────────┴─────────────────────────────────┘ │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            2. FASE DE ESTADÍA REAL                          │
│                         (Estado: ACTIVE / EN CURSO)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ • El tiempo contratado (ej. 2 horas) COMIENZA a correr desde el momento del │
│   ingreso real (actual_entry).                                              │
│ • El conductor disfruta sus 2 horas completas estacionado.                  │
│ • El pase digital y la garita muestran el tiempo restante de estadía.       │
│ • Al salir: Check-out, registro de actual_exit, liquidación y estado        │
│   COMPLETED con liberación inmediata del cajón.                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Reglas Específicas de Tiempos:
* **Regla T-01 (Tolerancia de Sede):** Cada estacionamiento define su ventana de tolerancia (por defecto 15 minutos, configurable entre 5 y 30 minutos).
* **Regla T-02 (Inicio de Estadía):** Las horas reservadas **nunca se consumen en el viaje**; inician formalmente al momento del `actual_entry` (Check-in).
* **Regla T-03 (Exceso de Tiempo / Fracción):** Si el vehículo permanece más tiempo del contratado en la reserva, el sistema calcula la fracción adicional según la tarifa por hora de la sede al momento del Check-out.

---

## 3. Modelo Comercial: Reserva Libre con Pago al Salir

Para reducir la fricción del conductor y agilizar el flujo de entrada:

* **Regla C-01 (Sin Pago Obligatorio Previo):** Todo usuario registrado puede emitir su reserva y pase digital de acceso de forma gratuita (`S/ 0.00 al reservar`).
* **Regla C-02 (Modalidad Postpago):** El cobro efectivo se realiza al momento de retirar el vehículo en garita mediante efectivo, Yape, Plin, POS físico o cargo digital.
* **Regla C-03 (Emisión de Comprobante):** El comprobante fiscal (Boleta o Factura con RUC) se liquida y emite con los datos ingresados al momento de completar la estancia.

---

## 4. Políticas de Seguridad y Blindaje Anti-Sabotaje

Para evitar que usuarios maliciosos, bots o competidores desleales aparten cajones de forma masiva para perjudicar la operatividad de las cocheras:

```
                                  POLÍTICAS ANTI-SABOTAJE
 ┌───────────────────────────┬───────────────────────────┬───────────────────────────┐
 │   1. LÍMITE CONCURRENTE   │   2. CONTROL CANCELACIÓN  │    3. SCORE DE NO-SHOW    │
 ├───────────────────────────┼───────────────────────────┼───────────────────────────┤
 │ Máx. 1 reserva activa por │ Máx. 2 cancelaciones/día. │ 2 faltas consecutivas =   │
 │ usuario y por placa.      │ A la 3ª: Cooldown de 24h. │ Bloqueo de reserva libre. │
 └───────────────────────────┴───────────────────────────┴───────────────────────────┘
```

### Regla S-01: Límite de Reservas Activas Concurrentes
* Un usuario o una placa de vehículo solo puede tener **1 reserva activa a la vez** (`SCHEDULED` o `ACTIVE`).
* No es posible reservar múltiples plazas simultáneas desde la misma cuenta de conductor.

### Regla S-02: Límite de Cancelaciones y Cooldown Diario
* Un usuario tiene permitido cancelar un máximo de **2 reservas voluntarias por día**.
* Si intenta una 3ª reserva y cancelación en el mismo período de 24 horas, el sistema bloquea su capacidad de reserva por **24 horas continuas** (*Cooldown de Seguridad*).
* **Objetivo:** Impedir el bucle de "reservar ➔ esperar 14 min ➔ cancelar ➔ volver a reservar" para secuestrar una plaza indefinidamente.

### Regla S-03: Penalización por "No-Show" (Falta Injustificada)
* Se considera *No-Show* cuando un usuario reserva, vence su ventana de llegada y nunca realiza el Check-in.
* **1ª Falta:** Notificación de advertencia en el sistema.
* **2ª Falta consecutiva en 30 días:** Se suspende el beneficio de "Reserva Libre" en su cuenta. Para volver a reservar en el sistema, el usuario deberá prepagar su estadía o ingresar como cliente presencial en garita.

### Regla S-04: Auto-Cancelación Estricta por Worker
* El worker del backend (`reservation_worker.py`) audita continuamente las reservas programadas.
* Tan pronto vence la fecha límite de llegada (`start_time + tolerance_minutes`), el cajón pasa inmediatamente a estado `FREE` y se transmite en tiempo real vía WebSocket a todos los mapas activos.

### Regla S-05: Integridad de Placa y Unicidad
* Una misma placa de rodaje (`license_plate`) no puede contar con dos reservas solapadas en distintas sedes de la red Smart-Park.
* Toda reserva exige placa en formato oficial MTC (ej. `ABC-123`, `5612-4B`, `5421-3A`).

### Regla S-06: Detección de Patrones Fraudulentos / Blacklist
* Cuentas que generen reservas reiteradas con placas ficticias correlativas (`AAA-001`, `AAA-002`) o desde direcciones IP anómalas serán suspendidas de forma automática por el módulo de auditoría y seguridad.

---

## 5. Matriz de Estados de la Reserva

| Estado Inicial | Evento Desencadenante | Estado Final | Acción en el Cajón | Responsable |
| :--- | :--- | :--- | :--- | :--- |
| *Ninguno* | Usuario confirma reserva | `SCHEDULED` | Pasa a `RESERVED` | Conductor |
| `SCHEDULED` | Llega a tiempo y pasa garita | `ACTIVE` | Pasa a `OCCUPIED` | Cámara ANPR / Garita |
| `SCHEDULED` | Vence tiempo de llegada (ETA + Tol.) | `CANCELLED` | Pasa a `FREE` | Worker Automático |
| `SCHEDULED` | Usuario cancela voluntariamente | `CANCELLED` | Pasa a `FREE` | Conductor (aplica S-02) |
| `ACTIVE` | Vehículo sale de la cochera | `COMPLETED` | Pasa a `FREE` | Cámara ANPR / Garita |

---

## 6. Conclusión y Beneficio del Negocio

Este modelo equilibra la **mejor experiencia para el usuario** (reserva rápida, pago al salir y tiempo completo de estacionamiento) con la **máxima protección para el dueño del estacionamiento** (liberación rápida de espacios desatendidos y prevención activa de sabotajes).
