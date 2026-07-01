'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { createApp } = require('../src/app');

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function req(port, method, pathname, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {};
    const r = http.request({ port, method, path: pathname, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, json: data ? JSON.parse(data) : null }));
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

test('RF1.4/RNF1.1: crear reporte notifica en radio y en < 5s', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  // Coordenadas de Lima cercanas a los usuarios sembrados.
  const res = await req(port, 'POST', '/api/alertas/reportes', {
    nombre: 'Firulais', especie: 'Perro', raza: 'Criollo',
    descripcion: 'Collar rojo', lat: -12.0464, lon: -77.0428, radio_km: 3,
    dueno_nombre: 'Pedro', dueno_email: 'pedro@correo.com', dueno_telefono: '999',
  });
  server.close();
  assert.strictEqual(res.status, 201);
  assert.ok(res.json.notificaciones_enviadas >= 1, 'debe notificar al menos a un usuario');
  assert.ok(res.json.tiempo_ms < 5000, 'debe cumplir la latencia < 5s');
  assert.strictEqual(res.json.cumple_latencia, true);
});

test('RNF1.2: el listado público no expone datos del dueño', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  await req(port, 'POST', '/api/alertas/reportes', {
    nombre: 'Michi', especie: 'Gato', lat: -12.05, lon: -77.045,
    dueno_email: 'secreto@correo.com', dueno_telefono: '555',
  });
  const lista = await req(port, 'GET', '/api/alertas/reportes');
  server.close();
  assert.strictEqual(lista.status, 200);
  const txt = JSON.stringify(lista.json);
  assert.ok(!txt.includes('secreto@correo.com'), 'no debe filtrar el email del dueño');
  assert.ok(!txt.includes('dueno_'), 'no debe incluir campos dueno_*');
});

test('RF1.2: rechaza reporte sin coordenadas', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  const res = await req(port, 'POST', '/api/alertas/reportes', { nombre: 'X', especie: 'Perro' });
  server.close();
  assert.strictEqual(res.status, 400);
});

test('RF1.3: registrar avistamiento anónimo', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  const res = await req(port, 'POST', '/api/alertas/avistamientos', {
    descripcion: 'Visto en el parque', lat: -12.049, lon: -77.044,
  });
  server.close();
  assert.strictEqual(res.status, 201);
  assert.ok(res.json.avistamiento.id > 0);
});
