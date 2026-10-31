-- Wrong-guess counter per purchase email, so the payment ID of one buyer cannot be ground through.
CREATE TABLE recover_failures (
  email TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
