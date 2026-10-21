import { Router } from 'express';
import { query } from './db.js';
import { config, thresholds } from './config.js';
import { HttpError } from './errors.js';
import * as validate from './validation.js';
import * as projects from './repositories/projects.js';
import * as zones from './repositories/zones.js';
import * as measurements from './repositories/measurements.js';
import * as activities from './repositories/activities.js';
import { analyzeMeasurements } from './services/analysis.js';
import { projectSummary } from './services/summary.js';

export const api = Router();

api.get('/health', async (req, res) => {
  await query('SELECT PostGIS_Version()');
  res.json({ status: 'ok', database: 'connected', demo_mode: config.demoMode });
});

api.get('/config', (req, res) => res.json({ demo_mode: config.demoMode, thresholds, timezone: 'Asia/Almaty' }));
api.get('/projects', async (req, res) => res.json(await projects.listProjects()));
api.get('/projects/:id', async (req, res) => res.json(await projects.getProject(validate.id(req.params.id))));
api.get('/projects/:id/summary', async (req, res) => {
  const id = validate.id(req.params.id);
  await projects.getProject(id);
  res.json(await projectSummary(id));
});
api.get('/projects/:id/zones', async (req, res) => {
  const id = validate.id(req.params.id);
  await projects.getProject(id);
  if (req.query.status && !validate.zoneStatuses.includes(req.query.status)) throw new HttpError(422, 'Unknown zone status.');
  res.json(zones.toGeoJSON(await zones.listZones(id, req.query.status)));
});
api.post('/projects/:id/zones', async (req, res) => {
  const id = validate.id(req.params.id);
  const input = validate.zoneInput(req.body);
  await projects.getProject(id);
  res.status(201).json(await zones.createZone(id, input));
});
api.get('/zones/:id', async (req, res) => res.json(await zones.getZone(validate.id(req.params.id))));
api.patch('/zones/:id', async (req, res) => res.json(await zones.updateZone(validate.id(req.params.id), validate.zoneInput(req.body, true))));
api.get('/zones/:id/measurements', async (req, res) => {
  const id = validate.id(req.params.id);
  await zones.getZone(id);
  res.json(await measurements.listMeasurements(id, validate.periodInput(req.query)));
});
api.post('/zones/:id/measurements', async (req, res) => {
  const id = validate.id(req.params.id);
  const input = validate.measurementInput(req.body);
  await zones.getZone(id);
  const measurement = await measurements.createMeasurement(id, input);
  res.status(201).json({ measurement, analysis: analyzeMeasurements(await measurements.latestMeasurements(id)) });
});
api.get('/zones/:id/analysis', async (req, res) => {
  const id = validate.id(req.params.id);
  await zones.getZone(id);
  res.json(analyzeMeasurements(await measurements.latestMeasurements(id)));
});
api.patch('/measurements/:id', async (req, res) => {
  const measurement = await measurements.updateMeasurement(validate.id(req.params.id), validate.measurementInput(req.body, true));
  res.json({ measurement, analysis: analyzeMeasurements(await measurements.latestMeasurements(measurement.zone_id)) });
});
api.get('/projects/:id/activities', async (req, res) => {
  const id = validate.id(req.params.id);
  await projects.getProject(id);
  res.json(await activities.listActivities(id, req.query.zone_id ? validate.id(req.query.zone_id) : null));
});
api.post('/projects/:id/activities', async (req, res) => {
  const id = validate.id(req.params.id);
  const input = validate.activityInput(req.body);
  await projects.getProject(id);
  res.status(201).json(await activities.createActivity(id, input));
});
api.patch('/activities/:id', async (req, res) => res.json(await activities.updateActivity(validate.id(req.params.id), validate.activityInput(req.body, true))));
