# ---------- Stage 1: Build frontend (Vite) ----------
FROM node:20-alpine AS frontend-build

WORKDIR /build

ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ARG VITE_PAYPAL_CLIENT_ID
ENV VITE_PAYPAL_CLIENT_ID=$VITE_PAYPAL_CLIENT_ID
ARG VITE_CULQI_PUBLIC_KEY
ENV VITE_CULQI_PUBLIC_KEY=$VITE_CULQI_PUBLIC_KEY
ARG VITE_MAPBOX_TOKEN
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN


COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: Backend FastAPI + estáticos ----------
FROM python:3.11-slim

# Dependencias del sistema para OpenCV (detección de ocupación por cajón)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY --from=frontend-build /build/dist ./static

ENV STATIC_DIR=/app/static
# En Railway el filesystem es efímero: monta un Volume en /data y define
# UPLOADS_DIR=/data/uploads para que las fotos no se borren en cada deploy.
ENV UPLOADS_DIR=/data/uploads
RUN mkdir -p /data/uploads
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
