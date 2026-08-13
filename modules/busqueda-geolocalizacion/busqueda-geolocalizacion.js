/* ============================================================
   BÚSQUEDA Y GEOLOCALIZACIÓN — busqueda-geolocalizacion.js
   RF20–RF26: Mapa Leaflet Huamanga, filtros, listado
   ============================================================ */

let searchMap = null;
let searchMarkers = [];
let userLocation = null;
let userMarker = null;
let radiusCircle = null;

// Haversine formula to calculate distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return parseFloat((R * c).toFixed(2));
}

function initBusquedaGeolocalizacion() {
  // Live text search on the address/name input
  const addr = document.getElementById('search-address');
  if (addr && !addr.dataset.wired) {
    addr.dataset.wired = '1';
    addr.addEventListener('input', () => { clearTimeout(addr._t); addr._t = setTimeout(applySearchFilters, 250); });
  }

  // Init Leaflet map centered on Huamanga, Ayacucho
  setTimeout(() => {
    if (searchMap) { searchMap.remove(); searchMap = null; }

    const mapEl = document.getElementById('search-map');
    if (!mapEl) return;

    // RF20: Mapa centrado en Huamanga, Ayacucho (deshabilitar scroll zoom para no atrapar al usuario)
    searchMap = L.map('search-map', {
      scrollWheelZoom: false
    }).setView([-13.1588, -74.2232], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Smart-Park',
      maxZoom: 19
    }).addTo(searchMap);

    // Render markers and list
    renderSearchResults(window.mockData.locales);

    // Fix map size
    setTimeout(() => searchMap.invalidateSize(), 300);
  }, 300);
}

