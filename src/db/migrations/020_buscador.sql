-- Módulo 2: Buscador Multipropósito por Imagen.
-- Catálogo de animales publicados por protectoras/ONGs (adopción) y por
-- criaderos comerciales (venta). El campo `certificado` marca la certificación
-- legal exigida para la venta (RF 2.4).

CREATE TABLE IF NOT EXISTS catalogo_animales (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo        TEXT    NOT NULL,               -- 'protectora' | 'criadero'
  entidad     TEXT    NOT NULL,               -- nombre de la ONG o del criadero
  certificado INTEGER NOT NULL DEFAULT 0,     -- 1 = legalmente certificado (RF 2.4)
  nombre      TEXT    NOT NULL,
  especie     TEXT    NOT NULL,
  raza        TEXT,
  color       TEXT,
  tamano      TEXT,                           -- pequeño | mediano | grande
  precio      REAL,                           -- solo aplica a venta
  foto_url    TEXT,
  creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Protectoras / ONGs (para intención Adopción, RF 2.3)
INSERT OR IGNORE INTO catalogo_animales (id, tipo, entidad, certificado, nombre, especie, raza, color, tamano, precio) VALUES
  (1, 'protectora', 'Refugio Patitas Felices', 1, 'Rocky',  'Perro', 'Mestizo',  'Marron',  'mediano', NULL),
  (2, 'protectora', 'ONG Segunda Oportunidad', 1, 'Luna',   'Gato',  'Criollo',  'Negro',   'pequeno', NULL),
  (3, 'protectora', 'Refugio Patitas Felices', 1, 'Toby',   'Perro', 'Labrador', 'Dorado',  'grande',  NULL);

-- Criaderos comerciales (para intención Venta, RF 2.4). Solo los certificados
-- deben aparecer en los resultados de venta.
INSERT OR IGNORE INTO catalogo_animales (id, tipo, entidad, certificado, nombre, especie, raza, color, tamano, precio) VALUES
  (4, 'criadero', 'Criadero Del Sol',       1, 'Max',   'Perro', 'Golden Retriever', 'Dorado', 'grande',  1200),
  (5, 'criadero', 'Criadero Andino',        1, 'Mia',   'Gato',  'Siames',           'Crema',  'pequeno', 800),
  (6, 'criadero', 'Criadero Sin Licencia',  0, 'Zeus',  'Perro', 'Bulldog',          'Blanco', 'mediano', 1500);
