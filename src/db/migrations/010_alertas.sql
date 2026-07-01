-- Módulo 1: Reporte de Animales Perdidos y Alertas.

CREATE TABLE IF NOT EXISTS reportes_perdidos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT    NOT NULL,          -- RF 1.1
  especie        TEXT    NOT NULL,
  raza           TEXT,
  descripcion    TEXT,
  foto_url       TEXT,
  lat            REAL    NOT NULL,          -- RF 1.2 (coordenadas)
  lon            REAL    NOT NULL,
  radio_km       REAL    NOT NULL DEFAULT 1, -- RF 1.4 (radio configurable)
  -- Datos del dueño: NUNCA se exponen en las vistas públicas (RNF 1.2).
  dueno_nombre   TEXT,
  dueno_email    TEXT,
  dueno_telefono TEXT,
  estado         TEXT    NOT NULL DEFAULT 'activo',
  creado_en      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS avistamientos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  reporte_id  INTEGER,                       -- RF 1.3 (ciudadano anónimo)
  descripcion TEXT,
  foto_url    TEXT,
  lat         REAL NOT NULL,
  lon         REAL NOT NULL,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (reporte_id) REFERENCES reportes_perdidos(id)
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  reporte_id   INTEGER NOT NULL,             -- RF 1.4
  usuario_id   INTEGER NOT NULL,
  distancia_km REAL    NOT NULL,
  creado_en    TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (reporte_id) REFERENCES reportes_perdidos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
