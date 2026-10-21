import { query } from '../db.js';
import { listZones } from '../repositories/zones.js';
import { listActivities } from '../repositories/activities.js';
import { moistureTrend, projectAnalysisMeasurements } from '../repositories/measurements.js';
import { analyzeMeasurements } from './analysis.js';

export async function projectSummary(projectId) {
  const [zones, measurements, trend, activities, projectCount] = await Promise.all([
    listZones(projectId), projectAnalysisMeasurements(projectId), moistureTrend(projectId), listActivities(projectId),
    query('SELECT count(*)::integer AS count FROM projects')
  ]);
  const evaluated = zones.map((zone) => ({ ...zone, analysis: analyzeMeasurements(measurements.filter((m) => m.zone_id === zone.id)) }));
  const sum = (items, field) => items.reduce((total, item) => total + item[field], 0);
  const attention = evaluated.filter((zone) => zone.analysis.warnings.length);
  return {
    project_count: projectCount.rows[0].count,
    zone_count: zones.length,
    active_zone_count: zones.filter((zone) => zone.status !== 'restored').length,
    soil_conditions: {
      moisture: averageLatest(zones, 'moisture'),
      temperature: averageLatest(zones, 'temperature'),
      ph: averageLatest(zones, 'ph'),
      measured_zone_count: zones.filter((zone) => zone.latest_measurement).length,
      latest_measurement_at: zones.map((zone) => zone.latest_measurement?.measured_at).filter(Boolean).sort().at(-1) || null
    },
    area_m2: sum(zones, 'area_m2'),
    attention_area_m2: sum(attention, 'area_m2'),
    restored_area_m2: sum(zones.filter((zone) => zone.status === 'restored'), 'area_m2'),
    estimated_volume_m3: sum(zones, 'volume_m3'),
    warning_count: evaluated.reduce((total, zone) => total + zone.analysis.warnings.length, 0),
    zones: evaluated,
    moisture_trend: trend,
    recent_activities: activities.slice(0, 5),
    activity_counts: {
      planned: activities.filter((a) => a.status === 'planned').length,
      in_progress: activities.filter((a) => a.status === 'in_progress').length,
      completed: activities.filter((a) => a.status === 'completed').length
    }
  };
}

function averageLatest(zones, field) {
  const values = zones.filter((zone) => zone.latest_measurement).map((zone) => zone.latest_measurement[field]);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}
