import { HttpError } from './errors.js';

export const zoneStatuses = ['planned', 'stripping', 'stored', 'restoring', 'restored'];
export const activityStatuses = ['planned', 'in_progress', 'completed'];
export const activityTypes = ['stripping', 'movement', 'storage', 'reuse', 'restoration'];

export function id(value) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0 || Number(value) > 2147483647) {
    throw new HttpError(400, 'Invalid identifier.');
  }
  return Number(value);
}

const fieldLabels = { name: 'Zone name', status: 'Status', topsoil_depth_cm: 'Topsoil thickness', moisture: 'Soil moisture', temperature: 'Soil temperature', ph: 'Soil pH', source: 'Measurement source', sampling_depth_cm: 'Sampling depth', recorded_by: 'Recorded by', soil_type: 'Soil type', description: 'Description', responsible_person: 'Responsible person', planned_volume_m3: 'Planned volume', actual_volume_m3: 'Actual volume', notes: 'Notes' };
const fieldLabel = (field) => fieldLabels[field] || field.replaceAll('_', ' ');

function fail(field, message) {
  throw new HttpError(422, message, { field });
}

export function text(value, field, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(field, `${fieldLabel(field)} must contain 1 to ${max} characters.`);
  return value.trim();
}

export function number(value, field, min, max, exclusiveMin = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value > max || (exclusiveMin ? value <= min : value < min)) {
    fail(field, `${fieldLabel(field)} must be ${exclusiveMin ? 'greater than' : 'at least'} ${min} and no more than ${max}.`);
  }
  return value;
}

function enumeration(value, options, field) {
  if (!options.includes(value)) fail(field, `Choose a valid ${fieldLabel(field).toLowerCase()}.`);
  return value;
}

export function dateTime(value, field, allowFuture = false) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) fail(field, 'Provide a date and time with a timezone.');
  const parsed = new Date(value);
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) fail(field, 'Provide a valid calendar date.');
  if (parsed.getUTCFullYear() < 2000 || parsed.getUTCFullYear() > 2100) fail(field, 'The date must be between 2000 and 2100.');
  if (!allowFuture && parsed.getTime() > Date.now() + 60000) fail(field, 'Measurement time cannot be in the future.');
  return parsed.toISOString();
}

export function geometry(value) {
  if (!value || value.type !== 'Polygon' || !Array.isArray(value.coordinates) || !value.coordinates.length || value.coordinates.length > 50) fail('geometry', 'A GeoJSON Polygon is required.');
  let count = 0;
  for (const ring of value.coordinates) {
    if (!Array.isArray(ring) || ring.length < 4) fail('geometry', 'A ring requires at least three vertices.');
    count += ring.length;
    if (count > 5000) fail('geometry', 'The polygon has too many vertices.');
    for (const point of ring) {
      if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 85) fail('geometry', 'Use [longitude, latitude] coordinates, with latitude between -85 and 85.');
    }
    if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) fail('geometry', 'The polygon ring must be closed.');
  }
  return { type: 'Polygon', coordinates: value.coordinates };
}

function bodyObject(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('body', 'A JSON object is required.');
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unknown.length) fail(unknown[0], `Unknown field: ${unknown[0]}`);
}

export function zoneInput(body, partial = false) {
  bodyObject(body, ['name', 'status', 'topsoil_depth_cm', 'geometry', 'soil_type', 'description', 'survey_date']);
  const result = {};
  if (!partial || body.name !== undefined) result.name = text(body.name, 'name');
  if (!partial || body.status !== undefined) result.status = enumeration(body.status ?? 'planned', zoneStatuses, 'status');
  if (!partial || body.topsoil_depth_cm !== undefined) result.topsoil_depth_cm = number(body.topsoil_depth_cm, 'topsoil_depth_cm', 0, 300, true);
  if (!partial || body.geometry !== undefined) result.geometry = geometry(body.geometry);
  optionalTextFields(body, result, { soil_type: 80, description: 2000 }, partial);
  if (!partial || body.survey_date !== undefined) result.survey_date = optionalDate(body.survey_date, 'survey_date');
  if (!Object.keys(result).length) fail('body', 'No fields to update.');
  return result;
}

