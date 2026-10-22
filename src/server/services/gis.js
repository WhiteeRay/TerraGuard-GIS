import { query } from '../db.js';
import { HttpError } from '../errors.js';

export function calculateVolume(areaM2, depthCm) {
  if (!Number.isFinite(areaM2) || areaM2 <= 0 || !Number.isFinite(depthCm) || depthCm <= 0) throw new HttpError(422, 'Area and thickness must be positive.');
  return areaM2 * depthCm / 100;
}

export async function validateGeometry(geometry) {
  const { rows: [result] } = await query(`
    WITH shape AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS geom)
    SELECT ST_IsValid(geom) AS valid, ST_IsValidReason(geom) AS reason,
      ST_Area(geom::geography) AS area_m2 FROM shape`, [JSON.stringify(geometry)]);
  if (!result.valid || result.area_m2 <= 0 || result.area_m2 > 1e10) throw new HttpError(422, 'Invalid polygon. Check intersections and area.', { reason: result.reason });
  return result;
}
