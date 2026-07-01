# DS-PC4 · Plataforma de Mascotas

Proyecto del curso de **Desarrollo de Software**. Plataforma web que integra tres módulos
funcionales sobre bienestar animal:

1. **Reporte de Animales Perdidos y Alertas** — reportes de mascotas perdidas, avistamientos
   ciudadanos y notificaciones automáticas por radio geográfico.
2. **Buscador Multipropósito por Imagen** — carga de una imagen con una intención
   (Adopción, Venta o Verificar Pérdida) y devolución de resultados según la intención.
3. **Red de Cuidadores de Mascotas** — registro de cuidadores por roles, restricciones de
   servicio, suscripción a alertas y calificación por reseñas verificadas.

## Tecnología

- **Backend:** Node.js + Express (API REST).
- **Base de datos:** SQLite embebido (`node:sqlite`, sin dependencias nativas).
- **Frontend:** Web (HTML + CSS + JavaScript modular).

## Estado

Repositorio en construcción mediante flujo *Git Flow* (`main` ← `develop` ← `feature/*`).
Cada módulo se integra a `develop` a través de su propio Pull Request.

## Autor

Andre Sanchez Vega
