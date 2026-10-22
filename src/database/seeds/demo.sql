INSERT INTO projects(id, name, description, location) VALUES
  (1, 'Зелёный квартал · Астана', 'Синтетический проект жилого квартала для демонстрации сохранения плодородного слоя. Не представляет реальную стройку.', 'Астана, район Есиль'),
  (2, 'Экопарк · Северный берег', 'Синтетический проект благоустройства. Все границы и измерения вымышлены.', 'Астана, район Нура')
ON CONFLICT (id) DO NOTHING;

WITH demo_zones(id, project_id, name, status, topsoil_depth_cm, geom) AS (VALUES
  (1,1,'Участок A · Строительная площадка','stripping',30,ST_GeomFromText('POLYGON((71.394 51.107,71.398 51.1075,71.3988 51.1056,71.395 51.1051,71.394 51.107))',4326)),
  (2,1,'Участок B · Временное хранение','stored',25,ST_GeomFromText('POLYGON((71.399 51.1076,71.4016 51.108,71.4024 51.1063,71.3998 51.1059,71.399 51.1076))',4326)),
  (3,1,'Участок C · Озеленение','restored',35,ST_GeomFromText('POLYGON((71.393 51.1044,71.3965 51.1049,71.3975 51.1028,71.394 51.1023,71.393 51.1044))',4326)),
  (4,1,'Участок D · Рекультивация','restoring',30,ST_GeomFromText('POLYGON((71.3981 51.1051,71.4017 51.1056,71.4025 51.1035,71.399 51.103,71.3981 51.1051))',4326)),
  (5,1,'Участок E · Резервная территория','planned',20,ST_GeomFromText('POLYGON((71.4032 51.1079,71.406 51.1083,71.4067 51.1064,71.404 51.106,71.4032 51.1079))',4326)),
  (6,2,'Северный склон','planned',25,ST_GeomFromText('POLYGON((71.414 51.14,71.418 51.1406,71.419 51.1385,71.415 51.138,71.414 51.14))',4326)),
  (7,2,'Прибрежная зона','restoring',30,ST_GeomFromText('POLYGON((71.4195 51.1408,71.423 51.1413,71.424 51.1391,71.4205 51.1386,71.4195 51.1408))',4326)))
INSERT INTO zones(id, project_id, name, status, topsoil_depth_cm, geom, soil_type, description, survey_date)
SELECT *, CASE WHEN id IN (2,5) THEN 'Sandy loam' ELSE 'Loam' END,
  'Synthetic monitoring boundary for topsoil preservation and restoration.',
  (now() AT TIME ZONE 'Asia/Almaty')::date - 14 FROM demo_zones
ON CONFLICT (id) DO NOTHING;

INSERT INTO soil_measurements(id,zone_id,moisture,temperature,ph,measured_at,source,sampling_depth_cm,recorded_by,notes)
SELECT 1000 + z.id * 100 + n, z.id,
  CASE WHEN z.id=1 THEN 36-n*1.6 WHEN z.id=2 THEN 54+n*1.1 ELSE 37+sin(n*0.65+z.id)*6 END,
  12+sin(n*0.4+z.id)*3,
  CASE WHEN z.id=2 THEN 8.3 ELSE 6.6+sin(n*0.3)*0.3 END,
  date_trunc('hour',now()) - (14-n)*interval '1 day' - interval '2 hours',
  'Синтетические данные', 20, 'Demo field team', 'Synthetic manual sample. No connected sensor.'
FROM zones z CROSS JOIN generate_series(0,14) n
WHERE z.id IN (1,2,3,4,6,7) AND NOT (z.id=6 AND n>9)
ON CONFLICT (id) DO NOTHING;

WITH demo_activities(id,project_id,zone_id,type,status,occurred_at,planned_volume_m3,actual_volume_m3,note) AS (VALUES
  (1,1,1,'stripping','in_progress',now()-interval '1 day',1800,940,'Поэтапное снятие плодородного слоя. Синтетическая запись.'),
  (2,1,2,'storage','completed',now()-interval '2 days',950,940,'Организовано временное хранение с защитным укрытием.'),
  (3,1,3,'restoration','completed',now()-interval '3 days',1500,1480,'Распределён плодородный слой, выполнено озеленение.'),
  (4,1,4,'reuse','in_progress',now()-interval '1 day',1200,480,'Повторное использование грунта для рекультивации.'),
  (5,1,1,'movement','planned',now()+interval '2 days',860,NULL,'Перемещение оставшегося грунта на площадку хранения.'),
  (6,2,7,'restoration','planned',now()+interval '3 days',2100,NULL,'Подготовка территории к восстановлению.'))
INSERT INTO activities(id,project_id,zone_id,type,status,occurred_at,planned_volume_m3,actual_volume_m3,note,responsible_person,planned_date,completed_date)
SELECT *, 'Demo restoration team', (occurred_at AT TIME ZONE 'Asia/Almaty')::date,
  CASE WHEN status='completed' THEN (occurred_at AT TIME ZONE 'Asia/Almaty')::date ELSE NULL END FROM demo_activities
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('projects','id'), GREATEST((SELECT max(id) FROM projects),1));
SELECT setval(pg_get_serial_sequence('zones','id'), GREATEST((SELECT max(id) FROM zones),1));
SELECT setval(pg_get_serial_sequence('soil_measurements','id'), GREATEST((SELECT max(id) FROM soil_measurements),1));
SELECT setval(pg_get_serial_sequence('activities','id'), GREATEST((SELECT max(id) FROM activities),1));
