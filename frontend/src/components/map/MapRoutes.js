// Módulo de Rutas 3D y Animación de Vehículos en Movimiento sobre Mapbox GL JS v3

import { MAPBOX_TOKEN } from './mapConfig';

export class MapRoutesManager {
  constructor(map) {
    this.map = map;
    this.routeSourceId = 'mapbox-3d-route-source';
    this.routeLayerId = 'mapbox-3d-route-layer';
    this.vehicleMarker = null;
    this.animFrameId = null;
  }

  // Trazar ruta 3D interactiva utilizando Mapbox Directions API
  async drawRoute(originLngLat, destLngLat, destName) {
    if (!this.map) return null;

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLngLat[0]},${originLngLat[1]};${destLngLat[0]},${destLngLat[1]}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
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

      // Agregar fuente GeoJSON
      this.map.addSource(this.routeSourceId, {
        type: 'geojson',
        data: geojson
      });

      // Capa de sombra/borde de ruta 3D
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
          'line-width': 10,
          'line-opacity': 0.4
        }
      });

      // Capa principal de ruta turquesa brillante 3D
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

      // Iniciar animación del vehículo a lo largo de las coordenadas de la ruta
      const coords = route.geometry.coordinates;
      this.animateVehicleOnRoute(coords);

      const distanceKm = (route.distance / 1000).toFixed(1);
      const durationMin = Math.max(1, Math.round(route.duration / 60));

      return {
        destinationName: destName,
        distanceKm,
        durationMin,
        coordinates: coords
      };
    } catch (err) {
      console.warn('Mapbox 3D directions error:', err);
      return null;
    }
  }

  // Animación del vehículo moviéndose por la ruta 3D
  animateVehicleOnRoute(coords) {
    if (!this.map || !coords || coords.length < 2) return;

    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) return;

    // Crear div de elemento vehículo 3D personalizado
    if (!this.vehicleMarker) {
      const el = document.createElement('div');
      el.className = 'vehicle-3d-marker shadow-2xl';
      el.innerHTML = `
        <div style="background: #111111; color: #38bdf8; padding: 6px 10px; border-radius: 999px; border: 2px solid #06b6d4; font-size: 14px; display: flex; items-center: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          🚗
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
    if (!this.map) return;

    if (this.animFrameId) {
      clearTimeout(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.vehicleMarker) {
      this.vehicleMarker.remove();
      this.vehicleMarker = null;
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
