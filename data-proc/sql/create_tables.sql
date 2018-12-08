BEGIN;
CREATE TABLE IF NOT EXISTS live_prediction_sync(
  pid int,
  start_time TIMESTAMP,
PRIMARY KEY(pid));
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS predictions(
  dataset character(100),
  record_id INT,
  angle_ai float8,
  angle_human float8,
  angle_abs_error float8,
PRIMARY KEY(dataset, record_id));
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
