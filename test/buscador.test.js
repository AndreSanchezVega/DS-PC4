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

test('RF2.2: rechaza búsqueda sin intención válida', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  const res = await req(port, 'POST', '/api/buscador/buscar', { especie: 'Perro' });
  server.close();
  assert.strictEqual(res.status, 400);
});

test('RF2.3: adopción devuelve solo protectoras/ONGs', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  const res = await req(port, 'POST', '/api/buscador/buscar', { intencion: 'adopcion', especie: 'Perro' });
  server.close();
  assert.strictEqual(res.status, 200);
  assert.ok(res.json.resultados.length >= 1);
  assert.ok(res.json.resultados.every((x) => x.tipo === 'protectora'), 'todos deben ser protectoras');
});

test('RF2.4: venta devuelve solo criaderos certificados', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  const res = await req(port, 'POST', '/api/buscador/buscar', { intencion: 'venta', especie: 'Perro' });
  server.close();
  assert.strictEqual(res.status, 200);
  assert.ok(res.json.resultados.every((x) => x.tipo === 'criadero' && x.certificado === 1),
    'todos deben ser criaderos certificados');
  const nombres = res.json.resultados.map((x) => x.nombre);
  assert.ok(!nombres.includes('Zeus'), 'no debe incluir al criadero sin licencia');
});

test('RF2.5: verificar pérdida devuelve 200 con arreglo de resultados', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  const res = await req(port, 'POST', '/api/buscador/buscar', { intencion: 'verificar', especie: 'Perro' });
  server.close();
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.json.resultados));
});
