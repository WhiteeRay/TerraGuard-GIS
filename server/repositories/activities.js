import { query } from '../db.js';
import { HttpError, notFound } from '../errors.js';

export async function listActivities(projectId, zoneId) {
  const { rows } = await query(`SELECT a.*, a.planned_date::text, a.completed_date::text, z.name AS zone_name FROM activities a JOIN zones z ON z.id=a.zone_id
    WHERE a.project_id=$1 AND ($2::integer IS NULL OR a.zone_id=$2)
    ORDER BY a.occurred_at DESC, a.id DESC LIMIT 1000`, [projectId, zoneId || null]);
  return rows;
}

async function checkZone(projectId, zoneId) {
  const { rows } = await query('SELECT 1 FROM zones WHERE project_id=$1 AND id=$2', [projectId, zoneId]);
  if (!rows.length) throw new HttpError(422, 'The selected zone does not belong to this site.');
}

export async function createActivity(projectId, input) {
  await checkZone(projectId, input.zone_id);
  const { rows: [activity] } = await query(`INSERT INTO activities(project_id,zone_id,type,status,occurred_at,planned_volume_m3,actual_volume_m3,note,responsible_person,planned_date,completed_date)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *,planned_date::text,completed_date::text`, [projectId, input.zone_id, input.type, input.status, input.occurred_at, input.planned_volume_m3, input.actual_volume_m3, input.note, input.responsible_person, input.planned_date, input.completed_date]);
  return activity;
}

export async function updateActivity(id, input) {
  const { rows: [existing] } = await query('SELECT * FROM activities WHERE id=$1', [id]);
  if (!existing) throw notFound('Activity');
  if (input.zone_id) await checkZone(existing.project_id, input.zone_id);
  const values = [id];
  const sets = Object.keys(input).map((key) => {
    values.push(input[key]);
    return `${key}=$${values.length}`;
  });
  const { rows: [activity] } = await query(`UPDATE activities SET ${sets.join(',')},updated_at=now() WHERE id=$1 RETURNING *,planned_date::text,completed_date::text`, values);
  return activity;
}
