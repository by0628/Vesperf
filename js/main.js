/**
 * js/main.js - 接入 Currents API 实时数据与状态管理
 */
class SituationApp {
  constructor() {
    this.currentScope = 'world'; // 'world' | 'china'
    this.currentList = [];
    this.particles = [];
    this.canvas = null;
    this.ctx = null;
    this.currentsApiKey = 'UT88pK0arOMeFYsrbDtPa_b4XxgKv3J7gtBdr3V44bs8iooy';
  }

  async init() {
    // 1. 初始化时钟、Canvas 粒子、KPI动画
    this.initClock();
    this.initKPIAnimation();
    this.initCanvasParticles();
    this.initEventListeners();

    // 2. 初始化 Leaflet & ECharts
    window.situationMap.init('leaflet-map');
    window.situationCharts.init();
    window.openDetailModal = (item) => this.showModal(item);

    // 3. 尝试从 Currents API 获取实时数据，失败则回退到静态数据
    await this.fetchRealTimeData();

    // 4. 定时热度微调与排名重排
    setInterval(() => {
      this.fluctuateHeatAndSort();
    }, 5000);

    // 5. 定时追加实时事件流
    setInterval(() => {
      this.appendEventStreamItem();
    }, 3000);

    // 窗口缩放适配
    window.addEventListener('resize', () => {
      window.situationMap.resize();
      window.situationCharts.resize();
    });
  }

  async fetchRealTimeData() {
    try {
      // 请求世界新闻 (language=en)
      const worldUrl = `https://api.currentsapi.services/v1/latest-news?language=en&apiKey=${this.currentsApiKey}`;
      const chinaUrl = `https://api.currentsapi.services/v1/latest-news?country=CN&apiKey=${this.currentsApiKey}`;

      const [worldRes, chinaRes] = await Promise.all([
        fetch(worldUrl),
        fetch(chinaUrl)
      ]);

      if (worldRes.ok) {
        const worldData = await worldRes.json();
        if (worldData && worldData.news && worldData.news.length > 0) {
          window.HOTSPOT_DATA.world = this.parseCurrentsNews(worldData.news, 'world');
        }
      }

      if (chinaRes.ok) {
        const chinaData = await chinaRes.json();
        if (chinaData && chinaData.news && chinaData.news.length > 0) {
          window.HOTSPOT_DATA.china = this.parseCurrentsNews(chinaData.news, 'china');
        }
      }
    } catch (err) {
      console.warn('Currents API 请求受限或离线，已自动切回内置静态数据集:', err);
    } finally {
      this.currentList = [...window.HOTSPOT_DATA[this.currentScope]];
      this.initRankingList();
      window.situationMap.renderHotspots(this.currentList, this.currentScope);
      window.situationCharts.updateByScope(this.currentScope);
    }
  }

  parseCurrentsNews(newsArray, scope) {
    // 常用城市经纬度映射表，让 API 返回的新闻能准确落在地图坐标上
    const cityCoordsMap = [
      { name: 'Beijing', city: '北京, 中国', lat: 39.9042, lng: 116.4074 },
      { name: 'Shanghai', city: '上海, 中国', lat: 31.2304, lng: 121.4737 },
      { name: 'New York', city: '纽约, 美国', lat: 40.7128, lng: -74.0060 },
      { name: 'London', city: '伦敦, 英国', lat: 51.5074, lng: -0.1278 },
      { name: 'Tokyo', city: '东京, 日本', lat: 35.6762, lng: 139.6503 },
      { name: 'Berlin', city: '柏林, 德国', lat: 52.5200, lng: 13.4050 },
      { name: 'Moscow', city: '莫斯科, 俄罗斯', lat: 55.7558, lng: 37.6173 },
      { name: 'Sydney', city: '悉尼, 澳大利亚', lat: -33.8568, lng: 151.2153 }
    ];

    return newsArray.slice(0, 12).map((item, idx) => {
      const coordObj = cityCoordsMap[idx % cityCoordsMap.length];
      const levels = ['normal', 'major', 'critical'];
      const sentiments = ['positive', 'neutral', 'negative'];

      return {
        id: item.id || `cur_${idx}`,
        title: item.title || '实时新闻简讯',
        category: 'tech',
        city: coordObj.city,
        lat: coordObj.lat + (Math.random() - 0.5) * 1.5,
        lng: coordObj.lng + (Math.random() - 0.5) * 1.5,
        heat: Math.floor(Math.random() * 450) + 550,
        level: levels[idx % levels.length],
        sentiment: sentiments[idx % sentiments.length],
        spread: (Math.floor(Math.random() * 80) + 40) * 100000,
        summary: item.description || item.title
      };
    });
  }

