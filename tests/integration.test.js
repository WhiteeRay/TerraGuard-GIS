import test from 'node:test';
import assert from 'node:assert/strict';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('PostGIS and API persistence lifecycle', { skip: databaseUrl ? false : 'Set TEST_DATABASE_URL to a migrated PostgreSQL/PostGIS database' }, async (t) => {
  assert.match(new URL(databaseUrl).pathname, /test/i, 'Integration tests require a separate test database.');
  process.env.DATABASE_URL = databaseUrl;
  const { pool } = await import('../server/db.js');
  const { app } = await import('../server/app.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let projectId;
  const request = async (path, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  };
  try {
    const { rows: [project] } = await pool.query("INSERT INTO projects(name,location) VALUES('Integration test','Synthetic') RETURNING id");
    projectId = project.id;
    assert.equal((await request('/health')).status, 200);
    assert.equal((await request('/projects/2147483647')).status, 404);
    assert.equal((await request('/zones/not-an-id')).status, 400);
    const polygon = { type: 'Polygon', coordinates: [[[71.4,51.1],[71.401,51.1],[71.401,51.101],[71.4,51.101],[71.4,51.1]]] };
    const created = await request(`/projects/${projectId}/zones`, 'POST', { name: 'Test Zone', status: 'planned', topsoil_depth_cm: 30, geometry: polygon, soil_type: 'Loam', description: 'Synthetic integration boundary', survey_date: '2026-01-01' });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const zone = created.data;
    assert.equal(zone.soil_type, 'Loam');
    assert.equal(zone.survey_date, '2026-01-01');
    assert.equal(zone.project_name, 'Integration test');
    assert.equal((await request(`/zones/${zone.id}`, 'PATCH', { survey_date: '2026-02-30' })).status, 422);
    await t.test('area uses geographic square meters at Astana latitude', () => {
      assert.ok(zone.area_m2 > 7500 && zone.area_m2 < 8000, String(zone.area_m2));
      assert.ok(Math.abs(zone.volume_m3 - zone.area_m2 * 0.3) < 0.001);
    });
    assert.equal((await request(`/projects/${projectId}/zones`)).data.features[0].id, zone.id);
    assert.equal((await request(`/zones/${zone.id}/analysis`)).data.status, 'insufficient_data');
    const measurement = { moisture: 10, temperature: 14, ph: 8.5, measured_at: new Date().toISOString(), source: 'Integration', sampling_depth_cm: 20, recorded_by: 'QA verifier', notes: 'Synthetic sample' };
    assert.equal((await request(`/zones/${zone.id}/measurements`, 'POST', { ...measurement, moisture: 101 })).status, 422);
    const savedMeasurement = await request(`/zones/${zone.id}/measurements`, 'POST', measurement);
    assert.equal(savedMeasurement.status, 201);
    assert.equal(savedMeasurement.data.measurement.sampling_depth_cm, 20);
    assert.equal(savedMeasurement.data.measurement.recorded_by, 'QA verifier');
    assert.equal(savedMeasurement.data.measurement.measurement_source, 'Integration');
    const editedMeasurement = await request(`/measurements/${savedMeasurement.data.measurement.id}`, 'PATCH', { sampling_depth_cm: 25, measurement_source: 'Manual QA sample', notes: null });
    assert.equal(editedMeasurement.status, 200);
    assert.equal(editedMeasurement.data.measurement.source, 'Manual QA sample');
    assert.equal(editedMeasurement.data.measurement.measurement_source, 'Manual QA sample');
    assert.equal(editedMeasurement.data.measurement.notes, null);
    assert.equal(editedMeasurement.data.measurement.recorded_by, 'QA verifier');
    assert.ok(savedMeasurement.data.analysis.warnings.some((warning) => warning.code === 'LOW_MOISTURE'));
    assert.equal((await request(`/zones/${zone.id}/measurements`)).data.length, 1);
    assert.equal((await request(`/zones/${zone.id}`)).data.latest_measurement.moisture, 10);
    const updated = await request(`/zones/${zone.id}`, 'PATCH', { topsoil_depth_cm: 40, status: 'restored', soil_type: null, description: 'Updated monitoring details' });
    assert.equal(updated.data.soil_type, null);
    assert.equal(updated.data.description, 'Updated monitoring details');
    assert.equal(updated.data.survey_date, '2026-01-01');
    assert.ok(Math.abs(updated.data.volume_m3 - zone.area_m2 * 0.4) < 0.001);
    const changedGeometry = structuredClone(polygon);
    changedGeometry.coordinates[0][1][0] += 0.001;
    changedGeometry.coordinates[0][2][0] += 0.001;
    const reshaped = await request(`/zones/${zone.id}`, 'PATCH', { geometry: changedGeometry });
    assert.ok(reshaped.data.area_m2 > zone.area_m2 * 1.9);
    assert.ok(Math.abs(reshaped.data.volume_m3 - reshaped.data.area_m2 * 0.4) < 0.001);
    const bowtie = { type: 'Polygon', coordinates: [[[71.4,51.1],[71.401,51.101],[71.401,51.1],[71.4,51.101],[71.4,51.1]]] };
    assert.equal((await request(`/projects/${projectId}/zones`, 'POST', { name: 'Invalid', status: 'planned', topsoil_depth_cm: 30, geometry: bowtie })).status, 422);
    const activity = await request(`/projects/${projectId}/activities`, 'POST', { zone_id: zone.id, type: 'restoration', occurred_at: new Date().toISOString(), planned_volume_m3: 100, actual_volume_m3: 80, status: 'in_progress', note: 'Integration persistence', responsible_person: 'QA lead', planned_date: '2026-01-01' });
    assert.equal(activity.status, 201);
    const editedActivity = await request(`/activities/${activity.data.id}`, 'PATCH', { status: 'completed', actual_volume_m3: 90, completed_date: '2026-01-02', notes: 'Completed QA work' });
    assert.equal(editedActivity.data.status, 'completed');
    assert.equal(editedActivity.data.completed_date, '2026-01-02');
    assert.equal(editedActivity.data.planned_date, '2026-01-01');
    assert.equal(editedActivity.data.responsible_person, 'QA lead');
    assert.equal(editedActivity.data.note, 'Completed QA work');
    assert.equal(editedActivity.data.notes, 'Completed QA work');
    assert.equal((await request(`/projects/${projectId}/activities`)).data[0].actual_volume_m3, 90);
    const summary = (await request(`/projects/${projectId}/summary`)).data;
    assert.equal(summary.zone_count, 1);
    assert.equal(summary.restored_area_m2, reshaped.data.area_m2);
    assert.equal(summary.attention_area_m2, reshaped.data.area_m2);
    assert.equal(summary.warning_count, 2);
    assert.equal(summary.active_zone_count, 0);
    assert.equal(summary.soil_conditions.moisture, 10);
    assert.equal(summary.zones[0].measurement_count, 1);
    assert.equal(summary.zones[0].completed_activity_count, 1);
    const newServer = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => newServer.once('listening', resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${newServer.address().port}/api/zones/${zone.id}`);
      assert.equal((await response.json()).status, 'restored');
    } finally { await new Promise((resolve) => newServer.close(resolve)); }
    const forbidden = await fetch(`${base}/zones/${zone.id}`, { method: 'PATCH', headers: { Origin: 'https://example.org', 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'planned' }) });
    assert.equal(forbidden.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
});
