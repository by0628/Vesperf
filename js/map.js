/**
 * js/map.js - 修复地图漂移、补全飞线落点与弹窗交互
 */
class SituationMap {
  constructor() {
    this.map = null;
    this.currentLayer = null;
    this.markersGroup = null;
    this.flightLayerGroup = null;
    this.layers = {
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri'
      })
    };
  }

  init(containerId) {
    if (this.map) return;
    this.map = L.map(containerId, {
      center: [30, 10],
      zoom: 2,
      zoomControl: false,
      attributionControl: false
    });

    this.currentLayer = this.layers.dark;
    this.currentLayer.addTo(this.map);

    this.markersGroup = L.layerGroup().addTo(this.map);
    this.flightLayerGroup = L.layerGroup().addTo(this.map);
  }

  setTileLayer(type) {
    if (!this.map) return;
    if (this.currentLayer) {
      this.map.removeLayer(this.currentLayer);
    }
    this.currentLayer = this.layers[type] || this.layers.dark;
    this.currentLayer.addTo(this.map);
  }

  renderHotspots(list, scope) {
    if (!this.map) return;
    this.markersGroup.clearLayers();
    this.flightLayerGroup.clearLayers();

    // 设定飞线的起点枢纽（国内以北京为起点，全球以零度经纬度或核心枢纽为起点）
    const hubCoord = scope === 'china' ? [39.9042, 116.4074] : [30.0, 10.0];

    list.forEach((item) => {
      // 严格校验 Leaflet 要求的 [lat, lng] 顺序，防止经纬度颠倒产生漂移
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const targetCoord = [lat, lng];

      // 根据事件等级分配颜色
      const color =
        item.level === 'critical'
          ? '#ef4444'
          : item.level === 'major'
          ? '#f59e0b'
          : '#8b5cf6';

      // 1. 绘制飞线（从中心枢纽连向目标点）
      const flightLine = L.polyline([hubCoord, targetCoord], {
        color: color,
        weight: 1.2,
        opacity: 0.5,
        dashArray: '4, 4'
      });
      this.flightLayerGroup.addLayer(flightLine);

      // 2. 绘制飞线落点（外发光圆点）
      const landingGlow = L.circleMarker(targetCoord, {
        radius: 7,
        fillColor: color,
        color: color,
        weight: 1,
        fillOpacity: 0.3
      });
      this.flightLayerGroup.addLayer(landingGlow);

      // 3. 绘制核心落点实体圆点（确保落点清晰可见）
      const landingDot = L.circleMarker(targetCoord, {
        radius: 3.5,
        fillColor: '#ffffff',
        color: color,
        weight: 1.5,
        fillOpacity: 1
      });

      landingDot.on('click', () => {
        if (typeof window.openDetailModal === 'function') {
          window.openDetailModal(item);
        }
      });

      this.markersGroup.addLayer(landingDot);
    });
  }

  flyToLocation(lat, lng, zoom, item) {
    if (!this.map) return;
    this.map.flyTo([lat, lng], zoom || 6, {
      duration: 1.2
    });
  }

  switchScope(scope) {
    if (!this.map) return;
    if (scope === 'china') {
      this.map.flyTo([35.8617, 104.1954], 4);
    } else {
      this.map.flyTo([30.0, 10.0], 2);
    }
  }

  resize() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }
}

window.situationMap = new SituationMap();
