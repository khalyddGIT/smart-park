# 🚀 Guía de Despliegue en Railway — Smart-Park

Esta guía detalla los pasos sencillos para desplegar la plataforma **Smart-Park** en producción utilizando **Railway** ([railway.app](https://railway.app)).

---

## 🏗️ Arquitectura de Despliegue Unificado

La plataforma utiliza una arquitectura contenerizada eficiente (Multi-Stage Docker) que empaqueta:
1. **Frontend (React 19 + Vite)**: Compilado estáticamente.
2. **Backend (FastAPI RESTful + SQLAlchemy)**: Servidor de alto rendimiento en Python 3.11.
3. **Base de Datos PostgreSQL (Railway Database Plugin)**: Persistencia relacional de usuarios, cocheras, plazas, reservas, personal e incidencias.

---

## 📋 Pasos para Desplegar en Railway

### Paso 1: Conectar el Repositorio a Railway
1. Ingresa a tu panel de [Railway.app](https://railway.app) y haz clic en **"New Project"**.
2. Selecciona **"Deploy from GitHub repo"** y elige tu repositorio `khalyddGIT/smart-park`.

### Paso 2: Agregar la Base de Datos PostgreSQL
1. Dentro de tu proyecto en Railway, haz clic en **"+ New"** ➔ **"Database"** ➔ **"Add PostgreSQL"**.
2. Railway creará una base de datos PostgreSQL dedicada y generará automáticamente la variable de entorno `DATABASE_URL`.

### Paso 3: Conectar el Servicio Web con PostgreSQL
1. En el servicio de tu aplicación web, ve a la pestaña **"Variables"**.
2. Haz clic en **"Add Reference Variable"** o añade:
   - `DATABASE_URL` ➔ `${{Postgres.DATABASE_URL}}`
   - `SECRET_KEY` ➔ `tu_clave_secreta_jwt_produccion_2026`
   - `PORT` ➔ `8000` (Railway asigna dinámicamente este puerto).

### Paso 4: Despliegue Automático
1. Railway detectará automáticamente el archivo [railway.json](file:///d:/Escritorio/smart%20park/smart-park/railway.json) y ejecutará la construcción del [Dockerfile](file:///d:/Escritorio/smart%20park/smart-park/Dockerfile).
2. En 2-3 minutos tu aplicación estará en vivo con HTTPS dominio automático proporcionado por Railway (ej. `https://smart-park-production.up.railway.app`).

---

## 🛠️ Variables de Entorno Recomendadas en Railway:

| Variable | Valor | Descripción |
| :--- | :--- | :--- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Conexión directa a PostgreSQL relacional |
| `SECRET_KEY` | *(Cadena aleatoria segura)* | Clave para firmado de Tokens JWT |
| `ALGORITHM` | `HS256` | Algoritmo de cifrado JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Expiración del Token (24 Horas) |

---

## 🟢 Verificación Post-Despliegue
- **Aplicación Web SPA:** `https://tu-app.up.railway.app/`
- **Swagger Docs API:** `https://tu-app.up.railway.app/docs`
- **Healthcheck:** `https://tu-app.up.railway.app/`