function renderSearchResults(locales) {
  const d = window.mockData;
  searchMarkers.forEach(m => searchMap.removeLayer(m));
  searchMarkers = [];

  const container = document.getElementById('search-results');
  const countEl = document.getElementById('search-count');

  // RF23: Sort by distance
  const sorted = [...locales].sort((a, b) => a.distance - b.distance);
  countEl.textContent = `(${sorted.length} encontrados)`;

  // Custom green icon for markers
  const greenIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:var(--c3,#6A994E);width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3)">
      <span style="transform:rotate(45deg);color:#fff;font-size:16px;font-family:'Material Symbols Outlined'">P</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  let html = '';

  sorted.forEach(local => {
    const counts = d.countSpaces(local.id);
    const isTopRated = local.rating >= 4.5; // RF26

    // Add marker to map
    if (local.lat && local.lng) {
      const marker = L.marker([local.lat, local.lng], { icon: greenIcon })
        .addTo(searchMap)
        .bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:200px">
            <strong style="font-size:14px">${local.name}</strong><br>
            <span style="font-size:12px;color:#666">${local.address}</span><br>
            <div style="margin:8px 0;font-size:12px">
              <span style="color:#2E7D32">●</span> ${counts.available} disponibles de ${counts.total}<br>
              ⭐ ${local.rating} · 📏 ${local.distance} km
            </div>
            <button onclick="window.currentLocalIdView = ${local.id}; SmartParkApp.loadModule('detalle-estacionamiento')" style="background:#6A994E;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:12px;width:100%">
              Ver Detalle
            </button>
          </div>
        `);
      searchMarkers.push(marker);
    }

    // RF24: Listado con disponibilidad
    const availPct = counts.total > 0 ? Math.round((counts.available / counts.total) * 100) : 0;
    const availTone = availPct >= 50 ? 'success' : (availPct >= 25 ? 'warning' : 'danger');
    html += `
      <div class="search-result-card ${isTopRated ? 'top-rated' : ''}" onclick="focusMarker(${local.lat}, ${local.lng})">
        <div class="src-thumb">
          <img src="${local.image}" alt="${local.name}">
        </div>
        <div class="src-content">
          ${isTopRated ? `<div class="top-rated-badge">⭐ Mejor calificado</div>` : ''}
          <div class="src-header">
            <div class="src-name">${local.name}</div>
            ${SP_Components.renderBadge(local.status)}
          </div>
          <div class="src-address">${local.address}</div>
          <div class="src-availability">
            <div class="src-avail-line">
              <span class="material-symbols-outlined">local_parking</span>
              <div class="src-avail-track"><div class="src-avail-fill ${availTone}" style="width:${availPct}%"></div></div>
              <span class="src-avail-num ${availTone}">${counts.available}/${counts.total} disponibles</span>
            </div>
          </div>
          <div class="src-meta">
            <span class="src-meta-item"><span class="material-symbols-outlined">near_me</span> ${local.distance} km</span>
            <span class="src-meta-item"><span class="material-symbols-outlined">star</span> ${local.rating}</span>
            <span class="src-meta-item"><span class="material-symbols-outlined">schedule</span> ${local.schedule}</span>
            ${local.ia ? '<span class="src-meta-item" style="color:var(--c3)"><span class="material-symbols-outlined">smart_toy</span> IA</span>' : ''}
          </div>
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();window.currentLocalIdView = ${local.id};SmartParkApp.loadModule('detalle-estacionamiento')">
              <span class="material-symbols-outlined">visibility</span> Detalle
            </button>
            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();window.currentLocalIdView = ${local.id};SmartParkApp.loadModule('reservas')">
              <span class="material-symbols-outlined">event</span> Reservar
            </button>
          </div>
        </div>
      </div>`;
  });

  container.innerHTML = html || '<div class="empty-state"><span class="material-symbols-outlined">search_off</span><h3>Sin resultados</h3><p>No se encontraron estacionamientos con los filtros seleccionados.</p></div>';
}

function focusMarker(lat, lng) {
  if (searchMap && lat && lng) {
    searchMap.flyTo([lat, lng], 17, { duration: 0.8 });
    // Open popup of closest marker
    searchMarkers.forEach(m => {
      const pos = m.getLatLng();
      if (Math.abs(pos.lat - lat) < 0.001 && Math.abs(pos.lng - lng) < 0.001) {
        m.openPopup();
      }
    });
  }
}

// RF20: Use current location via navigator.geolocation
function useMyLocation() {
  if (!navigator.geolocation) {
    SP_Components.showToast('danger', 'Error', 'Tu navegador no soporta geolocalización.');
    return;
  }
  
  SP_Components.showToast('info', 'Ubicación', 'Obteniendo tu ubicación exacta...');
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      userLocation = { lat, lng };
      
      if (searchMap) {
        searchMap.flyTo([lat, lng], 15, { duration: 1 });
        
        if (userMarker) searchMap.removeLayer(userMarker);
        userMarker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: '#4285F4',
          color: '#fff',
          weight: 3,
          fillOpacity: 1
        }).addTo(searchMap).bindPopup('Tu ubicación actual').openPopup();
        
        // Recalculate distances for all locales
        window.mockData.locales.forEach(l => {
          if (l.lat && l.lng) {
            l.distance = calculateDistance(lat, lng, l.lat, l.lng);
          }
        });
        
        applySearchFilters();
      }
    },
    (error) => {
      console.warn("Geolocation error:", error);
      SP_Components.showToast('warning', 'Permiso denegado', 'No se pudo obtener tu ubicación. Usando centro de Huamanga.');
      // Fallback
      userLocation = { lat: -13.1588, lng: -74.2232 };
      if (searchMap) {
        searchMap.flyTo([-13.1588, -74.2232], 15, { duration: 1 });
        if (userMarker) searchMap.removeLayer(userMarker);
        userMarker = L.circleMarker([-13.1588, -74.2232], {
          radius: 8, fillColor: '#4285F4', color: '#fff', weight: 3, fillOpacity: 1
        }).addTo(searchMap).bindPopup('Centro de Huamanga');
      }
    },
    { enableHighAccuracy: true, timeout: 5000 }
  );
}

// RF25: Apply filters
function applySearchFilters() {
  const d = window.mockData;
  let filtered = [...d.locales];

  const vehicleType = document.getElementById('filter-vehicle-type').value;
  const maxTariff = parseFloat(document.getElementById('filter-tariff').value) || Infinity;
  const onlyAvailable = document.getElementById('filter-available').checked;
  const minRating = parseFloat(document.getElementById('filter-rating').value) || 0;
  const textInput = document.getElementById('search-address');
  const textQuery = (textInput ? textInput.value : '').trim().toLowerCase();

  if (textQuery) {
    filtered = filtered.filter(l =>
      String(l.name || '').toLowerCase().includes(textQuery) ||
      String(l.address || '').toLowerCase().includes(textQuery));
  }

  // New radius filter
  const radiusSelect = document.getElementById('filter-radius');
  const maxRadius = radiusSelect ? parseFloat(radiusSelect.value) : NaN;

  if (onlyAvailable) {
    filtered = filtered.filter(l => l.status === 'Activo');
  }

  if (minRating) {
    filtered = filtered.filter(l => l.rating >= minRating);
  }

  if (vehicleType) {
    filtered = filtered.filter(l => {
      const spaces = d.spaces.filter(s => s.localId === l.id && s.type === vehicleType);
      return spaces.length > 0;
    });
  }

  if (maxTariff < Infinity) {
    filtered = filtered.filter(l => {
      return l.tarifas.some(t => t.hora <= maxTariff);
    });
  }
  
  // Apply radius filtering if user location is known and radius is selected
  if (userLocation && !isNaN(maxRadius)) {
    filtered = filtered.filter(l => l.distance <= maxRadius);
    
    // Draw visual circle on map
    if (radiusCircle) searchMap.removeLayer(radiusCircle);
    radiusCircle = L.circle([userLocation.lat, userLocation.lng], {
      color: '#4285F4',
      fillColor: '#4285F4',
      fillOpacity: 0.1,
      weight: 1,
      radius: maxRadius * 1000 // Convert km to meters
    }).addTo(searchMap);
  } else if (radiusCircle) {
    searchMap.removeLayer(radiusCircle);
    radiusCircle = null;
  }

  renderSearchResults(filtered);
  SP_Components.showToast('info', 'Filtros aplicados', `${filtered.length} estacionamientos encontrados.`);
}
