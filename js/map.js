/**
 * js/map.js - 修复地图漂移、补全飞线落点与弹窗交互
 */
class SituationMap {
  constructor() {
    this.map = null;
    this.currentLayer = null;
    this.markersGroup = null;
    this.flightLayerGroup = null;

    // 修复：layers 对象必须只存放 layer 实例，不能带 .addTo()
    this.layers = {
      dark: L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20
        }
      ),
      satellite: L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri',
          maxZoom: 19
        }
      )
    };
  }

  init(containerId) {
    if (this.map) return this.map;

    this.map = L.map(containerId, {
      center: [30, 10],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,        // 防止跨经度飞线漂移
      minZoom: 2,
      maxBounds: [[-85, -180], [85, 180]], // 限制地图边界，避免拖出空白区
      maxBoundsViscosity: 1.0
    });

    this.currentLayer = this.layers.dark;
    this.currentLayer.addTo(this.map);

    this.markersGroup = L.layerGroup().addTo(this.map);
    this.flightLayerGroup = L.layerGroup().addTo(this.map);

    // 修复：容器尺寸在初始化时可能未就绪
    setTimeout(() => this.map.invalidateSize(), 200);

    return this.map;
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

    const hubCoord = scope === 'china' ? [39.9042, 116.4074] : [30.0, 10.0];

    list.forEach((item) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const targetCoord = [lat, lng];

      const color =
        item.level === 'critical'
          ? '#ef4444'
          : item.level === 'major'
          ? '#f59e0b'
          : '#8b5cf6';

      // 1. 飞线（处理跨 180° 经线的最短路径）
      const path =
        Math.abs(lng - hubCoord[1]) > 180
          ? [hubCoord, [lat, lng > 0 ? lng - 360 : lng + 360], targetCoord]
          : [hubCoord, targetCoord];

      const flightLine = L.polyline(path, {
        color: color,
        weight: 1.2,
        opacity: 0.5,
        dashArray: '4, 4'
      });
      this.flightLayerGroup.addLayer(flightLine);

      // 2. 外发光落点
      const landingGlow = L.circleMarker(targetCoord, {
        radius: 7,
        fillColor: color,
        color: color,
        weight: 1,
        fillOpacity: 0.3
      });
      this.flightLayerGroup.addLayer(landingGlow);

      // 3. 核心落点
      const landingDot = L.circleMarker(targetCoord, {
        radius: 3.5,
        fillColor: '#ffffff',
        color: color,
        weight: 1.5,
        fillOpacity: 1
      });

      landingDot.on('click', (e) => {
        L.DomEvent.stopPropagation(e); // 防止点击冒泡到地图
        if (typeof window.openDetailModal === 'function') {
          window.openDetailModal(item);
        }
      });

      // 同时给发光点绑定点击（体验更好）
      landingGlow.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (typeof window.openDetailModal === 'function') {
          window.openDetailModal(item);
        }
      });

      this.markersGroup.addLayer(landingDot);
    });
  }

  flyToLocation(lat, lng, zoom, item) {
    if (!this.map) return;
    this.map.flyTo([parseFloat(lat), parseFloat(lng)], zoom || 6, {
      duration: 1.2
    });
  }

  switchScope(scope) {
    if (!this.map) return;
    if (scope === 'china') {
      this.map.flyTo([35.8617, 104.1954], 4, { duration: 1.2 });
    } else {
      this.map.flyTo([30.0, 10.0], 2, { duration: 1.2 });
    }
  }

  resize() {
    if (this.map) this.map.invalidateSize();
  }

  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}

window.situationMap = new SituationMap();