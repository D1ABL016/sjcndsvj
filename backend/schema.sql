CREATE TABLE IF NOT EXISTS actual_generation (
  start_time        TIMESTAMPTZ PRIMARY KEY,
  settlement_date   DATE NOT NULL,
  settlement_period INT NOT NULL,
  publish_time      TIMESTAMPTZ NOT NULL,
  generation_mw     DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS forecast_generation (
  start_time    TIMESTAMPTZ NOT NULL,
  publish_time  TIMESTAMPTZ NOT NULL,
  generation_mw DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (start_time, publish_time)
);

CREATE INDEX IF NOT EXISTS forecast_publish_idx ON forecast_generation (publish_time);
