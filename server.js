'use strict';

// Punto de entrada de la aplicación.
// Inicializa la base de datos (ejecuta migraciones) y levanta el servidor HTTP.
require('./src/db');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log('\n  DS-PC4 · Plataforma de Mascotas');
  console.log(`  Servidor escuchando en http://localhost:${PORT}\n`);
});
