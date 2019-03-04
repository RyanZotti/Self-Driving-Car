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
  created_timestamp TIMESTAMP,
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
    event_ts TIMESTAMP,
PRIMARY KEY(device, model_id, epoch_id));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS raspberry_pi(
    username VARCHAR(100),
    hostname VARCHAR(100),
    password VARCHAR(100),
    git_repo_parent_path VARCHAR(100),
    deploy_model_parent_path VARCHAR(100),
    datasets_parent_path VARCHAR(100)
);
COMMIT;

-- I don't have an API to fill in the defaults, so I need
-- to fill those in myself or my update APIs will fail
BEGIN;
INSERT INTO raspberry_pi(
  username,
  hostname,
  password,
  git_repo_parent_path,
  deploy_model_parent_path,
  datasets_parent_path)
VALUES (
  'pi',
  'raspberrypi.local',
  'raspberry',
  '~/',
  '~/Self-Driving-Car/car/parts/model/',
  '~/Self-Driving-Car/car/templates/data/'
);
COMMIT;

BEGIN;
INSERT INTO sliders (event_ts, web_page, name, amount) VALUES
    (now(), 'datasets', 'auto clean speed', 15),
    (now(), 'datasets', 'image top cut', 50),
    (now(), 'datasets', 'image scale', 8),
    (now(), 'datasets', 'critical error', 80);
COMMIT;

BEGIN;
INSERT INTO sliders (event_ts, web_page, name, amount) VALUES
    (now(), 'machine learning', 'image top cut', 50),
    (now(), 'machine learning', 'image scale', 8);
COMMIT;
