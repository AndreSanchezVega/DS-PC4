'use strict';

const express = require('express');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Construye la aplicación Express.
 *
 * Los módulos funcionales se cargan de forma dinámica: cada archivo en
 * `src/routes/*.js` debe exportar un objeto con la forma
 *   { id, titulo, descripcion, basePath, router, orden }
 * De este modo agregar un módulo nuevo NO requiere modificar este archivo,
 * lo que permite desarrollarlos en ramas independientes sin conflictos.
 */
function createApp() {
  const app = express();

  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Frontend estático e imágenes subidas por los usuarios.
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  const modulos = [];
  const routesDir = path.join(__dirname, 'routes');
  if (fs.existsSync(routesDir)) {
    const archivos = fs
      .readdirSync(routesDir)
      .filter((f) => f.endsWith('.js'))
      .sort();

    for (const archivo of archivos) {
      const mod = require(path.join(routesDir, archivo));
      if (!mod || !mod.basePath || !mod.router) continue;
      app.use(mod.basePath, mod.router);
      modulos.push({
        id: mod.id,
        titulo: mod.titulo,
        descripcion: mod.descripcion || '',
        basePath: mod.basePath,
        frontend: `/modules/${mod.id}.js`,
        orden: mod.orden ?? 99,
      });
    }
  }
  modulos.sort((a, b) => a.orden - b.orden);

  // Manifiesto que consume el frontend para construir la navegación.
  app.get('/api/modules', (_req, res) => res.json(modulos));
  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, modulos: modulos.length, ts: Date.now() })
  );

  return app;
}

module.exports = { createApp };
