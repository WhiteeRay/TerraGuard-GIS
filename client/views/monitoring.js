import { displayText } from '../lib/localization.js';
import { api } from '../lib/api.js';
import { lineChart } from '../lib/charts.js';
import { measurementForm } from '../lib/forms.js';
import { heading, icon, number, escape, date, empty, loading, analysisHTML, disclaimer, icons, downloadCSV } from '../lib/ui.js';

export async function renderMonitoring(container, context) {
  const zones = context.summary.zones;
  let selectedId = zones.some((zone) => zone.id === context.selectedZone) ? context.selectedZone : zones[0]?.id;
  let days = 14;
  let metric = 'moisture';
  let chart;
  let rows = [];
  let sequence = 0;
  let disposed = false;
  const metrics = { moisture: { label: 'Soil Moisture', unit: '%', icon: 'droplets', color: '#3e795c' }, temperature: { label: 'Soil Temperature', unit: '°C', icon: 'thermometer', color: '#bc8a4c' }, ph: { label: 'Soil pH', unit: ' pH', icon: 'test-tube-2', color: '#8976a0' } };
  container.innerHTML = `${heading('OBSERVATIONS & ASSESSMENT', 'Soil Monitoring', 'Track soil conditions and understand the reasons behind every alert.', `<button class="button button-primary" id="new-measurement">${icon('plus')}Add Measurement</button>`)}<div class="filter-bar"><label>Monitoring Zone<select id="monitor-zone">${zones.map((zone) => `<option value="${zone.id}"${zone.id === selectedId ? ' selected' : ''}>${escape(displayText(zone.name))}</option>`).join('')}</select></label><label>Observation Period<select id="monitor-days">${[7,14,30,90,365].map((value) => `<option value="${value}"${value === days ? ' selected' : ''}>${value} days</option>`).join('')}</select></label><div class="filter-bar-note">${icon('flask-conical')}Manual observations · Demo Data</div></div><div id="monitor-data"></div>`;
  const data = container.querySelector('#monitor-data');
  function renderChart() {
    chart?.destroy();
    chart = null;
    const canvas = data.querySelector('#monitor-chart');
    if (!canvas || !rows.length) return;
    const ordered = [...rows].reverse();
    chart = lineChart(canvas, ordered.map((row) => date(row.measured_at, true)), [{ label: metrics[metric].label, data: ordered.map((row) => row[metric]), borderColor: metrics[metric].color, backgroundColor: `${metrics[metric].color}0c`, fill: true }], metrics[metric].unit);
  }
  async function load() {
    const version = ++sequence;
    chart?.destroy();
    data.innerHTML = loading();
    if (!selectedId) { data.innerHTML = empty('No monitoring zones', 'Draw your first zone on the GIS Map.', 'map'); icons(); return; }
    const zoneId = selectedId;
    try {
      const [measurements, analysis] = await Promise.all([api(`/zones/${zoneId}/measurements?days=${days}`), api(`/zones/${zoneId}/analysis`)]);
      if (version !== sequence || disposed) return;
      rows = measurements;
      const latest = analysis.latest;
      data.innerHTML = `<div class="monitor-layout"><div><div class="soil-card-grid">${Object.entries(metrics).map(([key, item]) => `<div class="card soil-card"><div><span>${item.label}</span>${icon(item.icon)}</div><strong>${latest ? number(latest[key], 1) : 'Not available'}<small>${item.unit}</small></strong><p>${latest ? `Latest reading · ${date(latest.measured_at)}` : 'No measurements'}</p></div>`).join('')}</div><section class="card monitoring-chart-card"><div class="card-heading"><div><h2>Measurement Trends</h2><p>${rows.length} measurements in this period · UTC+5</p></div><div class="metric-tabs">${Object.entries(metrics).map(([key,item]) => `<button class="metric-tab ${metric === key ? 'active' : ''}" data-metric="${key}">${item.label}</button>`).join('')}</div></div><div class="monitoring-chart">${rows.length ? '<canvas id="monitor-chart" aria-label="Soil measurement history" role="img"></canvas>' : empty('No measurements in this period', 'Choose another period or add a measurement.', 'activity')}</div></section></div><aside class="card analysis-card"><div class="card-heading"><div><h2>Soil Health Assessment</h2><p>Explainable, rule-based assessment</p></div></div><div class="analysis-content">${analysis.status === 'insufficient_data' ? '<p class="insufficient-note">Insufficient data for assessment</p>' : ''}${analysisHTML(analysis)}${disclaimer()}<p class="evaluated-at">Assessed ${date(analysis.evaluated_at, true)}</p></div></aside></div><section class="card measurement-table-card"><div class="card-heading"><div><h2>Measurement History <span class="count-badge">${rows.length}</span></h2><p>Recorded observations for the selected monitoring zone</p></div><button class="button button-secondary button-small" id="export-measurements"${rows.length ? '' : ' disabled'}>${icon('download')}CSV</button></div>${rows.length ? `<div class="table-scroll"><table><thead><tr><th>Date & time · UTC+5</th><th>Moisture, %</th><th>Temperature, °C</th><th>pH</th><th class="secondary-column">Source</th><th class="secondary-column">Depth, cm</th><th class="secondary-column">Recorded By</th><th>Actions</th></tr></thead><tbody>${rows.map((row) => `<tr><td class="cell-strong">${date(row.measured_at, true)}</td><td><span class="measurement-dot" style="background:#3e795c"></span>${number(row.moisture, 1)}</td><td>${number(row.temperature, 1)}</td><td>${number(row.ph, 1)}</td><td class="secondary-column"><span class="source-tag">${escape(displayText(row.measurement_source || row.source))}</span></td><td class="secondary-column">${number(row.sampling_depth_cm,1)}</td><td class="secondary-column">${escape(row.recorded_by || 'Not available')}</td><td><div class="record-actions"><details class="record-details"><summary>Details</summary><dl><dt>Sampling Depth</dt><dd>${row.sampling_depth_cm == null ? 'Not available' : `${number(row.sampling_depth_cm,1)} cm`}</dd><dt>Measurement Source</dt><dd>${escape(displayText(row.measurement_source || row.source) || 'Not available')}</dd><dt>Recorded By</dt><dd>${escape(row.recorded_by || 'Not available')}</dd><dt>Notes</dt><dd>${escape(row.notes || 'Not available')}</dd></dl></details><button class="icon-button" data-edit-measurement="${row.id}" title="Edit Measurement" aria-label="Edit measurement ${row.id}">${icon('pencil')}</button></div></td></tr>`).join('')}</tbody></table></div>` : empty('No measurement history yet', 'Saved observations will appear here.')}</section>`;
      data.querySelectorAll('[data-metric]').forEach((button) => button.onclick = () => {
        metric = button.dataset.metric;
        data.querySelectorAll('[data-metric]').forEach((element) => element.classList.toggle('active', element === button));
        renderChart();
      });
      data.querySelector('#export-measurements').onclick = () => downloadCSV(`terraguard-measurements-${selectedId}.csv`, [['Date & time (UTC+5)','Soil Moisture (%)','Soil Temperature (°C)','Soil pH','Sampling Depth (cm)','Measurement Source','Recorded By','Notes'], ...rows.map((row) => [date(row.measured_at, true), row.moisture, row.temperature, row.ph, row.sampling_depth_cm, displayText(row.measurement_source || row.source), row.recorded_by, row.notes])]);
      data.querySelectorAll('[data-edit-measurement]').forEach((button) => button.onclick = () => measurementForm(zones, selectedId, context.refresh, rows.find((row) => row.id === Number(button.dataset.editMeasurement))));
      renderChart();
      icons();
    } catch (error) {
      if (version !== sequence || disposed) return;
      data.innerHTML = `<div class="error-state">${icon('triangle-alert')}<h2>Could not load measurements</h2><p>${escape(error.message)}</p><button class="button button-secondary" id="retry-monitor">Try Again</button></div>`;
      data.querySelector('#retry-monitor').onclick = load;
      icons();
    }
  }
  container.querySelector('#monitor-zone').onchange = (event) => { selectedId = Number(event.target.value); context.setSelected(selectedId); load(); };
  container.querySelector('#monitor-days').onchange = (event) => { days = Number(event.target.value); load(); };
  container.querySelector('#new-measurement').onclick = () => measurementForm(zones, selectedId, async (id) => { context.setSelected(id); await context.refresh(id); });
  icons();
  await load();
  return () => { disposed = true; sequence++; chart?.destroy(); };
}
