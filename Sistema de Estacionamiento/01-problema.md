# 01 → Documentación del Problema y Visión General

## Idea del Sistema
**Smart Park** es una plataforma integral de gestión inteligente de estacionamientos que conecta conductores con establecimientos de parqueo. Automatiza la búsqueda y geolocalización, reserva en tiempo real con plano interactivo 2D, cobro automático, reconocimiento de placas (ANPR/LPR), control de barreras en garita, visión artificial y administración centralizada multi-rol.

---

## Problema
1. **Pérdida de tiempo y tráfico urbano:** Los conductores pierden en promedio entre 15 y 20 minutos buscando estacionamiento en zonas de alta congestión.
2. **Falta de visibilidad y previsibilidad:** Incertidumbre sobre tarifas, disponibilidad en tiempo real y características del espacio (techado, vigilancia, carga EV, PMR).
3. **Procesos manuales e ineficientes en garita:** Emisión de tickets físicos de papel, colas de cobro manual al salir y riesgo de pérdida de tickets.
4. **Falta de herramientas de gestión moderna para locales:** Administradores de parqueo sin métricas de afluencia, ocupación en tiempo real, mapas dinámicos configurables ni automatización ANPR.

---

## Solución Propuesta
Plataforma SaaS Multi-Perfil (**Usuario Final**, **Administrador Local**, **Administrador Plataforma**) compuesta por:
- **Web App Móvil/Escritorio (React + Tailwind CSS + Vite):** Búsqueda por cercanía/tarifas, mapa interactivo, reserva sobre plano 2D, pases QR, pasarela de pago y bitácora.
- **Editor Gráfico de Planos en Canvas:** Permite al Administrador Local diseñar de forma interactiva cajones, pasos peatonales con franjas blancas, vías de circulación y muros Z-index.
- **Backend Robusto y Async (Python FastAPI + SQLAlchemy + PostgreSQL):** API RESTful con soporte WebSockets para eventos en tiempo real (ANPR, sensores de ocupación, barreras), autenticación JWT y PIN de seguridad.
- **Simulador y Módulo ANPR / Visión Computacional:** Captura automática de matrículas para validación contra reservas activas y apertura automática de talanquera.

---

## Alcance (In / Out)

### Incluido (In-Scope):
- Autenticación JWT + PIN de Seguridad de 4-6 dígitos con Keypad virtual.
- Directorio de usuarios y asignación de roles (`user`, `local`, `platform`).
- Búsqueda por distancia/filtros y visualización de disponibilidad en mapa interactivo.
- Editor interactivo de planos de parqueo (cajones, pasajes peatonales con franjas blancas, zonas PMR, rotación, capas Z).
- Reservas en tiempo real sobre plano 2D con cálculo de tarifa por franqueo/tolerancia.
- Generación de comprobante digital y pase QR.
- Simulación de reconocimiento ANPR/LPR y control de barrera.
- Panel de control en garita para registro manual, precobro y tickets.
- Central de notificaciones en tiempo real, historial de movimientos y exportación CSV.
- Dashboard de analítica y KPIs para Administradores de Local y Plataforma.

### Excluido (Out-of-Scope para Fase 1):
- Integración física directa con marcas propietarias de hardware industrial (p. ej. cámaras Hikvision/Dahua mediante SDK binario cerrado C++). Se implementa mediante emulador WebSockets/API REST de eventos.
- Procesamiento bancario real con adquirentes (se utiliza pasarela simulada con simulación de tarjetas, Yape/Plin).

---

## Usuarios y Público Objetivo
1. **Conductores / Usuarios Finales (`user`):** Personas que buscan aparcar de forma rápida, transparente y segura con pago digital.
2. **Administradores / Operadores Locales (`local`):** Dueños y personal de garita de establecimientos comerciales o parqueos privados que requieren control de afluencia, planos de cajones y facturación.
3. **Administradores de Plataforma (`platform`):** Operadores globales del SaaS que gestionan afiliados, comisiones, tarifas de red y usuarios globales.

---

## Stack Tecnológico Elegido
- **Backend:** Python 3.11+ / FastAPI / Uvicorn (Arquitectura Limpia & Asíncrona).
- **Base de Datos:** PostgreSQL 15+ / SQLAlchemy ORM 2.0 / Alembic.
- **Frontend:** React 18+ / Vite / Tailwind CSS / Lucide Icons / Canvas API.
- **Comunicación en vivo:** WebSockets nativos FastAPI + React Hooks.
- **Contenedorización:** Docker & Docker Compose.

---

## Definición de Éxito
- Reducción del tiempo medio de acceso al estacionamiento a menos de 2 minutos mediante reservas QR / ANPR.
- Renderizado interactivo de planos a 60 FPS sin latencia.
- Liquidación exacta de tarifas aplicando tolerancias y cupones de descuento.
- Disponibilidad del servicio del 99.9% con arquitectura desacoplada.
