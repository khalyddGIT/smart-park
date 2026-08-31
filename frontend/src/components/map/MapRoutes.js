// Módulo Avanzado de Rutas 3D, GPS en Tiempo Real, Turn-by-Turn y AnimaciónNeón en Mapbox GL JS v3

import { MAPBOX_TOKEN } from './mapConfig';

export class MapRoutesManager {
  constructor(map) {
    this.map = map;
    this.routeSourceId = 'mapbox-3d-route-source';
    this.routeLayerId = 'mapbox-3d-route-layer';
    this.pulseLayerId = 'mapbox-3d-route-pulse';
    this.vehicleMarker = null;
    this.userGpsMarker = null;
    this.watchId = null;
    this.animFrameId = null;
    this.dashOffset = 0;
    this.dashAnimationId = null;
  }

  // Trazar ruta 3D interactiva con Turn-by-Turn e instrucciones usando Mapbox Directions API
  async drawRoute(originLngLat, destLngLat, destName, profile = 'driving') {
    if (!this.map) return null;

    try {
      const mode = profile === 'walking' ? 'walking' : (profile === 'cycling' ? 'cycling' : 'driving');
      const url = `https://api.mapbox.com/directions/v5/mapbox/${mode}/${originLngLat[0]},${originLngLat[1]};${destLngLat[0]},${destLngLat[1]}?geometries=geojson&steps=true&overview=full&language=es&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.routes || !data.routes[0]) return null;
      const route = data.routes[0];
      const geojson = {
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      };

      this.clearRoute();

      // Agregar fuente GeoJSON de la ruta
      this.map.addSource(this.routeSourceId, {
        type: 'geojson',
        data: geojson
      });

      // Capa 1: Sombra de fondo (Glow Casing)
      this.map.addLayer({
        id: `${this.routeLayerId}-casing`,
        type: 'line',
        source: this.routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#0284c7',
          'line-width': 12,
          'line-opacity': 0.4
        }
      });

      // Capa 2: Ruta Turquesa Neón Principal 3D
      this.map.addLayer({
        id: this.routeLayerId,
        type: 'line',
        source: this.routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#06b6d4',
          'line-width': 6,
          'line-opacity': 0.95
        }
      });

      // Capa 3: Pulso de luz Neón animado (Dash Array Flow)
      this.map.addLayer({
        id: this.pulseLayerId,
        type: 'line',
        source: this.routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 3,
          'line-dasharray': [0, 2, 2],
          'line-opacity': 0.9
        }
      });

      this.startPulseAnimation();

      // Extraer maniobras y pasos Turn-by-Turn
      const steps = (route.legs[0]?.steps || []).map(s => ({
        instruction: s.maneuver?.instruction || 'Sigue la ruta principal',
        distance: Math.round(s.distance || 0),
        type: s.maneuver?.type || 'straight',
        modifier: s.maneuver?.modifier || 'straight',
        location: s.maneuver?.location || originLngLat
      }));

      // Animar vehículo recorriendo el camino
      const coords = route.geometry.coordinates;
      this.animateVehicleOnRoute(coords);

      const distanceKm = (route.distance / 1000).toFixed(1);
      const durationMin = Math.max(1, Math.round(route.duration / 60));

      return {
        destinationName: destName,
        distanceKm,
        durationMin,
        steps,
        currentStep: steps[0] || { instruction: 'Avanza hacia la cochera', distance: 100 },
        coordinates: coords,
        profile
      };
    } catch (err) {
      console.warn('Mapbox 3D directions error:', err);
      return null;
    }
  }

  // Animación de pulso continuo sobre la polilínea 3D
  startPulseAnimation() {
    if (this.dashAnimationId) cancelAnimationFrame(this.dashAnimationId);

    const animateDash = () => {
      if (!this.map || !this.map.getLayer(this.pulseLayerId)) return;
      this.dashOffset = (this.dashOffset + 0.15) % 4;
      try {
        this.map.setPaintProperty(this.pulseLayerId, 'line-dasharray', [this.dashOffset, 2, 2]);
      } catch (e) {}
      this.dashAnimationId = requestAnimationFrame(animateDash);
    };

    animateDash();
  }

  // Activar seguimiento GPS en tiempo real del conductor (HTML5 Geolocation watchPosition)
  startRealtimeTracking(destLngLat, destName, onLocationUpdate) {
    this.stopRealtimeTracking();

    if (!navigator.geolocation) return;

    const mapboxgl = window.mapboxgl;

    this.watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const userLngLat = [pos.coords.longitude, pos.coords.latitude];

        // Crear/Actualizar marcador de usuario en vivo con pulso de GPS
        if (!this.userGpsMarker && mapboxgl && this.map) {
          const el = document.createElement('div');
          el.className = 'user-gps-live-pin';
          el.innerHTML = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <span style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: #10b981; opacity: 0.4; animation: ping 1.5s infinite;"></span>
              <div style="width: 16px; height: 16px; background: #059669; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.5);"></div>
            </div>
          `;
          this.userGpsMarker = new mapboxgl.Marker({ element: el })
            .setLngLat(userLngLat)
            .addTo(this.map);
        } else if (this.userGpsMarker) {
          this.userGpsMarker.setLngLat(userLngLat);
        }

        // Trazar/Actualizar la ruta desde las coordenadas GPS en tiempo real
        const routeData = await this.drawRoute(userLngLat, destLngLat, destName);
        if (onLocationUpdate && routeData) {
          onLocationUpdate({ ...routeData, userCoords: userLngLat });
        }
      },
      (err) => {
        console.warn('GPS Realtime error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }

  stopRealtimeTracking() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.userGpsMarker) {
      this.userGpsMarker.remove();
      this.userGpsMarker = null;
    }
  }

