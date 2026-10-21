import { query } from '../db.js';
import { notFound } from '../errors.js';
import { validateGeometry } from '../services/gis.js';

const fields = `z.id, z.project_id, z.name, z.status, z.topsoil_depth_cm, z.created_at, z.updated_at,
  z.soil_type, z.description, z.survey_date::text, p.name AS project_name,
  ST_AsGeoJSON(z.geom)::json AS geometry, ST_Area(z.geom::geography)::float8 AS area_m2,
  (ST_Area(z.geom::geography)*z.topsoil_depth_cm/100)::float8 AS volume_m3,
  (SELECT row_to_json(m) FROM (SELECT *
    FROM soil_measurements WHERE zone_id=z.id ORDER BY measured_at DESC, id DESC LIMIT 1) m) AS latest_measurement,
  (SELECT count(*)::integer FROM soil_measurements WHERE zone_id=z.id) AS measurement_count,
  (SELECT count(*)::integer FROM activities WHERE zone_id=z.id AND status='completed') AS completed_activity_count,
  (SELECT max(occurred_at) FROM activities WHERE zone_id=z.id AND occurred_at<=now()) AS last_activity_date`;

export async function listZones(projectId, status) {
  const { rows } = await query(`SELECT ${fields} FROM zones z JOIN projects p ON p.id=z.project_id WHERE z.project_id=$1 AND ($2::text IS NULL OR z.status=$2) ORDER BY z.id`, [projectId, status || null]);
  return rows;
}

export async function getZone(id) {
  const { rows: [zone] } = await query(`SELECT ${fields} FROM zones z JOIN projects p ON p.id=z.project_id WHERE z.id=$1`, [id]);
  if (!zone) throw notFound('Zone');
  return zone;
}

export async function createZone(projectId, input) {
  await validateGeometry(input.geometry);
  const { rows: [zone] } = await query(`INSERT INTO zones(project_id,name,status,topsoil_depth_cm,geom,soil_type,description,survey_date)
    VALUES($1,$2,$3,$4,ST_SetSRID(ST_GeomFromGeoJSON($5),4326),$6,$7,$8) RETURNING id`,
  [projectId, input.name, input.status, input.topsoil_depth_cm, JSON.stringify(input.geometry), input.soil_type, input.description, input.survey_date]);
  return getZone(zone.id);
}

export async function updateZone(id, input) {
  await getZone(id);
  if (input.geometry) await validateGeometry(input.geometry);
  const sets = [];
  const values = [id];
  for (const key of ['name', 'status', 'topsoil_depth_cm', 'geometry', 'soil_type', 'description', 'survey_date']) {
    if (input[key] === undefined) continue;
    values.push(key === 'geometry' ? JSON.stringify(input[key]) : input[key]);
    sets.push(key === 'geometry' ? `geom=ST_SetSRID(ST_GeomFromGeoJSON($${values.length}),4326)` : `${key}=$${values.length}`);
  }
  await query(`UPDATE zones SET ${sets.join(',')}, updated_at=now() WHERE id=$1`, values);
  return getZone(id);
}

export function toGeoJSON(zones) {
  return {
    type: 'FeatureCollection',
    features: zones.map(({ geometry, ...properties }) => ({ type: 'Feature', id: properties.id, geometry, properties }))
  };
}
