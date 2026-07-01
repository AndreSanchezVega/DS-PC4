'use strict';

const express = require('express');
const { db } = require('../db');

const router = express.Router();

const ROLES = ['solidario', 'profesional', 'especializado']; // RF 3.1

// Calificación promedio a partir de reseñas VERIFICADAS (RF 3.4).
function calificacion(cuidadorId) {
  const r = db
    .prepare('SELECT AVG(calificacion) AS prom, COUNT(*) AS n FROM resenas WHERE cuidador_id = ? AND verificada = 1')
    .get(cuidadorId);
  return {
    calificacion_promedio: r.prom != null ? Number(r.prom.toFixed(2)) : null,
    total_resenas_verificadas: r.n,
  };
}

function serializar(c) {
  return {
    id: c.id,
    nombre: c.nombre,
    email: c.email,
    rol: c.rol,
    especies: c.especies ? JSON.parse(c.especies) : [],
    tamanos: c.tamanos ? JSON.parse(c.tamanos) : [],
    administra_medicamentos: !!c.administra_medicamentos,
    documento_validado: !!c.documento_validado,
    perfil_publico: !!c.perfil_publico,
    recibe_alertas: !!c.recibe_alertas,
    ...calificacion(c.id),
  };
}

// RF 3.1 / 3.2 · RNF 3.1: registrar cuidador (perfil NO público hasta validar).
router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.nombre || !b.email) return res.status(400).json({ error: 'nombre y email son obligatorios' });
  if (!ROLES.includes(b.rol)) {
    return res.status(400).json({ error: `rol inválido; use uno de: ${ROLES.join(', ')}` });
  }
  if (!b.documento_id) return res.status(400).json({ error: 'documento_id es obligatorio (RNF 3.1)' });

  const especies = JSON.stringify(Array.isArray(b.especies) ? b.especies : []);
  const tamanos = JSON.stringify(Array.isArray(b.tamanos) ? b.tamanos : []);
  try {
    const info = db
      .prepare(
        `INSERT INTO cuidadores
          (nombre, email, rol, especies, tamanos, administra_medicamentos, documento_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(b.nombre, b.email, b.rol, especies, tamanos, b.administra_medicamentos ? 1 : 0, b.documento_id);
    const c = db.prepare('SELECT * FROM cuidadores WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({
      cuidador: serializar(c),
      aviso: 'Perfil creado. Debe validar su documento para hacerlo público (RNF 3.1).',
    });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'email ya registrado' });
    throw e;
  }
});

// RNF 3.1: validación del documento de identidad (habilita el perfil público).
router.post('/:id/validar-documento', (req, res) => {
  const c = db.prepare('SELECT * FROM cuidadores WHERE id = ?').get(Number(req.params.id));
  if (!c) return res.status(404).json({ error: 'cuidador no encontrado' });
  // Validación simulada: un documento oficial válido es un DNI de 8 dígitos.
  if (!/^\d{8}$/.test(c.documento_id || '')) {
    return res.status(422).json({ error: 'documento no válido; el perfil no puede publicarse' });
  }
  db.prepare('UPDATE cuidadores SET documento_validado = 1, perfil_publico = 1 WHERE id = ?').run(c.id);
  const actualizado = db.prepare('SELECT * FROM cuidadores WHERE id = ?').get(c.id);
  res.json({ cuidador: serializar(actualizado), mensaje: 'Documento validado; perfil público habilitado.' });
});

// RF 3.3: interruptor (toggle) de recepción de alertas del módulo 1.
router.patch('/:id/alertas', (req, res) => {
  const c = db.prepare('SELECT * FROM cuidadores WHERE id = ?').get(Number(req.params.id));
  if (!c) return res.status(404).json({ error: 'cuidador no encontrado' });
  const valor = req.body && typeof req.body.recibe_alertas !== 'undefined'
    ? (req.body.recibe_alertas ? 1 : 0)
    : (c.recibe_alertas ? 0 : 1); // sin cuerpo: alterna
  db.prepare('UPDATE cuidadores SET recibe_alertas = ? WHERE id = ?').run(valor, c.id);
  res.json({ id: c.id, recibe_alertas: !!valor });
});

// RF 3.4: registrar una reseña (verificada o no).
router.post('/:id/resenas', (req, res) => {
  const c = db.prepare('SELECT * FROM cuidadores WHERE id = ?').get(Number(req.params.id));
  if (!c) return res.status(404).json({ error: 'cuidador no encontrado' });
  const b = req.body || {};
  const cal = Number(b.calificacion);
  if (!Number.isInteger(cal) || cal < 1 || cal > 5) {
    return res.status(400).json({ error: 'calificacion debe ser un entero de 1 a 5' });
  }
  db.prepare(
    'INSERT INTO resenas (cuidador_id, dueno_nombre, calificacion, comentario, verificada) VALUES (?, ?, ?, ?, ?)'
  ).run(c.id, b.dueno_nombre || null, cal, b.comentario || null, b.verificada ? 1 : 0);
  res.status(201).json({ cuidador: serializar(c) });
});

// Listado PÚBLICO: solo cuidadores con perfil habilitado (RNF 3.1).
router.get('/', (_req, res) => {
  const filas = db.prepare('SELECT * FROM cuidadores WHERE perfil_publico = 1 ORDER BY id').all();
  res.json(filas.map(serializar));
});

router.get('/roles', (_req, res) => res.json({ roles: ROLES }));

router.get('/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM cuidadores WHERE id = ?').get(Number(req.params.id));
  if (!c) return res.status(404).json({ error: 'cuidador no encontrado' });
  const resenas = db
    .prepare('SELECT dueno_nombre, calificacion, comentario, verificada, creado_en FROM resenas WHERE cuidador_id = ? ORDER BY id DESC')
    .all(c.id);
  res.json({ ...serializar(c), resenas });
});

module.exports = {
  id: 'cuidadores',
  titulo: 'Red de Cuidadores',
  descripcion: 'Cuidadores por rol, restricciones de servicio, alertas y calificaciones.',
  basePath: '/api/cuidadores',
  orden: 3,
  router,
};
