'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// La base de datos se guarda en /data. Cada módulo aporta su propio archivo
// de migración en src/db/migrations, que se ejecuta al iniciar la aplicación.
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// La ruta puede sobrescribirse con DB_PATH (útil en pruebas: usar ':memory:').
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;'); // espera si la BD está bloqueada
db.exec('PRAGMA foreign_keys = ON;');

function runMigrations() {
  const dir = path.join(__dirname, 'db', 'migrations');
  if (!fs.existsSync(dir)) return;
  const archivos = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const archivo of archivos) {
    const sql = fs.readFileSync(path.join(dir, archivo), 'utf8');
    db.exec(sql);
  }
}

runMigrations();

module.exports = { db };
