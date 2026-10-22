import { createIcons, LayoutDashboard, Map, MapPin, Activity, Sprout, Leaf, Layers3, Menu, FlaskConical, ArrowUpRight, ArrowRight, Plus, X, ChevronRight, ChevronDown, CircleCheck, TriangleAlert, Droplets, Thermometer, TestTube2, Ruler, Box, Maximize, LocateFixed, Pencil, RefreshCw, CalendarDays, ClipboardList, Filter, Search, Check, Clock3, CircleHelp, Download, Circle, MoveUpRight, ShieldCheck, Crosshair, Save } from 'lucide';

export function icons() {
  createIcons({ icons: { LayoutDashboard, Map, MapPin, Activity, Sprout, Leaf, Layers3, Menu, FlaskConical, ArrowUpRight, ArrowRight, Plus, X, ChevronRight, ChevronDown, CircleCheck, TriangleAlert, Droplets, Thermometer, TestTube2, Ruler, Box, Maximize, LocateFixed, Pencil, RefreshCw, CalendarDays, ClipboardList, Filter, Search, Check, Clock3, CircleHelp, Download, Circle, MoveUpRight, ShieldCheck, Crosshair, Save }, attrs: { 'stroke-width': 1.7 } });
}

export const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
export const number = (value, digits = 0) => value == null ? 'Not available' : new Intl.NumberFormat('en-GB', { maximumFractionDigits: digits }).format(value);
export const date = (value, time = false) => value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: 'Asia/Almaty' }).format(new Date(value)) : 'Not available';
export const shortDate = (value) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Almaty' }).format(new Date(value));
export const assessmentLabels = { normal: 'Within demo range', attention: 'Attention required', critical: 'Critical', insufficient_data: 'Insufficient data' };
export const zoneLabels = { planned: 'Planned', stripping: 'Stripping', stored: 'Storage', restoring: 'Restoration', restored: 'Restored' };
export const activityLabels = { stripping: 'Topsoil Stripping', movement: 'Soil Transport', storage: 'Temporary Storage', reuse: 'Soil Reuse', restoration: 'Land Restoration' };
export const activityStatusLabels = { planned: 'Planned', in_progress: 'In Progress', completed: 'Completed' };
export const statusColors = { planned: '#71899d', stripping: '#c28b3d', stored: '#8778a4', restoring: '#4c91ac', restored: '#41886a' };
export const icon = (name, className = '') => `<i data-lucide="${name}"${className ? ` class="${className}"` : ''}></i>`;
export const badge = (status, activity = false) => `<span class="status-badge status-${escape(status)}"><span></span>${escape((activity ? activityStatusLabels : zoneLabels)[status] || status)}</span>`;
export const empty = (title, text = '', symbol = 'clipboard-list') => `<div class="empty-state">${icon(symbol)}<strong>${escape(title)}</strong><p>${escape(text)}</p></div>`;
export const loading = () => '<div class="loading-state"><span class="spinner"></span><span>Loading site data…</span></div>';

export function toast(message, error = false) {
  const element = document.createElement('div');
  element.className = `toast ${error ? 'toast-error' : ''}`;
  element.setAttribute('role', error ? 'alert' : 'status');
  element.textContent = message;
  document.querySelector('#toast-container').append(element);
  setTimeout(() => element.remove(), 4500);
}

export function heading(eyebrow, title, description, action = '') {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}

export function analysisHTML(analysis, compact = false) {
  if (!analysis) return '';
  if (!analysis.warnings.length) return `<div class="healthy-note">${icon('circle-check')}<span>Conditions are within the demonstration ranges.${compact ? '' : ' Continue routine monitoring.'}</span></div>`;
  const value = (item, unit) => item == null ? 'Not available' : `${Array.isArray(item) ? item.join('–') : typeof item === 'number' ? number(item, 2) : item}${typeof item === 'number' || Array.isArray(item) ? ` ${unit || ''}` : ''}`;
  return analysis.warnings.map((warning) => `<div class="warning-item ${warning.severity === 'critical' ? 'critical' : ''}">${icon('triangle-alert')}<div><div class="warning-heading"><strong>${escape(warning.title)}</strong><span class="severity-badge">${warning.severity === 'critical' ? 'Critical' : 'Warning'}</span></div><p>${escape(warning.explanation)}</p>${compact ? '' : `<dl class="rule-meta"><div><dt>Observed Value</dt><dd>${escape(value(warning.actual, warning.unit))}</dd></div><div><dt>Threshold</dt><dd>${escape(value(warning.threshold, warning.unit))}</dd></div></dl><div class="recommendation"><strong>Recommended Action</strong><p>${escape(warning.recommendation)}</p></div>`}</div></div>`).join('');
}

export const disclaimer = () => `<div class="analysis-disclaimer">${icon('circle-help')}<span>Demonstration thresholds, not regulatory standards. Preliminary recommendations require review by an environmental specialist.</span></div>`;

export function serializeCSV(rows) {
  const safe = (value) => {
    let result = String(value ?? '');
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(result)) result = `'${result}`;
    return `"${result.replaceAll('"', '""')}"`;
  };
  return '\ufeff' + rows.map((row) => row.map(safe).join(';')).join('\r\n');
}

export function downloadCSV(filename, rows) {
  const blob = new Blob([serializeCSV(rows)], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
