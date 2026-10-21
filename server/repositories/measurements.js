import { query } from '../db.js';
import { notFound } from '../errors.js';

export async function listMeasurements(zoneId, days) {
  const { rows } = await query(`SELECT * FROM soil_measurements WHERE zone_id=$1
    AND measured_at >= now() - make_interval(days => $2) ORDER BY measured_at DESC, id DESC LIMIT 5000`, [zoneId, days]);
  return rows;
}

export async function latestMeasurements(zoneId) {
  const { rows } = await query('SELECT * FROM soil_measurements WHERE zone_id=$1 ORDER BY measured_at DESC, id DESC LIMIT 2', [zoneId]);
  return rows;
}

export async function projectAnalysisMeasurements(projectId) {
  const { rows } = await query(`SELECT m.* FROM zones z CROSS JOIN LATERAL
    (SELECT * FROM soil_measurements WHERE zone_id=z.id ORDER BY measured_at DESC, id DESC LIMIT 2) m
    WHERE z.project_id=$1`, [projectId]);
  return rows;
}

export async function createMeasurement(zoneId, input) {
  const { rows: [measurement] } = await query(`INSERT INTO soil_measurements(zone_id,moisture,temperature,ph,measured_at,source,sampling_depth_cm,recorded_by,notes)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [zoneId, input.moisture, input.temperature, input.ph, input.measured_at, input.source, input.sampling_depth_cm, input.recorded_by, input.notes]);
  return measurement;
}

export async function updateMeasurement(id, input) {
  const values = [id];
  const sets = Object.keys(input).map((key) => { values.push(input[key]); return `${key}=$${values.length}`; });
  const { rows: [measurement] } = await query(`UPDATE soil_measurements SET ${sets.join(',')},updated_at=now() WHERE id=$1 RETURNING *`, values);
  if (!measurement) throw notFound('Measurement');
  return measurement;
}

export async function moistureTrend(projectId, days = 14) {
  const { rows } = await query(`SELECT (m.measured_at AT TIME ZONE 'Asia/Almaty')::date::text AS date,
    round(avg(m.moisture)::numeric,2)::float8 AS moisture,
    count(*)::integer AS count FROM soil_measurements m JOIN zones z ON z.id=m.zone_id
    WHERE z.project_id=$1 AND m.measured_at >= now()-make_interval(days => $2)
    GROUP BY 1 ORDER BY 1`, [projectId, days]);
  return rows;
}
