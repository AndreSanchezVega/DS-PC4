import { api, h, card, toast } from '/shared.js';

const INTENCIONES = [
  { valor: 'adopcion', etiqueta: '❤️ Adopción', ayuda: 'Muestra animales de protectoras/ONGs.' },
  { valor: 'venta', etiqueta: '🏷️ Venta', ayuda: 'Muestra solo criaderos legalmente certificados.' },
  { valor: 'verificar', etiqueta: '🔎 Verificar Pérdida', ayuda: 'Contrasta con las alertas activas.' },
];

export default function render(root) {
  let intencionSel = null;
  const resultadosEl = h('div', {});

  // RF 2.1: interfaz única para cargar la imagen.
  const foto = h('input', { type: 'file', accept: 'image/jpeg,image/png' });
  const preview = h('img', { class: 'preview', style: 'max-width:180px;border-radius:10px;margin-top:10px;display:none' });
  foto.addEventListener('change', () => {
    if (foto.files[0]) {
      preview.src = URL.createObjectURL(foto.files[0]);
      preview.style.display = 'block';
    }
  });

  // RF 2.2: selección obligatoria de intención (una de tres).
  const ayudaEl = h('p', { class: 'hint' }, 'Selecciona una intención para continuar.');
  const botones = INTENCIONES.map((i) => h('button', { class: 'btn secondary', type: 'button' }, i.etiqueta));
  botones.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      intencionSel = INTENCIONES[idx].valor;
      botones.forEach((b) => { b.classList.add('secondary'); b.classList.remove('activo-intencion'); });
      btn.classList.remove('secondary');
      btn.classList.add('activo-intencion');
      ayudaEl.textContent = INTENCIONES[idx].ayuda;
    });
  });

  const especie = h('select', {}, ...['', 'Perro', 'Gato', 'Ave', 'Conejo', 'Otro'].map((e) => h('option', { value: e }, e || 'Cualquiera')));
  const color = h('input', { placeholder: 'Color (opcional)' });
  const tamano = h('select', {}, ...['', 'pequeno', 'mediano', 'grande'].map((t) => h('option', { value: t }, t || 'Cualquiera')));
  const raza = h('input', { placeholder: 'Raza (opcional)' });

  const buscarBtn = h('button', { class: 'btn', onclick: async () => {
    if (!intencionSel) return toast('Debes seleccionar una intención (RF 2.2)', 'error');
    if (!foto.files[0]) return toast('Debes cargar una imagen JPEG/PNG (RF 2.1)', 'error');
    const fd = new FormData();
    fd.append('intencion', intencionSel);
    fd.append('foto', foto.files[0]);
    fd.append('especie', especie.value);
    fd.append('color', color.value);
    fd.append('tamano', tamano.value);
    fd.append('raza', raza.value);
    try {
      const r = await api('POST', '/api/buscador/buscar', fd, true);
      pintarResultados(resultadosEl, r);
      toast(`Búsqueda «${r.intencion}» en ${r.tiempo_ms} ms · motor: ${r.motor}`, 'ok');
    } catch (e) { toast(e.message, 'error'); }
  } }, 'Buscar');

  root.append(
    card('🖼️ Buscador multipropósito por imagen',
      h('p', { class: 'hint' }, 'Sube una foto de la mascota y elige qué quieres hacer.'),
      h('label', {}, 'Imagen (JPEG/PNG)'), foto, preview,
      h('label', {}, 'Intención'),
      h('div', { class: 'row' }, ...botones),
      ayudaEl,
      h('div', { class: 'row' },
        col('Especie', especie), col('Tamaño', tamano), col('Color', color), col('Raza', raza)),
      buscarBtn),
    card('Resultados', resultadosEl)
  );
  resultadosEl.append(h('p', { class: 'placeholder' }, 'Aún no hay búsquedas.'));
}

function pintarResultados(cont, r) {
  cont.innerHTML = '';
  if (r.intencion === 'verificar' && r.disponible === false) {
    cont.append(h('p', { class: 'placeholder' }, 'El módulo de alertas no está disponible todavía.'));
    return;
  }
  const items = r.resultados || [];
  if (!items.length) {
    cont.append(h('p', { class: 'placeholder' }, 'Sin coincidencias para esta intención.'));
    return;
  }
  items.forEach((it) => {
    const info = [];
    if (r.intencion === 'venta') info.push(`${it.entidad} · certificado ✔ · S/ ${it.precio}`);
    else if (r.intencion === 'adopcion') info.push(`${it.entidad} · en adopción`);
    else info.push(it.descripcion || 'Alerta activa');
    cont.append(h('div', { class: 'item' },
      h('img', { src: it.foto_url || placeholder() }),
      h('div', { class: 'meta' },
        h('strong', {}, `${it.nombre} · ${it.especie}${it.raza ? ' (' + it.raza + ')' : ''}`),
        h('small', {}, info.join('')),
        it.similitud != null ? h('small', { html: `<br>similitud: ${(it.similitud * 100).toFixed(0)}%` }) : null),
      r.intencion === 'venta'
        ? h('span', { class: 'badge ok' }, 'CERTIFICADO')
        : r.intencion === 'adopcion'
          ? h('span', { class: 'badge' }, 'ADOPCIÓN')
          : h('span', { class: 'badge warn' }, 'COINCIDENCIA')));
  });
}

function placeholder() {
  return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23e2e8f0"/><text x="32" y="38" font-size="26" text-anchor="middle">🐾</text></svg>';
}
function col(lbl, input) { return h('div', {}, h('label', {}, lbl), input); }
