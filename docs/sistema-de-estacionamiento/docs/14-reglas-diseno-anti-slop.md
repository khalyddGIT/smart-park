# Reglas de Diseño del Sistema: Estándar Anti-Slop y UI Directa

Este documento establece la normativa obligatoria de diseño visual y de experiencia de usuario (UI/UX) para todos los módulos de **Smart-Park**.

---

## 1. Principio Fundamental Anti-Slop

> **Regla de Oro:** Todo elemento en pantalla debe cumplir una función operativa clara o comunicar información indispensable. Se prohíbe el uso de adornos genéricos, badges decorativos, micro-etiquetas de relleno y efectos propios de plantillas generadas por IA.

---

## 2. Elementos Prohibidos (Banned UI Patterns)

1. **Micro-eyebrows y textos decorativos:**
   - ❌ `⚡ RESERVA RÁPIDA`, `● ABIERTO 24/7`, `S/ 0.00 HOY`, `AHORRA 10%`, `+5% BONUS`, `CRÉDITO RUC`.
   - ❌ Slogans publicitarios de relleno ("Garantía Smart-Park", "Reserva blindada al 100%").

2. **Badges y pastillas innecesarias:**
   - ❌ Pastillas flotantes tipo `ACTIVO`, `AUTORIZADO`, `TECHADO`, `PREPAGO (-10%)` en títulos o modales.
   - ❌ Etiquetas duplicadas que repiten lo que el texto principal ya indica.

3. **Gamificación artificial y falsos trofeos:**
   - ❌ Banners de nivel de usuario con medallas ficticias (`🎖️ Conductor Platino 98 pts`).
   - ❌ Puntuaciones arbitrarias de confianza que no provienen de un backend transaccional.

4. **Animaciones de distracción visual:**
   - ❌ Puntos parpadeantes o pulsantes (`animate-ping`, `animate-pulse` decorativo).
   - ❌ Gradientes llamativos o brillos artificiales alrededor de botones comunes.

5. **Contadores redundantes:**
   - ❌ Múltiples micro-contadores numéricos dispersos en un mismo bloque de navegación.

---

## 3. Estándar de Diseño Permitido y Requerido

1. **Tipografía sobria y directa:**
   - Textos concisos, limpios y con jerarquía clara (título principal, subtítulo de ubicación/estado, datos en monospace cuando sean códigos/placas).

2. **Acciones y botones orientados a la tarea:**
   - Botones con verbos directos: `Confirmar Reserva`, `Pagar`, `Pase QR`, `Imprimir`, `Cerrar`.

3. **Plano 2D Cenital Fiel:**
   - Vista cenital ortogonal plana (sin inclinaciones isométricas).
   - Siluetas vectoriales de vehículos en top-down realistas con placa visible.
   - Textura asfáltica sobria con líneas termoplásticas reglamentarias.

4. **Formatos y Precios Transparentes:**
   - Precios en soles peruanos (`S/ 0.00`) con desglose claro (Subtotal, IGV 18%, Descuento, Total).
