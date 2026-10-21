import { thresholds } from '../config.js';

export function analyzeMeasurements(measurements, now = new Date(), rules = thresholds) {
  const [latest, previous] = [...measurements].sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at) || (b.id || 0) - (a.id || 0));
  const warnings = [];
  const units = { STALE_DATA: 'h', LOW_MOISTURE: '%', HIGH_MOISTURE: '%', PH_OUT_OF_RANGE: 'pH', MOISTURE_CHANGE: 'percentage points', TEMPERATURE_CHANGE: '°C', PH_CHANGE: 'pH' };
  const add = (code, severity, title, actual, threshold, explanation, recommendation) => warnings.push({ code, severity, title, actual, threshold, explanation, recommendation, unit: units[code] || '' });
  if (!latest) {
    add('NO_DATA', 'warning', 'No measurements', null, 'At least one measurement', 'No observations have been recorded for this monitoring zone.', 'Record an initial soil moisture, temperature and pH measurement.');
  } else {
    const age = Math.max(0, (now - new Date(latest.measured_at)) / 3600000);
    if (age > rules.staleHours) add('STALE_DATA', 'warning', 'Outdated measurements', Math.round(age), rules.staleHours, `The latest reading is ${Math.round(age)} hours old, exceeding the ${rules.staleHours}-hour demonstration threshold.`, 'Take a fresh measurement before making decisions.');
    if (latest.moisture < rules.moistureMin) add('LOW_MOISTURE', 'critical', 'Low soil moisture', latest.moisture, rules.moistureMin, `Soil moisture of ${latest.moisture}% is below the demonstration threshold of ${rules.moistureMin}%.`, 'Verify moisture on site. Discuss watering or protective covering with an environmental specialist.');
    if (latest.moisture > rules.moistureMax) add('HIGH_MOISTURE', 'warning', 'High soil moisture', latest.moisture, rules.moistureMax, `Soil moisture of ${latest.moisture}% exceeds the demonstration threshold of ${rules.moistureMax}%.`, 'Inspect drainage and topsoil storage conditions.');
    if (latest.ph < rules.phMin || latest.ph > rules.phMax) add('PH_OUT_OF_RANGE', 'warning', 'Soil pH outside range', latest.ph, [rules.phMin, rules.phMax], `Soil pH of ${latest.ph} is outside the demonstration range of ${rules.phMin}–${rules.phMax}.`, 'Repeat the reading and refer a sample to an environmental specialist for investigation.');
    if (previous) {
      for (const [field, limit, label] of [['moisture', rules.moistureDelta, 'soil moisture'], ['temperature', rules.temperatureDelta, 'soil temperature'], ['ph', rules.phDelta, 'pH']]) {
        const delta = Math.abs(latest[field] - previous[field]);
        if (delta > limit) add(`${field.toUpperCase()}_CHANGE`, 'warning', `Sudden change in ${label}`, Number(delta.toFixed(2)), limit, `The difference between the latest two readings is ${Number(delta.toFixed(2))}, exceeding the demonstration change threshold of ${limit}.`, 'Check the measurement source and site conditions, then take a control reading.');
      }
    }
  }
  return {
    status: !latest || warnings.some((w) => w.code === 'STALE_DATA') ? 'insufficient_data' : warnings.some((w) => w.severity === 'critical') ? 'critical' : warnings.length ? 'attention' : 'normal',
    warnings,
    latest: latest || null,
    evaluated_at: now.toISOString(),
    thresholds: rules,
    disclaimer: 'Demonstration thresholds. Preliminary recommendations require review by an environmental specialist.'
  };
}
