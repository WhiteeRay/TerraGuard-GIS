import { displayText } from '../lib/localization.js';
import { api } from '../lib/api.js';
import { createMap } from '../lib/map.js';
import { zoneForm, measurementForm, activityForm } from '../lib/forms.js';
import { heading, icon, number, badge, escape, date, zoneLabels, statusColors, analysisHTML, disclaimer, icons, toast, assessmentLabels } from '../lib/ui.js';

const detailRows = (items) => `<dl class="detail-list">${items.map(([label,value]) => `<div><dt>${label}</dt><dd>${escape(value == null || value === '' ? 'Not available' : displayText(value))}</dd></div>`).join('')}</dl>`;

export async function renderGIS(container, context) {
  const { summary, geojson } = context;
  let selectedId = context.selectedZone || summary.zones[0]?.id;
  let status = '';
  let editing = false;
  container.innerHTML = `${heading('SPATIAL WORKSPACE', 'GIS Map', 'Explore zone boundaries, soil conditions and estimated topsoil volumes.', `<button class="button button-primary" id="draw-zone">${icon('plus')}Create Zone</button>`)}<div class="gis-toolbar"><div class="filter-pills"><button class="filter-pill active" data-status="">All Zones <span>${summary.zone_count}</span></button>${Object.entries(zoneLabels).map(([key,label]) => `<button class="filter-pill" data-status="${key}"><b style="background:${statusColors[key]}"></b>${label}</button>`).join('')}</div><button class="icon-button" id="fit-map" title="Fit all zones" aria-label="Fit all zones">${icon('locate-fixed')}</button></div><div class="gis-workspace"><section class="gis-map-wrap"><div class="gis-map" id="gis-map"></div><div class="map-overlay-label">${icon('layers-3')}Site boundaries <span>WGS 84</span></div><div class="drawing-banner" id="drawing-banner" hidden><span>Click to draw a boundary. Select the first vertex to finish the polygon.</span><button class="text-button" id="cancel-draw">Cancel</button></div><div class="geometry-actions" id="geometry-actions" hidden><span>Drag vertices to adjust the boundary</span><button class="button button-secondary" id="cancel-geometry">Cancel</button><button class="button button-primary" id="save-geometry">${icon('save')}Save Boundary</button></div><div class="map-coordinate">${icon('crosshair')}<span id="coordinates">51.1055° N, 71.4000° E</span></div></section><aside class="zone-inspector" id="inspector"></aside></div>`;
  const map = await createMap(container.querySelector('#gis-map'), geojson.features, { onSelect: (id) => { if (!editing) selectZone(id); } });
  const updateCoordinates = (point) => { container.querySelector('#coordinates').textContent = `${point.lat.toFixed(5)}° N, ${point.lng.toFixed(5)}° E`; };
  map.map.on('mousemove', (event) => updateCoordinates(event.latlng));
  map.map.on('moveend', () => updateCoordinates(map.map.getCenter()));
  updateCoordinates(map.map.getCenter());

  function selectZone(id) {
    selectedId = id;
    context.setSelected(id);
    const zone = summary.zones.find((zone) => zone.id === id);
    map.select(id);
    const inspector = container.querySelector('#inspector');
    if (!zone) { inspector.innerHTML = `<div class="inspector-empty">${icon('map-pin')}<h2>Select a zone</h2><p>Select a polygon or draw a new monitoring zone.</p></div>`; icons(); return; }
    const latest = zone.latest_measurement;
    inspector.innerHTML = `<div class="inspector-heading"><div class="eyebrow">MONITORING ZONE <span>#${String(zone.id).padStart(3, '0')}</span></div><h2>${escape(displayText(zone.name))}</h2>${badge(zone.status)}</div>
      <section class="inspector-section"><div class="section-title">General Information<button class="icon-button" id="edit-zone" title="Edit Zone" aria-label="Edit zone attributes">${icon('pencil')}</button></div>${detailRows([['Zone ID', `#${zone.id}`],['Construction Site',zone.project_name],['Last Updated',date(zone.updated_at,true)],['Survey Date',date(zone.survey_date)]])}<div class="detail-description"><span>Description</span><p>${escape(displayText(zone.description) || 'Not available')}</p></div></section>
      <section class="inspector-section"><div class="section-title">Geospatial Information</div><div class="zone-metrics"><div><span>Total Area</span><strong>${number(zone.area_m2 / 10000, 2)} <small>ha</small></strong><p>${number(zone.area_m2)} m²</p></div><div><span>Topsoil Thickness</span><strong>${number(zone.topsoil_depth_cm, 1)} <small>cm</small></strong><p>Fertile soil layer</p></div></div><div class="volume-estimate">${icon('layers-3')}<div><span>Estimated Topsoil Volume</span><strong>${number(zone.volume_m3)} <small>m³</small></strong></div></div><p class="metric-footnote">Estimated from area and thickness. Actual work volumes are recorded in the Activity Log.</p><button class="text-button" id="edit-geometry">${icon('pencil')}Edit Boundary</button></section>
      <section class="inspector-section"><div class="section-title">Soil Conditions<button class="text-button" id="measurement-history">View History ${icon('arrow-up-right')}</button></div>${detailRows([['Soil Type',zone.soil_type],['Last Measurement',date(latest?.measured_at,true)]])}<div class="soil-mini-grid"><div>${icon('droplets')}<strong>${latest ? number(latest.moisture,1) : '—'}${latest ? '<small>%</small>' : ''}</strong><span>Moisture</span></div><div>${icon('thermometer')}<strong>${latest ? number(latest.temperature,1) : '—'}${latest ? '<small>°C</small>' : ''}</strong><span>Temperature</span></div><div>${icon('test-tube-2')}<strong>${latest ? number(latest.ph,1) : '—'}</strong><span>pH</span></div></div>${!latest ? '<p class="metric-footnote">Soil measurements: Not available</p>' : detailRows([['Measurement Source',latest.measurement_source || latest.source],['Sampling Depth',latest.sampling_depth_cm == null ? null : `${number(latest.sampling_depth_cm,1)} cm`]])}<button class="button button-secondary full-width" id="add-measurement">${icon('plus')}Add Measurement</button></section>
      <section class="inspector-section"><div class="section-title">Monitoring</div>${detailRows([['Number of Measurements',number(zone.measurement_count)],['Active Alerts',number(zone.analysis.warnings.length)],['Latest Assessment',assessmentLabels[zone.analysis.status]],['Assessed At',date(zone.analysis.evaluated_at,true)]])}${analysisHTML(zone.analysis)}${disclaimer()}</section>
      <section class="inspector-section"><div class="section-title">Restoration</div>${detailRows([['Restoration Status',zone.status === 'restored' ? 'Restored' : zone.status === 'restoring' ? 'In progress' : 'Not started'],['Completed Activities',number(zone.completed_activity_count)],['Last Activity Date',date(zone.last_activity_date)]])}<button class="button button-primary full-width" id="zone-activity">${icon('sprout')}Record Activity</button></section>`;
    icons();
    inspector.querySelector('#edit-zone').onclick = () => zoneForm(context.projectId, null, context.refresh, zone);
    inspector.querySelector('#add-measurement').onclick = () => measurementForm(summary.zones, id, context.refresh);
    inspector.querySelector('#measurement-history').onclick = () => context.navigate('monitoring', id);
    inspector.querySelector('#zone-activity').onclick = () => activityForm(context.projectId, summary.zones, id, context.refresh);
    inspector.querySelector('#edit-geometry').onclick = async () => {
      editing = true;
      await map.startEditing(id);
      inspector.querySelectorAll('button').forEach((button) => button.disabled = true);
      container.querySelector('#geometry-actions').hidden = false;
      container.querySelector('#draw-zone').disabled = true;
      container.querySelectorAll('[data-status]').forEach((button) => button.disabled = true);
    };
  }
  selectZone(selectedId);
  container.querySelector('#fit-map').onclick = () => map.fit();
  container.querySelectorAll('[data-status]').forEach((button) => button.onclick = () => {
    status = button.dataset.status;
    container.querySelectorAll('[data-status]').forEach((item) => item.classList.toggle('active', item === button));
    const filtered = geojson.features.filter((feature) => !status || feature.properties.status === status);
    map.setFeatures(filtered);
    if (!filtered.some((feature) => feature.properties.id === selectedId)) selectZone(filtered[0]?.properties.id);
    else map.select(selectedId);
  });
  container.querySelector('#draw-zone').onclick = async () => {
    container.querySelector('#draw-zone').disabled = true;
    container.querySelector('#drawing-banner').hidden = false;
    await map.startDrawing((geometry) => {
      container.querySelector('#drawing-banner').hidden = true;
      zoneForm(context.projectId, geometry, context.refresh);
    });
  };
  map.map.on('draw:drawstop', () => {
    container.querySelector('#drawing-banner').hidden = true;
    container.querySelector('#draw-zone').disabled = false;
  });
  container.querySelector('#cancel-draw').onclick = () => { map.cancelDrawing(); container.querySelector('#drawing-banner').hidden = true; };
  container.querySelector('#cancel-geometry').onclick = () => {
    map.finishEditing(true);
    editing = false;
    container.querySelector('#geometry-actions').hidden = true;
    container.querySelector('#draw-zone').disabled = false;
    container.querySelector('#inspector').querySelectorAll('button').forEach((button) => button.disabled = false);
    container.querySelectorAll('[data-status]').forEach((button) => button.disabled = false);
  };
  container.querySelector('#save-geometry').onclick = async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    const geometry = map.finishEditing();
    try {
      await api(`/zones/${selectedId}`, { method: 'PATCH', body: { geometry } });
      toast('Boundary saved. Area and volume recalculated.');
      await context.refresh(selectedId);
    } catch (error) {
      toast(error.message, true);
      await map.startEditing(selectedId);
      button.disabled = false;
    }
  };
  icons();
  return () => map.destroy();
}
