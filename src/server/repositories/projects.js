import { query } from '../db.js';
import { notFound } from '../errors.js';

export async function listProjects() {
  const { rows } = await query(`SELECT p.*, count(z.id)::integer AS zone_count,
    COALESCE(sum(ST_Area(z.geom::geography)),0)::float8 AS area_m2
    FROM projects p LEFT JOIN zones z ON z.project_id=p.id GROUP BY p.id ORDER BY p.id`);
  return rows;
}

export async function getProject(id) {
  const { rows: [project] } = await query('SELECT * FROM projects WHERE id=$1', [id]);
  if (!project) throw notFound('Site');
  return project;
}
