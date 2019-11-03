-- I don't have an API to fill in the defaults, so I need
-- to fill those in myself or my update APIs will fail

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

BEGIN;
INSERT INTO pi_settings(
  event_ts,
  field_name,
  field_value
)
VALUES
    (now(), 'laptop datasets directory', '~/Self-Driving-Car/car/templates/data/'),
    (now(), 'pi datasets directory', '/home/pi/vehicle-datasets'),
    (now(), 'laptop git repo directory', '~/'),
    (now(), 'username', 'pi'),
    (now(), 'hostname', 'raspberrypi.local'),
    (now(), 'password', 'raspberry');
COMMIT;