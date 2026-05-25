import bus from './eventBus.js';

let cpuChart = null;
let memChart = null;

const chartConfig = (label, color) => ({
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label,
      data: [],
      borderColor: color,
      backgroundColor: color + '20',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHitRadius: 10,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e2a3a',
        borderColor: '#2d3f52',
        borderWidth: 1,
        titleColor: '#e6edf3',
        bodyColor: '#8b949e',
        callbacks: { label: (ctx) => `${ctx.parsed.y.toFixed(1)}%` }
      }
    },
    scales: {
      x: {
        grid: { color: '#2d3f5230' },
        ticks: { color: '#8b949e', font: { size: 10 }, maxTicksLimit: 8 },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: '#2d3f5230' },
        ticks: { color: '#8b949e', font: { size: 10 }, callback: v => v + '%' },
      }
    }
  }
});

export function initCharts() {
  const Chart = window.Chart;
  if (!Chart) {
    console.error('[Charts] Chart.js not loaded');
    bus.emit('error', { source: 'charts', message: 'Chart.js CDN failed to load' });
    return;
  }
  cpuChart = new Chart(document.getElementById('cpuChart'), chartConfig('CPU', '#58a6ff'));
  memChart = new Chart(document.getElementById('memChart'), chartConfig('内存', '#a371f7'));
}

// 监听数据更新事件
bus.on('data:metrics', ({ cpuHistory, memHistory }) => {
  if (!cpuChart || !memChart) return;

  cpuChart.data.labels = cpuHistory.map(d => d.time);
  cpuChart.data.datasets[0].data = cpuHistory.map(d => d.value);
  cpuChart.update('none');

  memChart.data.labels = memHistory.map(d => d.time);
  memChart.data.datasets[0].data = memHistory.map(d => d.value);
  memChart.update('none');
});
