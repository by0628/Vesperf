/**
 * js/charts.js - ECharts 5 图表初始化及局部 setOption 更新
 */
class SituationCharts {
  constructor() {
    this.sentimentChart = null;
    this.trendChart = null;
    this.categoryChart = null;
    this.gaugeSpreadChart = null;
    this.gaugeSentimentChart = null;
  }

  init() {
    this.sentimentChart = echarts.init(document.getElementById('chart-sentiment'));
    this.trendChart = echarts.init(document.getElementById('chart-trend'));
    this.categoryChart = echarts.init(document.getElementById('chart-category'));
    this.gaugeSpreadChart = echarts.init(document.getElementById('chart-gauge-spread'));
    this.gaugeSentimentChart = echarts.init(document.getElementById('chart-gauge-sentiment'));

    this.renderInitialCharts();
  }

  renderInitialCharts() {
    // 1. 情感分布环形图
    this.sentimentChart.setOption({
      tooltip: { trigger: 'item' },
      series: [
        {
          name: '情感倾向',
          type: 'pie',
          radius: ['52%', '75%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#0a0e1a',
            borderWidth: 2
          },
          label: { show: false },
          data: [
            { value: 68, name: '正面', itemStyle: { color: '#00f5d4' } },
            { value: 24, name: '中性', itemStyle: { color: '#3b82f6' } },
            { value: 8, name: '负面', itemStyle: { color: '#ff4757' } }
          ]
        }
      ]
    });

    // 2. 24h 声量趋势面积折线图
    const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];
    this.trendChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '10%', right: '5%', top: '15%', bottom: '15%' },
      xAxis: {
        type: 'category',
        data: hours,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 }
      },
      series: [
        {
          name: '总声量',
          type: 'line',
          smooth: true,
          showSymbol: false,
          areaStyle: { color: 'rgba(0, 245, 212, 0.15)' },
          itemStyle: { color: '#00f5d4' },
          data: [320, 290, 480, 890, 960, 1120, 1250]
        },
        {
          name: '正面',
          type: 'line',
          smooth: true,
          showSymbol: false,
          itemStyle: { color: '#10b981' },
          data: [220, 210, 360, 680, 740, 850, 960]
        },
        {
          name: '负面',
          type: 'line',
          smooth: true,
          showSymbol: false,
          itemStyle: { color: '#ff4757' },
          data: [30, 25, 45, 70, 65, 80, 90]
        }
      ]
    });

    // 3. 分类占比水平柱状图
    this.categoryChart.setOption({
      grid: { left: '22%', right: '12%', top: '10%', bottom: '15%' },
      xAxis: {
        type: 'value',
        splitLine: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 9 }
      },
      yAxis: {
        type: 'category',
        data: ['突发', '社会', '财经', '科技', '政策'],
        axisLabel: { color: '#e2e8f0', fontSize: 10 }
      },
      series: [
        {
          type: 'bar',
          barWidth: '55%',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#00f5d4' }
            ]),
            borderRadius: [0, 4, 4, 0]
          },
          data: [18, 34, 46, 58, 68]
        }
      ]
    });

    // 4. 传播广度仪表盘
    const gaugeCommonOpt = (value, name, color) => ({
      series: [
        {
          type: 'gauge',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 100,
          splitNumber: 5,
          itemStyle: { color },
          progress: {
            show: true,
            width: 5
          },
          pointer: { show: false },
          axisLine: {
            lineStyle: {
              width: 5,
              color: [[1, 'rgba(255,255,255,0.1)']]
            }
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: {
            valueAnimation: true,
            fontSize: 13,
            offsetCenter: [0, '15%'],
            formatter: '{value}',
            color: '#fff'
          },
          title: {
            offsetCenter: [0, '75%'],
            fontSize: 10,
            color: '#94a3b8'
          },
          data: [{ value, name }]
        }
      ]
    });

    this.gaugeSpreadChart.setOption(gaugeCommonOpt(86, '广度评分', '#00f5d4'));
    this.gaugeSentimentChart.setOption(gaugeCommonOpt(78, '烈度评分', '#3b82f6'));
  }

  // 根据世界/国内 Tab 局部 setOption 更新图表
  updateByScope(scope) {
    if (scope === 'china') {
      this.sentimentChart.setOption({
        series: [
          {
            data: [
              { value: 76, name: '正面', itemStyle: { color: '#00f5d4' } },
              { value: 18, name: '中性', itemStyle: { color: '#3b82f6' } },
              { value: 6, name: '负面', itemStyle: { color: '#ff4757' } }
            ]
          }
        ]
      });

      this.categoryChart.setOption({
        series: [{ data: [12, 28, 41, 62, 75] }]
      });

      this.gaugeSpreadChart.setOption({
        series: [{ data: [{ value: 92, name: '广度评分' }] }]
      });
      this.gaugeSentimentChart.setOption({
        series: [{ data: [{ value: 81, name: '烈度评分' }] }]
      });
    } else {
      this.sentimentChart.setOption({
        series: [
          {
            data: [
              { value: 68, name: '正面', itemStyle: { color: '#00f5d4' } },
              { value: 24, name: '中性', itemStyle: { color: '#3b82f6' } },
              { value: 8, name: '负面', itemStyle: { color: '#ff4757' } }
            ]
          }
        ]
      });

      this.categoryChart.setOption({
        series: [{ data: [18, 34, 46, 58, 68] }]
      });

      this.gaugeSpreadChart.setOption({
        series: [{ data: [{ value: 86, name: '广度评分' }] }]
      });
      this.gaugeSentimentChart.setOption({
        series: [{ data: [{ value: 78, name: '烈度评分' }] }]
      });
    }
  }

  resize() {
    this.sentimentChart?.resize();
    this.trendChart?.resize();
    this.categoryChart?.resize();
    this.gaugeSpreadChart?.resize();
    this.gaugeSentimentChart?.resize();
  }
}

window.situationCharts = new SituationCharts();
