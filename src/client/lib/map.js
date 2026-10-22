import { displayText } from './localization.js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { escape, statusColors } from './ui.js';

window.L = L;
let drawPromise;

export async function createMap(element, features, { onSelect, interactive = true } = {}) {
  if (interactive) await (drawPromise ||= import('leaflet-draw'));
  const map = L.map(element, { zoomControl: interactive, scrollWheelZoom: interactive, doubleClickZoom: interactive, dragging: true, attributionControl: true }).setView([51.1055, 71.400], 15);
  const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
  }).addTo(map);
  let tileErrors = 0;
  let loaded = false;
  tileLayer.on('tileload', () => { loaded = true; element.classList.add('tiles-loaded'); });
  tileLayer.on('tileerror', () => {
    tileErrors++;
    if (tileErrors > 3 && !loaded && !element.querySelector('.tile-notice')) {
      const notice = document.createElement('div');
      notice.className = 'tile-notice';
      notice.textContent = 'Basemap unavailable · zone boundaries are still available';
      element.append(notice);
    }
  });
  L.control.scale({ imperial: false, position: 'bottomleft', maxWidth: 100 }).addTo(map);
  const layerGroup = L.geoJSON([], {
    style: (feature) => ({ color: statusColors[feature.properties.status], weight: 2, fillOpacity: 0.23 }),
    onEachFeature: (feature, layer) => {
      const name = displayText(feature.properties.name);
      layer.bindTooltip(`<span>${escape(name.split(' · ')[0])}</span>`, { permanent: true, direction: 'center', className: 'zone-label' });
      layer.on('click', () => onSelect?.(feature.properties.id));
      layer.on('add', () => {
        const path = layer.getElement();
        path?.setAttribute('tabindex', '0');
        path?.setAttribute('role', 'button');
        path?.setAttribute('aria-label', `Select ${name}`);
        path?.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(feature.properties.id); }
        });
      });
    }
  }).addTo(map);
  function setFeatures(nextFeatures) {
    layerGroup.clearLayers();
    layerGroup.addData({ type: 'FeatureCollection', features: nextFeatures });
  }
  setFeatures(features);
  const fullBounds = layerGroup.getBounds();
  function fit() {
    if (fullBounds.isValid()) map.fitBounds(fullBounds, { padding: interactive ? [45, 45] : [30, 30], maxZoom: 16 });
  }
  fit();
  const observer = new ResizeObserver(() => map.invalidateSize());
  observer.observe(element);
  let draw;
  let editLayer;
  let originalGeometry;
  return {
    map,
    fit,
    setFeatures,
    select(id) {
      layerGroup.eachLayer((layer) => {
        const selected = layer.feature.properties.id === id;
        layer.setStyle({ weight: selected ? 4 : 2, fillOpacity: selected ? 0.4 : 0.23, color: selected ? '#173d30' : statusColors[layer.feature.properties.status] });
        layer.getElement()?.setAttribute('aria-pressed', String(selected));
        if (selected) layer.bringToFront();
      });
    },
    async startDrawing(onCreated) {
      await (drawPromise ||= import('leaflet-draw'));
      if (!element.isConnected) return;
      draw?.disable();
      draw = new L.Draw.Polygon(map, { allowIntersection: false, showArea: false, shapeOptions: { color: '#244f3b', fillOpacity: 0.25 }, drawError: { color: '#c45b49', message: 'The boundary must not intersect itself.' } });
      map.once(L.Draw.Event.CREATED, (event) => onCreated(event.layer.toGeoJSON().geometry));
      L.drawLocal.draw.handlers.polygon.tooltip.start = 'Click to start drawing a boundary';
      L.drawLocal.draw.handlers.polygon.tooltip.cont = 'Click to add a vertex';
      L.drawLocal.draw.handlers.polygon.tooltip.end = 'Click the first vertex to finish';
      draw.enable();
    },
    cancelDrawing() { draw?.disable(); map.off('draw:created'); },
    async startEditing(id) {
      await (drawPromise ||= import('leaflet-draw'));
      layerGroup.eachLayer((layer) => {
        if (layer.feature.properties.id === id) {
          editLayer = layer;
          originalGeometry = layer.toGeoJSON().geometry;
          layer.editing.enable();
        }
      });
    },
    finishEditing(cancel = false) {
      if (!editLayer) return null;
      const geometry = editLayer.toGeoJSON().geometry;
      editLayer.editing.disable();
      if (cancel) editLayer.setLatLngs(L.GeoJSON.coordsToLatLngs(originalGeometry.coordinates, 1));
      editLayer = null;
      return geometry;
    },
    destroy() { observer.disconnect(); draw?.disable(); map.remove(); }
  };
}
