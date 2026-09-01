# Estrategia de Negocio: Roles Empresariales, Modelos de Reserva y Protección Financiera

Este documento formaliza las definiciones de negocio, arquitectura de roles comerciales y políticas de monetización y resiliencia financiera para la plataforma **Smart-Park**.

---

## 1. Roles Estratégicos de Negocio (Expansión Comercial)

Para escalar la plataforma desde una solución de cocheras individuales hacia un ecosistema empresarial y corporativo, se definen los siguientes roles funcionales:

```
                               ┌──────────────────────────────────────────────┐
                               │           Super Admin (Plataforma)           │
                               └───────┬──────────────────────────────┬───────┘
                                       │                              │
                   ┌───────────────────┴───────────────┐              │
                   ▼                                   ▼              ▼
     ┌───────────────────────────┐       ┌───────────────────────────┐ ┌───────────────────────────┐
     │  Gestor Flotas B2B        │       │  Auditor Contable/SUNAT   │ │  Helpdesk / Soporte 24/7  │
     │  (Empresas, Taxis, RUC)   │       │  (SIRE, Libros, Bancos)   │ │  (Reembolsos, Incidencias)│
     └─────────────┬─────────────┘       └───────────────────────────┘ └───────────────────────────┘
                   │
                   ▼
     ┌───────────────────────────┐       ┌───────────────────────────┐ ┌───────────────────────────┐
     │  Admin Local (Cochera)    │──────▶│  Supervisor de Campo      │ │  Operador Garita / Valet  │
     │  (Tarifas, Planos CAD)    │       │  (Inspección de Hardware) │ │  (Walk-in, ANPR, Llaves)  │
     └───────────────────────────┘       └───────────────────────────┘ └───────────────────────────┘
```

### A. Gestor de Flotas Corporativas (`b2b_fleet_manager`)
* **Objetivo:** Abrir líneas de ingreso B2B con empresas de distribución, flotas de taxis, entidades bancarias y entidades públicas.
* **Capacidades del Rol:**
  * Registro de bolsas de vehículos y conductores bajo una sola razón social (RUC).
  * Facturación mensual consolidada (1 sola factura fiscal al cierre de mes por el consumo total de la flota).
  * Asignación de saldo prepago o línea de crédito corporativo para evitar desembolsos en efectivo por los choferes.
  * Reserva recurrente de cajones fijos para personal clave.

### B. Auditor Contable y Fiscal (`fiscal_auditor`)
* **Objetivo:** Gestión tributaria transparente sin acceso a configuraciones técnicas u operativas de cocheras.
* **Capacidades del Rol:**
  * Acceso de solo lectura al módulo de facturación electrónica (CPE) y liquidaciones bancarias.
  * Exportación de libros de compras/ventas compatibles con los sistemas SIRE y PLE de SUNAT.
  * Conciliación automática entre las recaudaciones de las pasarelas (Culqi, PayPal, Yape) y las transferencias quincenales vía CCI a los dueños de cocheras.

### C. Agente de Soporte y Atención al Conductor (`customer_support`)
* **Objetivo:** Resolución de incidentes en tiempo real sin requerir escalamiento al Super Administrador.
* **Capacidades del Rol:**
  * Corrección en caliente de placas digitadas con error por conductores.
  * Extensión manual de tolerancia ante congestión vehicular severa en el centro de Ayacucho.
  * Emisión de reembolsos directos a la billetera digital Smart-Park según la política de cancelación.

### D. Supervisor de Campo e Inspección (`field_supervisor`)
* **Objetivo:** Asegurar la calidad operativa del hardware en las playas afiliadas.
* **Capacidades del Rol:**
  * Inspección presencial y certificación de cámaras ANPR, ángulos de visión y barreras electromecánicas.
  * Levantamiento y verificación física de las dimensiones del terreno antes de aprobar la afiliación de una nueva cochera.
  * Resolución de disputas por siniestros físicos (daños a vehículos, rayones o invasión de cajones).

### E. Asistente de Valet Parking (`valet_operator`)
* **Objetivo:** Cocheras céntricas de alta rotación donde se deja la llave para acomodar vehículos en doble fila.
* **Capacidades del Rol:**
  * Registro fotográfico del estado visual del auto al ingresar (protección legal ante reclamos previos).
  * Asignación y control de casilleros de llaves numerados.
  * Notificación automática al conductor: *"Tu vehículo está listo en la puerta de salida"*.

---

## 2. Modelos de Cobro al Reservar (Análisis Estratégico)

Cobrar o no cobrar al momento de reservar depende del equilibrio entre **captación de usuarios** y **protección de inventario**:

| Modelo | Mecánica | Ventajas | Desventajas | Escenario Recomendado |
| :--- | :--- | :--- | :--- | :--- |
| **1. Reserva Gratuita (Post-Pago)** | El conductor aparta su sitio solo con su placa. Paga el 100% de la estadía al salir (efectivo, Yape o app). | • Cero fricción de adopción.<br>• Crecimiento viral rápido. | Mayor probabilidad de cancelaciones de última hora o abandono de reserva. | Etapa de lanzamiento, días de baja demanda y cocheras periféricas. |
| **2. Garantía sin Cobro Inmediato (Pre-Auth)** | Se valida la tarjeta o billetera digital a S/ 0.00. Solo se debita si el usuario cancela fuera de tiempo o no llega. | • El usuario no siente cobro adelantado.<br>• La cochera tiene respaldo financiero. | Requiere que el usuario ingrese un método de pago digital. | Cocheras del Centro Histórico y conductores habituales. |
| **3. Pre-Pago Completo (Pre-Paid)** | El conductor abona las horas estimadas (ej. 2 horas = S/ 10.00) antes de llegar. | • Ingreso 100% garantizado.<br>• Cero riesgo de pérdida por no-show. | Mayor reticencia en conductores que no saben cuánto durará su trámite. | Eventos de alta demanda (Semana Santa, Fiestas Patrias, conciertos). |
| **4. Modelo Híbrido Inteligente (Recomendado)** | **Dinámico:** Gratuito en horas valle y con garantía/prepago en horas punta o cocheras con más del 80% de ocupación. | • Maximiza la ocupación en todo momento.<br>• Protege el ingreso en momentos críticos. | Requiere reglas automatizadas en backend. | **Ecosistema definitivo de Smart-Park.** |

---

## 3. Mecanismos de Protección Financiera contra Cancelaciones Tardías

Para evitar que las cocheras pierdan dinero por cajones bloqueados que luego son cancelados a última hora, se establecen las siguientes directrices:

### A. Política de Cancelación Escalonada
* **Más de 60 minutos antes:** Cancelación libre (100% de reintegro en crédito de la app).
* **Entre 30 y 60 minutos antes:** Penalidad del 30% al 50% de la primera hora por retención de inventario.
* **Menos de 30 minutos o No-Show:** Cobro del 100% de la primera hora.
* **Distribución del cobro por penalidad:**
  * **85% para el dueño de la cochera** (compensación directa por el cajón no aprovechado).
  * **15% para Smart-Park** (comisión estándar de la plataforma).

### B. Vencimiento Estricto de Tolerancia y Re-liberación Automática
* Al cumplirse los 15 minutos de gracia sin que la cámara OpenCV detecte la placa ingresando, el sistema ejecuta automáticamente:
  1. Cambio de estado de la reserva a `EXPIRED_NO_SHOW`.
  2. Cobro de la penalidad configurada.
  3. **Re-liberación inmediata del cajón en el mapa 3D** para conductores en tránsito.
  4. Disparo de notificación push a conductores en lista de espera en un radio de 500 metros.

### C. Índice de Confiabilidad del Conductor (*Driver Trust Score*)
* Sistema de reputación de 0 a 100 puntos:
  * **Conductor Platino (90-100 pts):** Acceso a reservas instantáneas sin necesidad de ingresar tarjeta previa.
  * **Conductor Estándar (70-89 pts):** Aplican políticas estándar de cancelación.
  * **Conductor de Alto Riesgo (<70 pts):** Con cancelaciones recurrentes; el sistema le bloquea las reservas en horas punta y le exige **pago anticipado 100% no reembolsable**.

### D. Reembolso en Crédito de Billetera (*Smart-Park Wallet*)
* Todo reembolso por cancelaciones válidas se acredita instantáneamente como saldo a favor en la cuenta del usuario.
* **Beneficio Financiero:**
  * Elimina costos de comisión bancaria por extornos de tarjeta.
  * Asegura que el capital permanece dentro del flujo de caja de la empresa.
  * Retiene al usuario para su siguiente consumo.

---

## 4. Hoja de Ruta para su Implementación

1. **Fase 1 (Incentivo y Expansión):** Mantener el modelo gratuito con tolerancia de 15 minutos para maximizar la base de usuarios en Ayacucho.
2. **Fase 2 (Activación de Garantías):** Incorporar la validación de métodos de pago y el sistema de puntaje de reputación del conductor.
3. **Fase 3 (Línea B2B & Flotas):** Habilitar el portal corporativo para empresas con facturación mensual consolidada y auditoría contable SIRE/SUNAT.
