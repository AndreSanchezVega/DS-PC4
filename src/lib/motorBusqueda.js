'use strict';

const { db } = require('../db');

/**
 * Motor de búsqueda por metadatos.
 *
 * RNF 2.1 (Abstracción): el backend trabaja contra un formato ESTÁNDAR de
 * metadatos en JSON:
 *   { especie, raza, color, tamano }
 * De este modo el motor es intercambiable: basta con proveer otra
 * implementación de `buscar(intencion, meta)` (por ejemplo, una que use
 * un modelo de visión por computadora o una base vectorial) sin tocar las
 * rutas ni el frontend. Aquí se implementa un motor simple por coincidencia
 * de atributos, suficiente para el prototipo.
 */

const NOMBRE_MOTOR = 'motor-metadatos-v1';

function existeTabla(nombre) {
  const r = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?")
    .get(nombre);
  return !!r;
}

// Puntaje de similitud simple: cuenta cuántos atributos coinciden.
function puntuar(meta, fila) {
  const campos = ['especie', 'raza', 'color', 'tamano'];
  let score = 0;
  let considerados = 0;
  for (const c of campos) {
    if (!meta[c]) continue;
    considerados++;
    if (fila[c] && String(fila[c]).toLowerCase() === String(meta[c]).toLowerCase()) score++;
  }
  return considerados ? score / considerados : 0;
}

function buscarEnCatalogo(tipo, meta, { soloCertificados = false } = {}) {
  let sql = 'SELECT * FROM catalogo_animales WHERE tipo = ?';
  const params = [tipo];
  if (soloCertificados) sql += ' AND certificado = 1'; // RF 2.4
  if (meta.especie) {
    sql += ' AND lower(especie) = lower(?)';
    params.push(meta.especie);
  }
  const filas = db.prepare(sql).all(...params);
  return filas
    .map((f) => ({ ...f, similitud: Number(puntuar(meta, f).toFixed(2)) }))
    .sort((a, b) => b.similitud - a.similitud);
}

// RF 2.5: contrasta los metadatos con las alertas de mascotas perdidas activas.
function verificarPerdida(meta) {
  if (!existeTabla('reportes_perdidos')) {
    return { disponible: false, resultados: [] };
  }
  const filas = db
    .prepare("SELECT id, nombre, especie, raza, descripcion, foto_url, lat, lon, creado_en FROM reportes_perdidos WHERE estado = 'activo'")
    .all();
  const resultados = filas
    .map((f) => ({ ...f, similitud: Number(puntuar(meta, f).toFixed(2)) }))
    .filter((f) => f.similitud > 0 || !meta.especie)
    .sort((a, b) => b.similitud - a.similitud);
  return { disponible: true, resultados };
}

function buscar(intencion, meta) {
  switch (intencion) {
    case 'adopcion': // RF 2.3
      return { intencion, motor: NOMBRE_MOTOR, resultados: buscarEnCatalogo('protectora', meta) };
    case 'venta': // RF 2.4
      return {
        intencion,
        motor: NOMBRE_MOTOR,
        resultados: buscarEnCatalogo('criadero', meta, { soloCertificados: true }),
      };
    case 'verificar': { // RF 2.5
      const { disponible, resultados } = verificarPerdida(meta);
      return { intencion, motor: NOMBRE_MOTOR, disponible, resultados };
    }
    default:
      throw new Error('intención no soportada');
  }
}

const INTENCIONES = ['adopcion', 'venta', 'verificar'];

module.exports = { buscar, INTENCIONES, NOMBRE_MOTOR };
