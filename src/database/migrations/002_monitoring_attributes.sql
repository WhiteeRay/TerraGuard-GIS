ALTER TABLE zones
  ADD COLUMN soil_type varchar(80),
  ADD COLUMN description text,
  ADD COLUMN survey_date date,
  ADD CONSTRAINT zones_description_length CHECK (length(description) <= 2000),
  ADD CONSTRAINT zones_survey_date_range CHECK (survey_date BETWEEN DATE '2000-01-01' AND DATE '2100-12-31');

ALTER TABLE soil_measurements
  ADD COLUMN sampling_depth_cm double precision CHECK (sampling_depth_cm > 0 AND sampling_depth_cm <= 300),
  ADD COLUMN measurement_source varchar(120) GENERATED ALWAYS AS (source) STORED,
  ADD COLUMN recorded_by varchar(120),
  ADD COLUMN notes text CHECK (length(notes) <= 2000),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE activities
  ADD COLUMN responsible_person varchar(120),
  ADD COLUMN planned_date date CHECK (planned_date BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'),
  ADD COLUMN completed_date date CHECK (completed_date BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'),
  ADD COLUMN notes text GENERATED ALWAYS AS (note) STORED;

UPDATE zones SET soil_type = CASE WHEN id IN (2,5) THEN 'Sandy loam' ELSE 'Loam' END,
  description = 'Synthetic monitoring boundary for topsoil preservation and restoration.',
  survey_date = (created_at AT TIME ZONE 'Asia/Almaty')::date - 14
WHERE (id,name) IN ((1,'Участок A · Строительная площадка'),(2,'Участок B · Временное хранение'),
  (3,'Участок C · Озеленение'),(4,'Участок D · Рекультивация'),(5,'Участок E · Резервная территория'),
  (6,'Северный склон'),(7,'Прибрежная зона'))
AND EXISTS (SELECT 1 FROM projects p WHERE p.id=zones.project_id AND p.is_demo);

UPDATE soil_measurements SET sampling_depth_cm=20, recorded_by='Demo field team',
  notes='Synthetic manual sample. No connected sensor.'
WHERE source='Синтетические данные' AND id BETWEEN 1100 AND 1714
AND zone_id BETWEEN 1 AND 7;

UPDATE activities SET responsible_person='Demo restoration team',
  planned_date=(occurred_at AT TIME ZONE 'Asia/Almaty')::date,
  completed_date=CASE WHEN status='completed' THEN (occurred_at AT TIME ZONE 'Asia/Almaty')::date ELSE NULL END
WHERE (id,note) IN ((1,'Поэтапное снятие плодородного слоя. Синтетическая запись.'),
  (2,'Организовано временное хранение с защитным укрытием.'),
  (3,'Распределён плодородный слой, выполнено озеленение.'),
  (4,'Повторное использование грунта для рекультивации.'),
  (5,'Перемещение оставшегося грунта на площадку хранения.'),
  (6,'Подготовка территории к восстановлению.'));
