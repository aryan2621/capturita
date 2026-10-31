-- Device activations: one license works on a limited number of devices. device_id is a client-side hash, never raw hardware info.
CREATE TABLE activations (
  id TEXT PRIMARY KEY,                 -- act_...
  license_id TEXT NOT NULL REFERENCES licenses(id),
  device_id TEXT NOT NULL,             -- 64 hex chars (SHA-256 computed by the app)
  device_name TEXT,
  activated_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  deactivated_at INTEGER,
  UNIQUE (license_id, device_id)
);
