BEGIN;
CREATE TABLE IF NOT EXISTS live_prediction_sync(
  dataset varchar(100),
  pid int,
  start_time TIMESTAMP,
PRIMARY KEY(dataset));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS predictions(
  dataset varchar(100),
  record_id INT,
  model_id INT,
  epoch INT,
  angle float8,
  created_timestamp TIMESTAMP NOT NULL DEFAULT now(),
PRIMARY KEY(dataset, record_id, model_id, epoch));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS models(
  model_id INT,
  created_timestamp TIMESTAMP,
  crop INT,
  scale INT,
PRIMARY KEY(model_id));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS epochs(
  model_id INT,
  epoch INT,
  train float8,
  validation float8,
PRIMARY KEY(model_id, epoch));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS records(
    dataset varchar(100),
    record_id INT,
    label_path varchar(300),
    image_path varchar(300),
    angle float8,
    throttle float8,
    is_flagged BOOLEAN DEFAULT FALSE,
PRIMARY KEY(dataset, record_id));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS toggles(
    event_ts TIMESTAMP,
    web_page VARCHAR(100),
    name VARCHAR(100),
    detail VARCHAR(100),
    is_on BOOLEAN,
PRIMARY KEY(event_ts, web_page, name, detail));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS sliders(
    event_ts TIMESTAMP,
    web_page VARCHAR(100),
    name VARCHAR(100),
    amount INT,
PRIMARY KEY(event_ts, web_page, name));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS deployments(
    device VARCHAR(100),
    model_id INT,
    epoch_id INT,
    event_ts TIMESTAMP);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS pi_settings(
    event_ts TIMESTAMP,
    field_name VARCHAR(100),
    field_value VARCHAR(100)
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS jobs(
    created_at TIMESTAMP,
    session_id VARCHAR(100),
    name VARCHAR(100),
    detail VARCHAR(100),
    status VARCHAR(100)
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS service_health(
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    service VARCHAR(100),
    host VARCHAR(100),
    is_healthy BOOLEAN,
PRIMARY KEY(start_time, end_time, service, host));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS service_event(
    event_time TIMESTAMP,
    service VARCHAR(100),
    event VARCHAR(100),
    host VARCHAR(100),
PRIMARY KEY(event_time, service, event, host));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS pi_health(
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    is_healthy BOOLEAN,
PRIMARY KEY(start_time, end_time));
COMMIT;

BEGIN;
CREATE INDEX pi_settings_field_name ON pi_settings (field_name);
CREATE INDEX jobs_name_detail_session_id ON jobs (name, detail, session_id);
COMMIT;
