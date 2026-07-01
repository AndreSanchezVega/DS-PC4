import { api, h, card, toast } from '/shared.js';

export default function render(root) {
  root.append(
    h('div', { class: 'grid' }, formularioReporte(), formularioAvistamiento()),
    listaAlertas()
  );
}

// --- RF 1.1 / 1.2 / 1.4 -----------------------------------------------------
function formularioReporte() {
  const especie = h('select', { name: 'especie' },
    ...['Perro', 'Gato', 'Ave', 'Conejo', 'Otro'].map((e) => h('option', {}, e)));
  const nombre = h('input', { name: 'nombre', placeholder: 'Ej. Firulais', required: 'true' });
  const raza = h('input', { name: 'raza', placeholder: 'Ej. Labrador' });
  const descripcion = h('textarea', { name: 'descripcion', placeholder: 'Color, señas particulares, collar…' });
  const foto = h('input', { type: 'file', name: 'foto', accept: 'image/png,image/jpeg' });
  const lat = h('input', { name: 'lat', placeholder: 'Latitud', value: '-12.0464' });
  const lon = h('input', { name: 'lon', placeholder: 'Longitud', value: '-77.0428' });
  const radio = h('input', { name: 'radio_km', type: 'number', min: '0.1', step: '0.1', value: '2' });
  const duenoNombre = h('input', { name: 'dueno_nombre', placeholder: 'Nombre del dueño' });
  const duenoEmail = h('input', { name: 'dueno_email', placeholder: 'correo@dueño.com' });
  const duenoTel = h('input', { name: 'dueno_telefono', placeholder: 'Teléfono de contacto' });

  const btnGeo = h('button', { class: 'btn secondary', type: 'button', onclick: () => {
    if (!navigator.geolocation) return toast('El navegador no soporta geolocalización', 'error');
    navigator.geolocation.getCurrentPosition(
      (p) => { lat.value = p.coords.latitude.toFixed(4); lon.value = p.coords.longitude.toFixed(4); toast('Ubicación capturada', 'ok'); },
      () => toast('No se pudo obtener la ubicación', 'error')
    );
  } }, '📍 Usar mi ubicación (GPS)');

  const submit = h('button', { class: 'btn', onclick: async (ev) => {
    ev.preventDefault();
    if (!nombre.value.trim()) return toast('El nombre es obligatorio', 'error');
    const fd = new FormData();
    [['nombre', nombre], ['especie', especie], ['raza', raza], ['descripcion', descripcion],
     ['lat', lat], ['lon', lon], ['radio_km', radio],
     ['dueno_nombre', duenoNombre], ['dueno_email', duenoEmail], ['dueno_telefono', duenoTel]]
      .forEach(([k, el]) => fd.append(k, el.value));
    if (foto.files[0]) fd.append('foto', foto.files[0]);
    try {
      const r = await api('POST', '/api/alertas/reportes', fd, true);
      toast(`Reporte creado. ${r.notificaciones_enviadas} notificación(es) en ${r.tiempo_ms} ms ` +
            `(${r.cumple_latencia ? 'cumple <5s' : 'excede 5s'})`, 'ok');
      nombre.value = ''; raza.value = ''; descripcion.value = '';
      refrescarLista();
    } catch (e) { toast(e.message, 'error'); }
  } }, 'Reportar mascota perdida');

  return card('🐕 Reportar mascota perdida',
    label('Nombre'), nombre,
    row(col('Especie', especie), col('Raza', raza)),
    label('Descripción'), descripcion,
    label('Foto (JPEG/PNG)'), foto,
    row(col('Latitud', lat), col('Longitud', lon), col('Radio (km)', radio)),
    btnGeo,
    h('p', { class: 'hint' }, 'Datos de contacto del dueño (privados, no se muestran a los ciudadanos):'),
    row(col('Dueño', duenoNombre), col('Email', duenoEmail), col('Teléfono', duenoTel)),
    submit
  );
}

// --- RF 1.3 -----------------------------------------------------------------
function formularioAvistamiento() {
  const descripcion = h('textarea', { placeholder: '¿Dónde y cómo lo viste?' });
  const foto = h('input', { type: 'file', accept: 'image/png,image/jpeg' });
  const lat = h('input', { placeholder: 'Latitud', value: '-12.0490' });
  const lon = h('input', { placeholder: 'Longitud', value: '-77.0440' });
  const reporteId = h('input', { placeholder: 'ID de alerta relacionada (opcional)' });

  const submit = h('button', { class: 'btn', onclick: async (ev) => {
    ev.preventDefault();
    const fd = new FormData();
    fd.append('descripcion', descripcion.value);
    fd.append('lat', lat.value);
    fd.append('lon', lon.value);
    if (reporteId.value) fd.append('reporte_id', reporteId.value);
    if (foto.files[0]) fd.append('foto', foto.files[0]);
    try {
      await api('POST', '/api/alertas/avistamientos', fd, true);
      toast('¡Gracias! Avistamiento registrado de forma anónima', 'ok');
      descripcion.value = '';
    } catch (e) { toast(e.message, 'error'); }
  } }, 'Reportar avistamiento');

  return card('👀 Reportar avistamiento (anónimo)',
    h('p', { class: 'hint' }, 'No necesitas registrarte. Tus datos y los del dueño permanecen privados.'),
    label('Descripción'), descripcion,
    label('Foto'), foto,
    row(col('Latitud', lat), col('Longitud', lon)),
    label('ID de alerta relacionada'), reporteId,
    submit
  );
}

// --- Listado de alertas activas ---------------------------------------------
let listaEl;
function listaAlertas() {
  listaEl = h('div', {}, h('p', { class: 'placeholder' }, 'Cargando alertas…'));
  refrescarLista();
  return card('🚨 Alertas activas', listaEl);
}

async function refrescarLista() {
  if (!listaEl) return;
  try {
    const reportes = await api('GET', '/api/alertas/reportes');
    listaEl.innerHTML = '';
    if (!reportes.length) { listaEl.append(h('p', { class: 'placeholder' }, 'No hay alertas activas.')); return; }
    reportes.forEach((r) => {
      listaEl.append(h('div', { class: 'item' },
        h('img', { src: r.foto_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23e2e8f0"/><text x="32" y="38" font-size="26" text-anchor="middle">🐾</text></svg>' }),
        h('div', { class: 'meta' },
          h('strong', {}, `${r.nombre} · ${r.especie}${r.raza ? ' (' + r.raza + ')' : ''}`),
          h('small', {}, r.descripcion || 'Sin descripción'),
          h('br'),
          h('small', {}, `📍 ${r.lat}, ${r.lon} · radio ${r.radio_km} km`)),
        h('span', { class: 'badge danger' }, 'PERDIDO')));
    });
  } catch (e) {
    listaEl.innerHTML = '';
    listaEl.append(h('p', { class: 'error' }, e.message));
  }
}

// --- pequeños helpers de layout ---------------------------------------------
function label(t) { return h('label', {}, t); }
function row(...cols) { return h('div', { class: 'row' }, ...cols); }
function col(lbl, input) { return h('div', {}, label(lbl), input); }
