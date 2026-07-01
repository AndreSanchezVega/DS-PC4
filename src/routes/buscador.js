'use strict';

const express = require('express');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const { db } = require('../db');
const { buscar, INTENCIONES, NOMBRE_MOTOR } = require('../lib/motorBusqueda');

const router = express.Router();

// Carga de la imagen a buscar (RF 2.1). Aceptamos solo JPEG/PNG.
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `busqueda_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png'].includes(file.mimetype);
    cb(ok ? null : new Error('Solo se permiten imágenes JPEG o PNG'), ok); // RF 2.1
  },
});

// RF 2.1 / 2.2 / 2.3 / 2.4 / 2.5 · RNF 2.1 / 2.2
router.post('/buscar', upload.single('foto'), (req, res) => {
  const inicio = Date.now();
  const b = req.body || {};

  // RF 2.2: la intención es obligatoria y debe ser una de las tres válidas.
  if (!b.intencion || !INTENCIONES.includes(b.intencion)) {
    return res
      .status(400)
      .json({ error: `Debe seleccionar una intención válida: ${INTENCIONES.join(', ')}` });
  }

  // RNF 2.1: metadatos en formato JSON estándar (los produciría el motor de
  // visión en un sistema real; aquí llegan como campos del formulario).
  const meta = {
    especie: b.especie || null,
    raza: b.raza || null,
    color: b.color || null,
    tamano: b.tamano || null,
  };

  const salida = buscar(b.intencion, meta);
  const foto_url = req.file ? `/uploads/${req.file.filename}` : null;
  const tiempo_ms = Date.now() - inicio;

  res.json({
    ...salida,
    foto_url,
    meta,
    tiempo_ms, // RNF 2.2
  });
});

// Catálogo para exploración/depuración.
router.get('/catalogo', (req, res) => {
  const tipo = req.query.tipo;
  const filas = tipo
    ? db.prepare('SELECT * FROM catalogo_animales WHERE tipo = ? ORDER BY id').all(tipo)
    : db.prepare('SELECT * FROM catalogo_animales ORDER BY id').all();
  res.json(filas);
});

router.get('/intenciones', (_req, res) => res.json({ intenciones: INTENCIONES, motor: NOMBRE_MOTOR }));

module.exports = {
  id: 'buscador',
  titulo: 'Buscador por Imagen',
  descripcion: 'Carga una imagen y elige una intención: Adopción, Venta o Verificar Pérdida.',
  basePath: '/api/buscador',
  orden: 2,
  router,
};
