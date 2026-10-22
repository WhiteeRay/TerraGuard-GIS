import Chart from 'chart.js/auto';

Chart.defaults.font.family = '"Golos Text", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.color = '#64736b';

export function lineChart(canvas, labels, datasets, unit = '') {
  return new Chart(canvas, {
    type: 'line',
    data: { labels, datasets: datasets.map((dataset) => ({ borderWidth: 2.3, tension: 0.35, pointRadius: labels.length === 1 ? 4 : 2, pointHoverRadius: 5, fill: false, ...dataset })) },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#173d30', padding: 12, displayColors: false, titleFont: { size: 12 }, bodyFont: { size: 13 }, callbacks: { label: (context) => `${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)} ${unit}`.trim() } } },
      scales: {
        x: { title: { display: true, text: 'Date · UTC+5', font: { size: 12 } }, grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 5, maxRotation: 0, font: { size: 12 }, callback(value) { return this.getLabelForValue(value).split(',')[0].replace(/\s\d{4}$/, ''); } } },
        y: { title: { display: true, text: `${datasets[0]?.label || 'Value'}${unit ? ` (${unit.trim()})` : ''}`, font: { size: 12 } }, border: { display: false }, grid: { color: '#e8eee9' }, ticks: { maxTicksLimit: 5, font: { size: 12 }, callback: (value) => `${value}${unit}` } }
      }
    }
  });
}
