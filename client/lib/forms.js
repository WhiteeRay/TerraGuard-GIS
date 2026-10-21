import { api } from './api.js';
import { displayText, preserveOriginal } from './localization.js';
import { escape, icons, icon, zoneLabels, activityLabels, activityStatusLabels, toast } from './ui.js';

const options = (labels, selected) => Object.entries(labels).map(([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`).join('');
const zoneOptions = (zones, selected) => zones.map((zone) => `<option value="${zone.id}"${zone.id === Number(selected) ? ' selected' : ''}>${escape(displayText(zone.name))}</option>`).join('');
const localNow = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const localDate = (value) => {
  const parsed = new Date(value);
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const changedDateTime = (value, original) => original && localDate(original) === value ? undefined : new Date(value).toISOString();

export function openForm({ title, description, fields, submitLabel = 'Save Changes', onSubmit, onClose }) {
  const dialog = document.querySelector('#form-dialog');
  dialog.innerHTML = `<form><div class="dialog-heading"><div><div class="eyebrow">TERRAGUARD GIS</div><h2 id="dialog-title">${title}</h2></div><button type="button" class="icon-button" data-close aria-label="Close">${icon('x')}</button></div><p class="dialog-description">${description}</p><div class="form-fields">${fields}</div><div class="form-error" role="alert" hidden></div><div class="dialog-footer"><button type="button" class="button button-secondary" data-close>Cancel</button><button class="button button-primary" type="submit">${icon('check')}${submitLabel}</button></div></form>`;
  dialog.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.onclose = () => { onClose?.(); dialog.innerHTML = ''; };
  dialog.showModal();
  icons();
  const form = dialog.querySelector('form');
  form.noValidate = true;
  let saving = false;
  dialog.oncancel = (event) => { if (saving) event.preventDefault(); };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;
    const invalid = validateForm(form);
    if (invalid) {
      const errorBox = form.querySelector('.form-error');
      errorBox.textContent = invalid.validationMessage;
      errorBox.hidden = false;
      invalid.setAttribute('aria-invalid', 'true');
      invalid.focus();
      return;
    }
    const button = form.querySelector('[type="submit"]');
    const errorBox = form.querySelector('.form-error');
    const values = Object.fromEntries(new FormData(form));
    const originalLabel = button.innerHTML;
    saving = true;
    button.disabled = true;
    button.textContent = 'Saving…';
    button.setAttribute('aria-busy', 'true');
    form.querySelectorAll('[data-close]').forEach((element) => element.disabled = true);
    errorBox.hidden = true;
    try {
      await onSubmit(values);
      dialog.close();
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      saving = false;
      button.disabled = false;
      button.innerHTML = originalLabel;
      button.removeAttribute('aria-busy');
      form.querySelectorAll('[data-close]').forEach((element) => element.disabled = false);
    }
  });
}

function validateForm(form) {
  for (const field of form.querySelectorAll('input,select,textarea')) {
    field.setCustomValidity('');
    field.removeAttribute('aria-invalid');
    const label = field.closest('label')?.childNodes[0]?.textContent?.trim() || 'This field';
    const state = field.validity;
    if (state.valueMissing || field.required && !field.value.trim()) field.setCustomValidity(`${label} is required.`);
    else if (state.badInput || state.typeMismatch) field.setCustomValidity(`Enter a valid value for ${label.toLowerCase()}.`);
    else if (state.rangeUnderflow) field.setCustomValidity(`${label} must be at least ${field.min}.`);
    else if (state.rangeOverflow) field.setCustomValidity(`${label} must not exceed ${field.max}.`);
    else if (state.stepMismatch) field.setCustomValidity(`Use increments of ${field.step} for ${label.toLowerCase()}.`);
    else if (state.tooLong) field.setCustomValidity(`${label} must not exceed ${field.maxLength} characters.`);
    if (!field.validity.valid) return field;
  }
  return null;
}

const optionalNumber = (value) => value === '' ? null : Number(value);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function measurementForm(zones, selected, onSaved, existing = null) {
  if (!zones.length) { toast('Create a monitoring zone on the GIS Map first.', true); return; }
  openForm({
    title: existing ? 'Edit Measurement' : 'Add Measurement',
    description: 'Record a manual observation. Saving updates the zone assessment and measurement charts.',
    submitLabel: existing ? 'Save Changes' : 'Add Measurement',
    fields: `<fieldset class="form-section"><legend>Observation</legend><label class="full">Monitoring Zone<select name="zone_id" required${existing ? ' disabled' : ''}>${zoneOptions(zones, existing?.zone_id || selected)}</select></label><label>Soil Moisture (%)<input name="moisture" type="number" min="0" max="100" step="0.1" value="${existing?.moisture ?? ''}" placeholder="35.0" required></label><label>Soil Temperature (°C)<input name="temperature" type="number" min="-60" max="80" step="0.1" value="${existing?.temperature ?? ''}" placeholder="12.5" required></label><label>Soil pH<input name="ph" type="number" min="0" max="14" step="0.1" value="${existing?.ph ?? ''}" placeholder="6.8" required></label><label>Date & Time · local<input name="measured_at" type="datetime-local" value="${existing ? localDate(existing.measured_at) : localNow()}" max="${localNow()}" required></label></fieldset><fieldset class="form-section"><legend>Sampling Details</legend><label>Sampling Depth (cm)<input name="sampling_depth_cm" type="number" min="0.1" max="300" step="0.1" value="${existing?.sampling_depth_cm ?? ''}" placeholder="Optional"></label><label>Measurement Source<input name="measurement_source" maxlength="120" value="${escape(displayText(existing?.source || 'Manual observation'))}" placeholder="Optional"></label><label class="full">Recorded By<input name="recorded_by" maxlength="120" value="${escape(existing?.recorded_by)}" placeholder="Optional"></label><label class="full">Notes<textarea name="notes" maxlength="2000" rows="3" placeholder="Optional · sampling conditions and observations">${escape(existing?.notes)}</textarea></label></fieldset>`,
    onSubmit: async (data) => {
      const zoneId = existing?.zone_id || Number(data.zone_id);
      await api(existing ? `/measurements/${existing.id}` : `/zones/${zoneId}/measurements`, { method: existing ? 'PATCH' : 'POST', body: { moisture: Number(data.moisture), temperature: Number(data.temperature), ph: Number(data.ph), measured_at: changedDateTime(data.measured_at, existing?.measured_at), measurement_source: preserveOriginal(data.measurement_source || 'Unknown source', existing?.source), sampling_depth_cm: optionalNumber(data.sampling_depth_cm), recorded_by: data.recorded_by || null, notes: data.notes || null } });
      toast(existing ? 'Measurement updated.' : 'Measurement saved.');
      await onSaved(zoneId);
    }
  });
}

export function zoneForm(projectId, geometry, onSaved, existing = null, onClose) {
  openForm({
    title: existing ? 'Edit Zone' : 'Create Monitoring Zone',
    description: existing ? 'Update site attributes and topsoil thickness. Area and estimated volume are recalculated when saved.' : 'Boundary drawn. Add the monitoring zone details and topsoil thickness.',
    submitLabel: existing ? 'Save Changes' : 'Create Zone',
    fields: `<fieldset class="form-section"><legend>General Information</legend><label class="full">Zone Name<input name="name" maxlength="160" value="${escape(displayText(existing?.name))}" placeholder="For example, Zone F · Landscaping" required></label><label>Zone Status<select name="status">${options(zoneLabels, existing?.status || 'planned')}</select></label><label>Survey Date<input name="survey_date" type="date" value="${existing?.survey_date || ''}" max="${today()}"><span class="field-hint">Optional</span></label><label class="full">Description<textarea name="description" maxlength="2000" rows="3" placeholder="Optional · site conditions and monitoring purpose">${escape(displayText(existing?.description))}</textarea></label></fieldset><fieldset class="form-section"><legend>Soil & Geometry</legend><label>Soil Type<input name="soil_type" list="soil-types" maxlength="80" value="${escape(existing?.soil_type)}" placeholder="Optional"><datalist id="soil-types"><option value="Loam"><option value="Sandy loam"><option value="Clay loam"><option value="Clay"><option value="Sand"><option value="Silt"></datalist></label><label>Topsoil Thickness (cm)<input name="topsoil_depth_cm" type="number" min="0.1" max="300" step="0.1" value="${existing?.topsoil_depth_cm || 30}" required></label><div class="form-note full">${icon('ruler')}<span>Estimated volume = area (m²) × thickness (cm) / 100.<br>Actual work volumes are recorded separately.</span></div></fieldset>`,
    onClose,
    onSubmit: async (data) => {
      const result = await api(existing ? `/zones/${existing.id}` : `/projects/${projectId}/zones`, { method: existing ? 'PATCH' : 'POST', body: { name: preserveOriginal(data.name, existing?.name), status: data.status, topsoil_depth_cm: Number(data.topsoil_depth_cm), soil_type: data.soil_type || null, description: preserveOriginal(data.description, existing?.description) || null, survey_date: data.survey_date || null, ...(!existing ? { geometry } : {}) } });
      toast(existing ? 'Zone updated.' : 'Zone created.');
      await onSaved(result.id);
    }
  });
}

export function activityForm(projectId, zones, selected, onSaved, existing = null) {
  if (!zones.length) { toast('Create a monitoring zone on the GIS Map first.', true); return; }
  openForm({
    title: existing ? 'Edit Activity' : 'Record Activity',
    description: 'Record topsoil preservation and restoration work. Keep planned and actual volumes separate.',
    submitLabel: existing ? 'Save Changes' : 'Record Activity',
    fields: `<fieldset class="form-section"><legend>Activity Details</legend><label class="full">Monitoring Zone<select name="zone_id" required>${zoneOptions(zones, existing?.zone_id || selected)}</select></label><label class="full">Activity Type<select name="type">${options(activityLabels, existing?.type || 'stripping')}</select></label><label>Status<select name="status">${options(activityStatusLabels, existing?.status || 'planned')}</select></label><label>Activity Date & Time · local<input name="occurred_at" type="datetime-local" value="${existing ? localDate(existing.occurred_at) : localNow()}" required></label><label class="full">Responsible Person<input name="responsible_person" maxlength="120" value="${escape(existing?.responsible_person)}" placeholder="Optional"></label></fieldset><fieldset class="form-section"><legend>Schedule & Volumes</legend><label>Planned Date<input name="planned_date" type="date" value="${existing?.planned_date || ''}"><span class="field-hint">Optional</span></label><label>Completed Date<input name="completed_date" type="date" value="${existing?.completed_date || ''}" max="${today()}"><span class="field-hint">Optional</span></label><label>Planned Volume (m³)<input name="planned_volume_m3" type="number" min="0" max="10000000000" step="0.1" value="${existing?.planned_volume_m3 ?? ''}" placeholder="Optional"></label><label>Actual Volume (m³)<input name="actual_volume_m3" type="number" min="0" max="10000000000" step="0.1" value="${existing?.actual_volume_m3 ?? ''}" placeholder="Optional"></label><label class="full">Notes<textarea name="notes" maxlength="2000" rows="3" placeholder="Optional · work conditions, observations and outcomes">${escape(displayText(existing?.note))}</textarea></label></fieldset>`,
    onSubmit: async (data) => {
      await api(existing ? `/activities/${existing.id}` : `/projects/${projectId}/activities`, { method: existing ? 'PATCH' : 'POST', body: { ...data, zone_id: Number(data.zone_id), occurred_at: changedDateTime(data.occurred_at, existing?.occurred_at), planned_date: data.planned_date || null, completed_date: data.completed_date || null, responsible_person: data.responsible_person || null, notes: preserveOriginal(data.notes, existing?.note), planned_volume_m3: optionalNumber(data.planned_volume_m3), actual_volume_m3: optionalNumber(data.actual_volume_m3) } });
      toast(existing ? 'Activity updated.' : 'Activity recorded.');
      await onSaved();
    }
  });
}
