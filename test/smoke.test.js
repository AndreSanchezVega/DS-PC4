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

function request(port, method, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port, method, path: pathname }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('GET /api/health responde ok', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  const res = await request(port, 'GET', '/api/health');
  server.close();
  assert.strictEqual(res.status, 200);
  assert.match(res.body, /"ok":true/);
});

test('GET /api/modules devuelve un arreglo', async () => {
  const server = await listen(createApp());
  const { port } = server.address();
  const res = await request(port, 'GET', '/api/modules');
  server.close();
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(JSON.parse(res.body)));
});

module.exports = { listen, request };
