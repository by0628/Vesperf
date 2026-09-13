/**
 * js/map.js - Leaflet.js 地图渲染、贝塞尔弧线、脉冲标记与交互控制
 */
class SituationMap {
  constructor() {
    this.map = null;
    this.tileLayer = null;
    this.currentTileType = 'dark'; // 'dark' | 'satellite'
    this.markersGroup = L.layerGroup();
    this.flyingLinesGroup = L.layerGroup();

    // 默认世界中心与国内中心
    this.viewConfigs = {
      world: { center: [20, 10], zoom: 2 },
      china: { center: [35, 104], zoom: 4 }
    };
  }

  init(containerId) {
    this.map = L.map(containerId, {
      center: this.viewConfigs.world.center,
      zoom: this.viewConfigs.world.zoom,
      zoomControl: true,
      attributionControl: false
    });

    // 初始底图：CartoDB Dark Matter
    this.tileLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 18 }
    ).addTo(this.map);

    this.markersGroup.addTo(this.map);
    this.flyingLinesGroup.addTo(this.map);
  }

  setTileLayer(type) {
    if (this.currentTileType === type) return;
    this.currentTileType = type;
    this.map.removeLayer(this.tileLayer);

    if (type === 'dark') {
      this.tileLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 18 }
      ).addTo(this.map);
    } else if (type === 'satellite') {
      this.tileLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18 }
      ).addTo(this.map);
    }
  }

  // 计算贝塞尔曲线上的一系列控制点
  getBezierPoints(start, end, numPoints = 25) {
    const lat1 = start[0], lng1 = start[1];
    const lat2 = end[0], lng2 = end[1];

    // 计算中点并向上拱起一个弧度高度
    const midLat = (lat1 + lat2) / 2 + Math.abs(lng2 - lng1) * 0.15;
    const midLng = (lng1 + lng2) / 2;

    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * midLat + t * t * lat2;
      const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * midLng + t * t * lng2;
      points.push([lat, lng]);
    }
    return points;
  }

  renderHotspots(items, scope = 'world') {
    this.markersGroup.clearLayers();
    this.flyingLinesGroup.clearLayers();

    // 确定辐射中心点（世界模式用伦敦/中心，国内模式用北京 [39.9, 116.4]）
    const centerPoint = scope === 'china' ? [39.9042, 116.4074] : [40.0, 10.0];

    items.forEach((item, index) => {
      // 1. 创建自定义 DivIcon 脉冲标记
      const pulseClass =
        item.level === 'critical'
          ? 'pulse-critical'
          : item.level === 'major'
          ? 'pulse-major'
          : 'pulse-normal';

      const icon = L.divIcon({
        className: 'custom-pulse-div-icon',
        html: `
          <div class="pulse-icon-wrapper ${pulseClass}">
            <div class="pulse-ring"></div>
            <div class="pulse-dot"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([item.lat, item.lng], { icon });

      // 绑定简易 Popup
      marker.bindPopup(`
        <div style="color:#0a0e1a; font-weight:bold;">${item.title}</div>
        <div style="font-size:12px; color:#475569;">${item.city} | 热度: ${item.heat}万</div>
      `);

      marker.on('click', () => {
        if (window.openDetailModal) {
          window.openDetailModal(item);
        }
      });

      this.markersGroup.addLayer(marker);

      // 2. 绘制前 8 个点到中心点的贝塞尔流动飞线
      if (index < 8) {
        const bezierCoords = this.getBezierPoints(centerPoint, [item.lat, item.lng]);
        const polyline = L.polyline(bezierCoords, {
          color: item.level === 'critical' ? '#ff4757' : '#00f5d4',
          weight: 1.5,
          opacity: 0.6,
          dashArray: '6, 8',
          className: 'flying-line-animated'
        });
        this.flyingLinesGroup.addLayer(polyline);
      }
    });
  }

  flyToLocation(lat, lng, zoom = 6, item = null) {
    this.map.flyTo([lat, lng], zoom, {
      duration: 1.5
    });

    if (item) {
      setTimeout(() => {
        // 找到对应 marker 并打开 popup
        this.markersGroup.eachLayer(layer => {
          const latLng = layer.getLatLng();
          if (
            Math.abs(latLng.lat - item.lat) < 0.01 &&
            Math.abs(latLng.lng - item.lng) < 0.01
          ) {
            layer.openPopup();
          }
        });
      }, 1500);
    }
  }

  switchScope(scope) {
    const cfg = this.viewConfigs[scope];
    this.map.flyTo(cfg.center, cfg.zoom, { duration: 1.2 });
  }

  resize() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }
}

// 补充飞线动画 CSS 注入到页面
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  try {
    styleSheet.insertRule(`
      @keyframes dashFlow {
        to {
          stroke-dashoffset: -28;
        }
      }
    `, styleSheet.cssRules.length);
    styleSheet.insertRule(`
      .flying-line-animated {
        animation: dashFlow 2s linear infinite;
      }
    `, styleSheet.cssRules.length);
  } catch (e) {
    // 忽略样式插入异常
  }
}

window.situationMap = new SituationMap();
