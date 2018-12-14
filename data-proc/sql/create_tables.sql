BEGIN;
CREATE TABLE IF NOT EXISTS live_prediction_sync(
  dataset character(100),
  pid int,
  start_time TIMESTAMP,
PRIMARY KEY(dataset));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS predictions(
  dataset character(100),
  record_id INT,
  model_id INT,
  epoch INT,
  angle float8,
PRIMARY KEY(dataset, record_id, model_id, epoch));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS epochs(
  epoch INT,
  train float8,
  validation float8,
PRIMARY KEY(epoch));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS deploy(
  model_id INT,
  epoch INT,
  timestamp TIMESTAMP
);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS records(
    dataset character(100),
    record_id INT,
    label_path character(300),
    image_path character(300),
    angle float8,
    throttle float8,
PRIMARY KEY(dataset, record_id));
COMMIT;