export function measurementInput(body, partial = false) {
  bodyObject(body, ['moisture', 'temperature', 'ph', 'measured_at', 'source', 'measurement_source', 'sampling_depth_cm', 'recorded_by', 'notes']);
  const result = {};
  for (const [field, min, max] of [['moisture',0,100], ['temperature',-60,80], ['ph',0,14]]) {
    if (!partial || body[field] !== undefined) result[field] = number(body[field], field, min, max);
  }
  if (!partial || body.measured_at !== undefined) result.measured_at = dateTime(body.measured_at, 'measured_at');
  if (body.source !== undefined && body.measurement_source !== undefined && body.source !== body.measurement_source) fail('measurement_source', 'Source fields must match.');
  if (!partial || body.source !== undefined || body.measurement_source !== undefined) result.source = text(body.measurement_source ?? body.source ?? 'Unknown source', 'source', 120);
  if (!partial || body.sampling_depth_cm !== undefined) result.sampling_depth_cm = body.sampling_depth_cm == null ? null : number(body.sampling_depth_cm, 'sampling_depth_cm', 0, 300, true);
  optionalTextFields(body, result, { recorded_by: 120, notes: 2000 }, partial);
  if (!Object.keys(result).length) fail('body', 'No fields to update.');
  return result;
}

export function activityInput(body, partial = false) {
  bodyObject(body, ['zone_id', 'type', 'status', 'occurred_at', 'planned_volume_m3', 'actual_volume_m3', 'note', 'notes', 'responsible_person', 'planned_date', 'completed_date']);
  const result = {};
  if (!partial || body.zone_id !== undefined) result.zone_id = id(body.zone_id);
  if (!partial || body.type !== undefined) result.type = enumeration(body.type, activityTypes, 'type');
  if (!partial || body.status !== undefined) result.status = enumeration(body.status ?? 'planned', activityStatuses, 'status');
  if (!partial || body.occurred_at !== undefined) result.occurred_at = dateTime(body.occurred_at, 'occurred_at', true);
  for (const field of ['planned_volume_m3', 'actual_volume_m3']) {
    if (!partial || body[field] !== undefined) result[field] = body[field] == null ? null : number(body[field], field, 0, 1e10);
  }
  if (body.note !== undefined && body.notes !== undefined && body.note !== body.notes) fail('notes', 'Notes fields must match.');
  if (!partial || body.note !== undefined || body.notes !== undefined) result.note = body.notes || body.note ? text(body.notes ?? body.note, 'notes', 2000) : '';
  optionalTextFields(body, result, { responsible_person: 120 }, partial);
  for (const field of ['planned_date', 'completed_date']) {
    if (!partial || body[field] !== undefined) result[field] = optionalDate(body[field], field, field === 'planned_date');
  }
  if (!Object.keys(result).length) fail('body', 'No fields to update.');
  return result;
}

function optionalTextFields(body, result, fields, partial) {
  for (const [field, max] of Object.entries(fields)) {
    if (!partial || body[field] !== undefined) result[field] = body[field] == null || body[field] === '' ? null : text(body[field], field, max);
  }
}

export function optionalDate(value, field, allowFuture = false) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(field, 'Use a date in YYYY-MM-DD format.');
  dateTime(`${value}T00:00:00Z`, field, true);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (!allowFuture && value > today) fail(field, 'This date cannot be in the future.');
  return value;
}

export function periodInput(params) {
  const days = Number(params.days ?? 14);
  if (![7, 14, 30, 90, 365].includes(days)) fail('days', 'Supported periods: 7, 14, 30, 90 or 365 days.');
  return days;
}
