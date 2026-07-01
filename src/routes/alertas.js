'use strict';

const express = require('express');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const { db } = require('../db');
const { distanciaKm } = require('../lib/geo');

const router = express.Router();

// --- Carga de fotos ---------------------------------------------------------
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `alerta_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

// --- Helpers ----------------------------------------------------------------

// Vista pública de un reporte: OCULTA los datos personales del dueño (RNF 1.2).
function reportePublico(r) {
  return {
    id: r.id,
    nombre: r.nombre,
    especie: r.especie,
    raza: r.raza,
    descripcion: r.descripcion,
    foto_url: r.foto_url,
    lat: r.lat,
    lon: r.lon,
    radio_km: r.radio_km,
    estado: r.estado,
    creado_en: r.creado_en,
  };
}

// RF 1.4: notifica a los usuarios dentro del radio configurado del reporte
// que tengan las alertas activadas. Devuelve la lista de notificados.
function notificarUsuariosEnRadio(reporte) {
  const usuarios = db
    .prepare('SELECT * FROM usuarios WHERE recibe_alertas = 1 AND lat IS NOT NULL AND lon IS NOT NULL')
    .all();
  const insert = db.prepare(
    'INSERT INTO notificaciones (reporte_id, usuario_id, distancia_km) VALUES (?, ?, ?)'
  );
  const notificados = [];
  for (const u of usuarios) {
    const d = distanciaKm(reporte.lat, reporte.lon, u.lat, u.lon);
    if (d <= reporte.radio_km) {
      insert.run(reporte.id, u.id, Number(d.toFixed(3)));
      notificados.push({ usuario_id: u.id, nombre: u.nombre, distancia_km: Number(d.toFixed(3)) });
    }
  }
  return notificados;
}

// --- RF 1.1 / 1.2 / 1.4: registrar mascota perdida --------------------------
router.post('/reportes', upload.single('foto'), (req, res) => {
  const inicio = Date.now();
  const b = req.body || {};
  if (!b.nombre || !b.especie) {
    return res.status(400).json({ error: 'nombre y especie son obligatorios' });
  }
  const lat = Number(b.lat);
  const lon = Number(b.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'Se requieren coordenadas válidas (lat, lon)' });
  }
  const radio = Number(b.radio_km) > 0 ? Number(b.radio_km) : 1;
  const foto_url = req.file ? `/uploads/${req.file.filename}` : null;

  const info = db
    .prepare(
      `INSERT INTO reportes_perdidos
        (nombre, especie, raza, descripcion, foto_url, lat, lon, radio_km,
         dueno_nombre, dueno_email, dueno_telefono)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.nombre, b.especie, b.raza || null, b.descripcion || null, foto_url,
      lat, lon, radio, b.dueno_nombre || null, b.dueno_email || null, b.dueno_telefono || null
    );

  const reporte = db
    .prepare('SELECT * FROM reportes_perdidos WHERE id = ?')
    .get(info.lastInsertRowid);

  const notificados = notificarUsuariosEnRadio(reporte);
  const tiempo_ms = Date.now() - inicio; // RNF 1.1: debe ser < 5000 ms

  res.status(201).json({
    reporte: reportePublico(reporte),
    notificaciones_enviadas: notificados.length,
    notificados,
    tiempo_ms,
    cumple_latencia: tiempo_ms < 5000,
  });
});

// Listado público de alertas activas (sin datos del dueño, RNF 1.2).
router.get('/reportes', (_req, res) => {
  const filas = db
    .prepare("SELECT * FROM reportes_perdidos WHERE estado = 'activo' ORDER BY id DESC")
    .all();
  res.json(filas.map(reportePublico));
});

router.get('/reportes/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM reportes_perdidos WHERE id = ?').get(Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Reporte no encontrado' });
  res.json(reportePublico(r));
});

// --- RF 1.3: avistamiento de ciudadano anónimo ------------------------------
router.post('/avistamientos', upload.single('foto'), (req, res) => {
  const b = req.body || {};
  const lat = Number(b.lat);
  const lon = Number(b.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'Se requiere la ubicación (lat, lon) del avistamiento' });
  }
  const foto_url = req.file ? `/uploads/${req.file.filename}` : null;
  const reporte_id = b.reporte_id ? Number(b.reporte_id) : null;

  const info = db
    .prepare(
      'INSERT INTO avistamientos (reporte_id, descripcion, foto_url, lat, lon) VALUES (?, ?, ?, ?, ?)'
    )
    .run(reporte_id, b.descripcion || null, foto_url, lat, lon);

  const avistamiento = db
    .prepare('SELECT * FROM avistamientos WHERE id = ?')
    .get(info.lastInsertRowid);
  // La respuesta no incluye ningún dato personal del dueño (RNF 1.2).
  res.status(201).json({ avistamiento });
});

router.get('/avistamientos', (_req, res) => {
  const filas = db
    .prepare('SELECT * FROM avistamientos ORDER BY id DESC')
    .all();
  res.json(filas);
});

// Notificaciones generadas (evidencia de RF 1.4 / RNF 1.1).
router.get('/notificaciones', (req, res) => {
  const reporteId = req.query.reporte_id ? Number(req.query.reporte_id) : null;
  const filas = reporteId
    ? db.prepare(
        `SELECT n.*, u.nombre AS usuario_nombre
           FROM notificaciones n JOIN usuarios u ON u.id = n.usuario_id
          WHERE n.reporte_id = ? ORDER BY n.id DESC`
      ).all(reporteId)
    : db.prepare(
        `SELECT n.*, u.nombre AS usuario_nombre
           FROM notificaciones n JOIN usuarios u ON u.id = n.usuario_id
          ORDER BY n.id DESC LIMIT 50`
      ).all();
  res.json(filas);
});

module.exports = {
  id: 'alertas',
  titulo: 'Alertas de Perdidos',
  descripcion: 'Reportes de mascotas perdidas, avistamientos y notificaciones por radio.',
  basePath: '/api/alertas',
  orden: 1,
  router,
};
