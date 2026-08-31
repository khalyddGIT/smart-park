// Módulo de Edificios 3D Extruidos (3D Buildings Fill-Extrusion) e Inspección Interactiva

export class MapBuildingsManager {
  constructor(map, onSelectBuilding) {
    this.map = map;
    this.onSelectBuilding = onSelectBuilding;
    this.layerId = '3d-buildings';
    this.isBuildingsEnabled = true;
    this.selectedFeatureId = null;
  }

  // Insertar capa de edificios 3D extruidos debajo de la capa de etiquetas del mapa
  setupBuildings() {
    if (!this.map) return;

    // Si la capa ya existe, retornar
    if (this.map.getLayer(this.layerId)) return;

    // Encontrar la primera capa de símbolos/etiquetas para colocar las extrusiones debajo de los textos de calles
    const layers = this.map.getStyle().layers;
    let labelLayerId;
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].type === 'symbol' && layers[i].layout && layers[i].layout['text-field']) {
        labelLayerId = layers[i].id;
        break;
      }
    }

    this.map.addLayer(
      {
        id: this.layerId,
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          // Color dinámico de edificios según altura real (o nivel)
          'fill-extrusion-[#color]': [
            'interpolate',
            ['linear'],
            ['get', 'height'],
            0, '#e2e8f0',
            10, '#cbd5e1',
            25, '#94a3b8',
            50, '#64748b'
          ],
          'fill-extrusion-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#10b981', // Resaltado en Verde Turquesa al seleccionar un edificio
            [
              'interpolate',
              ['linear'],
              ['get', 'height'],
              0, '#f1f5f9',
              15, '#cbd5e1',
              35, '#94a3b8',
              60, '#64748b'
            ]
          ],
          // Usar la altura real del edificio (o fallback a 8m)
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 0,
            14.5, ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, 0,
            14.5, ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.88
        }
      },
      labelLayerId
    );

    this.bindEvents();
  }

  // Eventos de selección e inspección de edificios 3D
  bindEvents() {
    if (!this.map) return;

    this.map.on('click', this.layerId, (e) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const props = feature.properties || {};

      const buildingInfo = {
        id: feature.id || props.id || `bldg-${Math.round(e.lngLat.lng*1000)}`,
        name: props.name || 'Edificación / Manzana',
        height: props.height ? `${Math.round(props.height)} metros` : '8.5 metros (~3 pisos)',
        levels: props.building_levels || props.levels || Math.ceil((props.height || 8) / 3),
        type: props.type || props.building || 'Residencial / Comercial',
        address: props['addr:street'] ? `${props['addr:street']} ${props['addr:housenumber'] || ''}` : 'Centro Histórico de Ayacucho',
        coordinates: [e.lngLat.lng, e.lngLat.lat]
      };

      if (this.onSelectBuilding) {
        this.onSelectBuilding(buildingInfo);
      }
    });

    // Cursor pointer al pasar sobre un edificio 3D
    this.map.on('mouseenter', this.layerId, () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', this.layerId, () => {
      this.map.getCanvas().style.cursor = '';
    });
  }

  toggleBuildings(enable) {
    if (!this.map || !this.map.getLayer(this.layerId)) return;
    this.isBuildingsEnabled = enable;
    this.map.setLayoutProperty(
      this.layerId,
      'visibility',
      enable ? 'visible' : 'none'
    );
  }
}
