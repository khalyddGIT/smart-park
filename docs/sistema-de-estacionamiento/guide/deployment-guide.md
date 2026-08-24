# Guía de Despliegue y Operación - Smart-Park

## 1. Requisitos Previos
- **Node.js:** Versión 18.x o superior.
- **Python:** Versión 3.10 o 3.11.
- **Docker & Docker Compose:** (Opcional para despliegue contenerizado).

---

## 2. Puesta en Marcha en Desarrollo Local

### 2.1. Iniciar el Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Endpoint API: `http://127.0.0.1:8000/`
- Documentación Interactiva Swagger: `http://127.0.0.1:8000/docs`

### 2.2. Iniciar el Servidor WebSocket
```bash
node server/ws-server.js
```
- WebSocket URL: `ws://localhost:8080`

### 2.3. Iniciar el Frontend (React 19 + Vite)
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 3000
```
- Aplicación Web: `http://127.0.0.1:3000`

---

## 3. Despliegue con Docker Compose
```bash
docker-compose up --build -d
```
Servicios levantados:
- `backend`: Contenedor FastAPI en puerto `8000`.
- `frontend`: Servidor Nginx / Vite en puerto `3000`.
- `ws_server`: Gateway WebSocket en puerto `8080`.
- `db`: Base de datos PostgreSQL en puerto `5432`.
