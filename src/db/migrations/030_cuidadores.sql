-- Módulo 3: Red de Cuidadores de Mascotas.

CREATE TABLE IF NOT EXISTS cuidadores (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre                  TEXT    NOT NULL,
  email                   TEXT    UNIQUE NOT NULL,
  rol                     TEXT    NOT NULL,          -- RF 3.1: solidario | profesional | especializado
  especies                TEXT,                      -- RF 3.2: JSON array de especies aceptadas
  tamanos                 TEXT,                      -- RF 3.2: JSON array de tamaños aceptados
  administra_medicamentos INTEGER NOT NULL DEFAULT 0, -- RF 3.2
  documento_id            TEXT,                      -- RNF 3.1
  documento_validado      INTEGER NOT NULL DEFAULT 0, -- RNF 3.1
  perfil_publico          INTEGER NOT NULL DEFAULT 0, -- se habilita al validar el documento
  recibe_alertas          INTEGER NOT NULL DEFAULT 1, -- RF 3.3: interruptor de alertas del módulo 1
  creado_en               TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resenas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  cuidador_id  INTEGER NOT NULL,
  dueno_nombre TEXT,
  calificacion INTEGER NOT NULL,                     -- 1..5
  comentario   TEXT,
  verificada   INTEGER NOT NULL DEFAULT 0,           -- RF 3.4: solo las verificadas cuentan
  creado_en    TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cuidador_id) REFERENCES cuidadores(id)
);

-- Cuidador de ejemplo (documento ya validado y perfil público) con reseñas.
INSERT OR IGNORE INTO cuidadores
  (id, nombre, email, rol, especies, tamanos, administra_medicamentos, documento_id, documento_validado, perfil_publico, recibe_alertas)
VALUES
  (1, 'Sofia Ramos', 'sofia@example.com', 'profesional', '["Perro","Gato"]', '["pequeno","mediano"]', 1, '12345678', 1, 1, 1);

INSERT OR IGNORE INTO resenas (id, cuidador_id, dueno_nombre, calificacion, comentario, verificada) VALUES
  (1, 1, 'Ana Torres', 5, 'Cuidó a mi perro excelente', 1),
  (2, 1, 'Bruno Diaz', 4, 'Muy responsable', 1),
  (3, 1, 'Anonimo',    1, 'Reseña no verificada (no debe contar)', 0);
