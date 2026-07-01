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
    const headers = payload
      ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
      : {};
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

const nuevo = (i) => ({
  nombre: 'Cuidador ' + i, email: `cuidador_${i}_${Date.now()}@example.com`,
  rol: 'profesional', documento_id: '87654321',
  especies: ['Perro'], tamanos: ['mediano'], administra_medicamentos: true,
});

test('RF3.1: rechaza rol inválido', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  const res = await req(port, 'POST', '/api/cuidadores', { ...nuevo(1), rol: 'superheroe' });
  server.close();
  assert.strictEqual(res.status, 400);
});

test('RNF3.1: el perfil no es público hasta validar el documento', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  const creado = await req(port, 'POST', '/api/cuidadores', nuevo(2));
  const id = creado.json.cuidador.id;
  assert.strictEqual(creado.json.cuidador.perfil_publico, false);

  const publicosAntes = await req(port, 'GET', '/api/cuidadores');
  assert.ok(!publicosAntes.json.some((c) => c.id === id), 'no debe aparecer antes de validar');

  const val = await req(port, 'POST', `/api/cuidadores/${id}/validar-documento`);
  assert.strictEqual(val.status, 200);

  const publicosDespues = await req(port, 'GET', '/api/cuidadores');
  server.close();
  assert.ok(publicosDespues.json.some((c) => c.id === id), 'debe aparecer tras validar');
});

test('RF3.3: el toggle activa/desactiva la recepción de alertas', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  const creado = await req(port, 'POST', '/api/cuidadores', nuevo(3));
  const id = creado.json.cuidador.id;
  const off = await req(port, 'PATCH', `/api/cuidadores/${id}/alertas`, { recibe_alertas: false });
  assert.strictEqual(off.json.recibe_alertas, false);
  const on = await req(port, 'PATCH', `/api/cuidadores/${id}/alertas`, { recibe_alertas: true });
  server.close();
  assert.strictEqual(on.json.recibe_alertas, true);
});

test('RF3.4: la calificación promedio solo cuenta reseñas verificadas', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  const creado = await req(port, 'POST', '/api/cuidadores', nuevo(4));
  const id = creado.json.cuidador.id;
  await req(port, 'POST', `/api/cuidadores/${id}/resenas`, { calificacion: 5, verificada: true });
  await req(port, 'POST', `/api/cuidadores/${id}/resenas`, { calificacion: 3, verificada: true });
  await req(port, 'POST', `/api/cuidadores/${id}/resenas`, { calificacion: 1, verificada: false });
  const det = await req(port, 'GET', `/api/cuidadores/${id}`);
  server.close();
  assert.strictEqual(det.json.total_resenas_verificadas, 2);
  assert.strictEqual(det.json.calificacion_promedio, 4); // (5+3)/2, ignora la no verificada
});