  initClock() {
    const clockEl = document.getElementById('clock-display');
    const update = () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate()
      )} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      clockEl.textContent = timeStr;
    };
    update();
    setInterval(update, 1000);
  }

  animateNumber(el, targetValue, duration = 1200) {
    const startValue = parseInt(el.textContent.replace(/,/g, ''), 10) || 0;
    const startTime = performance.now();

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.floor(startValue + (targetValue - startValue) * eased);
      el.textContent = current.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  initKPIAnimation() {
    this.animateNumber(document.getElementById('kpi-total'), 24);
    this.animateNumber(document.getElementById('kpi-critical'), 5);
    this.animateNumber(document.getElementById('kpi-countries'), 48);
  }

  initRankingList() {
    const container = document.getElementById('ranking-list');
    container.innerHTML = '';

    this.currentList.forEach((item, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'ranking-item';
      itemEl.dataset.id = item.id;
      itemEl.innerHTML = `
        <div class="rank-left">
          <span class="rank-num">${idx + 1}</span>
          <div class="rank-info">
            <span class="rank-title" title="${item.title}">${item.title}</span>
            <span class="rank-sub">
              <span class="cat-tag">${this.formatCategory(item.category)}</span>
              <span>${item.city}</span>
            </span>
          </div>
        </div>
        <div class="rank-right">
          <span class="rank-heat">${item.heat}万</span>
        </div>
      `;

      itemEl.addEventListener('click', () => {
        window.situationMap.flyToLocation(item.lat, item.lng, 6, item);
        this.showModal(item);
      });

      container.appendChild(itemEl);
    });
  }

  formatCategory(cat) {
    const map = {
      policy: '政策',
      tech: '科技',
      economy: '财经',
      emergency: '突发',
      social: '社会'
    };
    return map[cat] || '热点';
  }

  fluctuateHeatAndSort() {
    this.currentList.forEach((item) => {
      const delta = Math.floor(Math.random() * 41) - 15;
      item.heat = Math.max(300, item.heat + delta);
    });

    this.currentList.sort((a, b) => b.heat - a.heat);

    const container = document.getElementById('ranking-list');
    const childNodes = Array.from(container.children);

    this.currentList.forEach((item, idx) => {
      const targetDom = childNodes.find((el) => el.dataset.id === item.id);
      if (targetDom) {
        targetDom.querySelector('.rank-num').textContent = idx + 1;
        targetDom.querySelector('.rank-heat').textContent = `${item.heat}万`;
        container.appendChild(targetDom);
      }
    });
  }

  appendEventStreamItem() {
    const track = document.getElementById('event-stream-track');
    const templates = window.HOTSPOT_DATA.eventTemplates;
    const itemData = templates[Math.floor(Math.random() * templates.length)];

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const badgeClass =
      itemData.label === '告警'
        ? 'badge-warning'
        : itemData.label === '更新'
        ? 'badge-update'
        : 'badge-new';

    const div = document.createElement('div');
    div.className = 'stream-item';
    div.innerHTML = `
      <span class="stream-time">[${timeStr}]</span>
      <span class="stream-badge ${badgeClass}">${itemData.label}</span>
      <span class="stream-title-text">${itemData.text}</span>
    `;

    track.prepend(div);

    const items = track.querySelectorAll('.stream-item');
    if (items.length > 20) {
      items[items.length - 1].remove();
    }
  }

  initCanvasParticles() {
    this.canvas = document.getElementById('bg-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());

    this.particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.8
    }));

    const render = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = this.canvas.width;
        if (p.x > this.canvas.width) p.x = 0;
        if (p.y < 0) p.y = this.canvas.height;
        if (p.y > this.canvas.height) p.y = 0;

        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 245, 212, 0.45)';
        this.ctx.fill();
      });

      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const dx = this.particles[i].x - this.particles[j].x;
          const dy = this.particles[i].y - this.particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
            this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
            this.ctx.strokeStyle = `rgba(0, 245, 212, ${
              (120 - dist) / 120 * 0.15
            })`;
            this.ctx.lineWidth = 0.6;
            this.ctx.stroke();
          }
        }
      }

      requestAnimationFrame(render);
    };

    render();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  showModal(item) {
    const modal = document.getElementById('detail-modal');
    document.getElementById('modal-cat').textContent = this.formatCategory(
      item.category
    );
    document.getElementById('modal-title').textContent = item.title;
    document.getElementById('modal-city').textContent = item.city;
    document.getElementById('modal-heat').textContent = item.heat;
    document.getElementById('modal-level').textContent =
      item.level === 'critical' ? '严重告警' : item.level === 'major' ? '重大关注' : '常规热点';
    document.getElementById('modal-spread').textContent = (
      item.spread / 10000
    ).toFixed(1) + '万次';
    document.getElementById('modal-sentiment').textContent =
      item.sentiment === 'positive'
        ? '正面为主'
        : item.sentiment === 'negative'
        ? '负面情绪偏高'
        : '中性平稳';
    document.getElementById('modal-time').textContent = new Date().toLocaleString();
    document.getElementById('modal-summary').textContent = item.summary;

    modal.classList.add('active');
  }

  initEventListeners() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const scope = btn.dataset.scope;
        this.currentScope = scope;
        this.currentList = [...window.HOTSPOT_DATA[scope]];

        this.initRankingList();
        window.situationMap.switchScope(scope);
        window.situationMap.renderHotspots(this.currentList, scope);
        window.situationCharts.updateByScope(scope);
      });
    });

    const layerBtns = document.querySelectorAll('.layer-btn');
    layerBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        layerBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const layerType = btn.dataset.layer;
        window.situationMap.setTileLayer(layerType);
      });
    });

    document
      .getElementById('modal-close')
      .addEventListener('click', () => {
        document.getElementById('detail-modal').classList.remove('active');
      });

    document
      .getElementById('detail-modal')
      .addEventListener('click', (e) => {
        if (e.target.id === 'detail-modal') {
          e.target.classList.remove('active');
        }
      });

    const mobileTabs = document.querySelectorAll('.mobile-tab-btn');
    const viewPanels = {
      'view-ranking': document.getElementById('view-ranking'),
      'view-map': document.getElementById('view-map'),
      'view-charts': document.getElementById('view-charts')
    };

    mobileTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        mobileTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const targetId = tab.dataset.target;
        Object.keys(viewPanels).forEach((key) => {
          viewPanels[key].classList.remove('active-view');
        });
        viewPanels[targetId].classList.add('active-view');

        if (targetId === 'view-map') {
          setTimeout(() => window.situationMap.resize(), 100);
        } else if (targetId === 'view-charts') {
          setTimeout(() => window.situationCharts.resize(), 100);
        }
      });
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new SituationApp();
  app.init();
});
