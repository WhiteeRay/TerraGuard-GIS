import { displayText } from './lib/localization.js';
import './style.css';
import './refinements.css';
import { api } from './lib/api.js';
import { icons, loading, escape, icon } from './lib/ui.js';
import { renderOverview } from './views/overview.js';
import { renderGIS } from './views/gis.js';
import { renderMonitoring } from './views/monitoring.js';
import { renderRestoration } from './views/restoration.js';

const views = { overview: renderOverview, map: renderGIS, monitoring: renderMonitoring, restoration: renderRestoration };
const titles = { overview: 'Overview', map: 'GIS Map', monitoring: 'Soil Monitoring', restoration: 'Preservation & Restoration' };
const content = document.querySelector('#content');
const projectSelect = document.querySelector('#project-select');
let projectId;
let projects = [];
let selectedZone;
let dispose;
let version = 0;

function currentView() { return views[location.hash.slice(1)] ? location.hash.slice(1) : 'overview'; }
function navigate(view, zoneId) {
  if (zoneId) selectedZone = zoneId;
  if (location.hash === `#${view}`) refresh();
  else location.hash = view;
}

async function refresh(zoneId) {
  if (typeof zoneId === 'number') selectedZone = zoneId;
  const requestVersion = ++version;
  dispose?.();
  dispose = null;
  const view = currentView();
  document.querySelector('#section-name').textContent = titles[view];
  document.title = `${titles[view]} — TerraGuard GIS`;
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.classList.toggle('active', link.dataset.nav === view);
    if (link.dataset.nav === view) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  setMenu(false);
  content.innerHTML = loading();
  try {
    if (!projectId) return;
    const [summary, geojson] = await Promise.all([api(`/projects/${projectId}/summary`), api(`/projects/${projectId}/zones`)]);
    if (requestVersion !== version) return;
    if (!summary.zones.some((zone) => zone.id === selectedZone)) selectedZone = summary.zones[0]?.id;
    const viewContainer = document.createElement('div');
    content.replaceChildren(viewContainer);
    const cleanup = await views[view](viewContainer, { projectId, summary, geojson, selectedZone, navigate, refresh, setSelected: (id) => { selectedZone = id; } });
    if (requestVersion !== version) cleanup?.(); else dispose = cleanup;
  } catch (error) {
    if (requestVersion !== version) return;
    content.innerHTML = `<div class="error-state">${icon('triangle-alert')}<h1>Could not load this site</h1><p>${escape(error.message)}</p><button class="button button-primary" id="retry">${icon('refresh-cw')}Try Again</button><span>Start the database and application: docker compose up --build</span></div>`;
    content.querySelector('#retry').onclick = init;
    icons();
  }
}

async function init() {
  content.innerHTML = loading();
  try {
    projects = await api('/projects');
    if (!projects.length) { content.innerHTML = '<div class="empty-state"><h1>No construction sites yet</h1><p>Initialize the demo dataset: npm run db:seed</p></div>'; projectSelect.innerHTML = '<option>No sites</option>'; projectSelect.disabled = true; return; }
    let saved;
    try { saved = Number(localStorage.getItem('terraguard-project')); } catch {}
    projectId = projects.some((project) => project.id === (projectId || saved)) ? projectId || saved : projects[0].id;
    projectSelect.innerHTML = projects.map((project) => `<option value="${project.id}"${project.id === projectId ? ' selected' : ''}>${escape(displayText(project.name))}</option>`).join('');
    projectSelect.disabled = false;
    await refresh();
  } catch (error) {
    projectSelect.innerHTML = '<option>Not connected</option>';
    content.innerHTML = `<div class="error-state">${icon('triangle-alert')}<h1>Cannot connect to site data</h1><p>${escape(error.message)}</p><button class="button button-primary" id="retry">${icon('refresh-cw')}Try Again</button><span>Start PostgreSQL/PostGIS: docker compose up --build</span></div>`;
    content.querySelector('#retry').onclick = init;
    icons();
  }
}

projectSelect.onchange = () => {
  projectId = Number(projectSelect.value);
  selectedZone = null;
  try { localStorage.setItem('terraguard-project', String(projectId)); } catch {}
  refresh();
};
const menuButton = document.querySelector('#menu-toggle');
const sidebar = document.querySelector('#sidebar');
const menuBackdrop = document.createElement('div');
menuBackdrop.className = 'menu-backdrop';
menuBackdrop.hidden = true;
document.body.append(menuBackdrop);
function setMenu(open) {
  sidebar.classList.toggle('is-open', open);
  menuBackdrop.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  sidebar.inert = window.innerWidth <= 1023 && !open;
  if (open) sidebar.querySelector('nav a').focus();
}
menuButton.onclick = () => setMenu(!sidebar.classList.contains('is-open'));
menuBackdrop.onclick = () => { setMenu(false); menuButton.focus(); };
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && sidebar.classList.contains('is-open')) { setMenu(false); menuButton.focus(); }
  if (event.key === 'Tab' && sidebar.classList.contains('is-open')) {
    const links = [...sidebar.querySelectorAll('a')];
    if (event.shiftKey && document.activeElement === links[0]) { event.preventDefault(); links.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === links.at(-1)) { event.preventDefault(); links[0].focus(); }
  }
});
window.addEventListener('resize', () => setMenu(false));
setMenu(false);
window.addEventListener('hashchange', () => refresh());
icons();
init();