  // Animación del vehículo moviéndose por la ruta 3D con icono SVG vectorial
  animateVehicleOnRoute(coords) {
    if (!this.map || !coords || coords.length < 2) return;

    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) return;

    if (!this.vehicleMarker) {
      const el = document.createElement('div');
      el.className = 'vehicle-3d-marker shadow-2xl';
      el.innerHTML = `
        <div style="background: #0f172a; color: #38bdf8; padding: 6px; border-radius: 50%; border: 2px solid #06b6d4; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.6);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
      `;
      this.vehicleMarker = new mapboxgl.Marker({ element: el })
        .setLngLat(coords[0])
        .addTo(this.map);
    } else {
      this.vehicleMarker.setLngLat(coords[0]);
    }

    let step = 0;
    const totalSteps = coords.length;

    const animateStep = () => {
      if (step >= totalSteps) step = 0;
      const targetPos = coords[step];
      this.vehicleMarker.setLngLat(targetPos);
      step++;
      this.animFrameId = setTimeout(animateStep, 180);
    };

    animateStep();
  }

  clearRoute() {
    this.stopRealtimeTracking();

    if (!this.map) return;

    if (this.dashAnimationId) {
      cancelAnimationFrame(this.dashAnimationId);
      this.dashAnimationId = null;
    }

    if (this.animFrameId) {
      clearTimeout(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.vehicleMarker) {
      this.vehicleMarker.remove();
      this.vehicleMarker = null;
    }

    if (this.map.getLayer(this.pulseLayerId)) {
      this.map.removeLayer(this.pulseLayerId);
    }
    if (this.map.getLayer(this.routeLayerId)) {
      this.map.removeLayer(this.routeLayerId);
    }
    if (this.map.getLayer(`${this.routeLayerId}-casing`)) {
      this.map.removeLayer(`${this.routeLayerId}-casing`);
    }
    if (this.map.getSource(this.routeSourceId)) {
      this.map.removeSource(this.routeSourceId);
    }
  }
}
