-- Migración base (núcleo).
-- Tabla de usuarios usada por el módulo de alertas (destinatarios de
-- notificaciones) y por la red de cuidadores (interruptor de alertas).

CREATE TABLE IF NOT EXISTS usuarios (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT    NOT NULL,
  email          TEXT    UNIQUE NOT NULL,
  lat            REAL,
  lon            REAL,
  radio_km       REAL    NOT NULL DEFAULT 1,
  recibe_alertas INTEGER NOT NULL DEFAULT 1,
  creado_en      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Datos de ejemplo (coordenadas alrededor de Lima) para poder demostrar
-- las notificaciones por radio sin tener que registrar usuarios a mano.
INSERT OR IGNORE INTO usuarios (id, nombre, email, lat, lon, radio_km, recibe_alertas) VALUES
  (1, 'Ana Torres',  'ana@example.com',   -12.0464, -77.0428, 2, 1),
  (2, 'Bruno Diaz',  'bruno@example.com', -12.0500, -77.0450, 1, 1),
  (3, 'Carla Ruiz',  'carla@example.com', -12.1200, -77.0300, 3, 1),
  (4, 'Diego Leon',  'diego@example.com', -12.0700, -77.0800, 1, 0);
