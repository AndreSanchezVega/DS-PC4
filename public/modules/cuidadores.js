import { api, h, card, toast } from '/shared.js';

const ROLES = [
  { valor: 'solidario', etiqueta: 'Cuidador Solidario' },
  { valor: 'profesional', etiqueta: 'Profesional' },
  { valor: 'especializado', etiqueta: 'Especializado' },
];
const ESPECIES = ['Perro', 'Gato', 'Ave', 'Conejo'];
const TAMANOS = ['pequeno', 'mediano', 'grande'];
// Fuerza checkboxes visibles (el estilo .switch oculta el input por defecto).
const CHK = 'width:auto;display:inline-block;margin-right:6px';

export default function render(root) {
  const listaEl = h('div', {}, h('p', { class: 'placeholder' }, 'Cargando cuidadores…'));
  root.append(
    h('div', { class: 'grid' }, formularioRegistro(listaEl)),
    card('👥 Cuidadores disponibles', listaEl)
  );
  refrescar(listaEl);
}

// --- RF 3.1 / 3.2 · RNF 3.1 -------------------------------------------------
function formularioRegistro(listaEl) {
  const nombre = h('input', { placeholder: 'Nombre completo' });
  const email = h('input', { placeholder: 'correo@example.com' });
  const rol = h('select', {}, ...ROLES.map((r) => h('option', { value: r.valor }, r.etiqueta)));
  const documento = h('input', { placeholder: 'DNI (8 dígitos)' });
  const medic = h('input', { type: 'checkbox', style: CHK });

  const especiesChecks = ESPECIES.map((e) => checkbox(e));
  const tamanosChecks = TAMANOS.map((t) => checkbox(t));

  const submit = h('button', { class: 'btn', onclick: async () => {
    const cuerpo = {
      nombre: nombre.value, email: email.value, rol: rol.value, documento_id: documento.value,
      administra_medicamentos: medic.checked,
      especies: especiesChecks.filter((c) => c.input.checked).map((c) => c.valor),
      tamanos: tamanosChecks.filter((c) => c.input.checked).map((c) => c.valor),
    };
    try {
      const r = await api('POST', '/api/cuidadores', cuerpo);
      toast(r.aviso || 'Cuidador registrado', 'ok');
      // RNF 3.1: validar documento para publicar el perfil.
      try {
        await api('POST', `/api/cuidadores/${r.cuidador.id}/validar-documento`);
        toast('Documento validado; perfil ahora público', 'ok');
      } catch (e) { toast('Registrado, pero el documento no pasó validación: ' + e.message, 'error'); }
      nombre.value = ''; email.value = ''; documento.value = '';
      refrescar(listaEl);
    } catch (e) { toast(e.message, 'error'); }
  } }, 'Registrar cuidador');

  return card('📝 Registrarse como cuidador',
    h('label', {}, 'Nombre'), nombre,
    h('label', {}, 'Email'), email,
    h('div', { class: 'row' }, col('Rol', rol), col('Documento de identidad', documento)),
    h('label', {}, 'Especies que acepta'),
    h('div', { class: 'row' }, ...especiesChecks.map((c) => c.wrap)),
    h('label', {}, 'Tamaños que acepta'),
    h('div', { class: 'row' }, ...tamanosChecks.map((c) => c.wrap)),
    h('label', { class: 'switch' }, medic, h('span', {}, ' Administra medicamentos')),
    submit
  );
}

// --- Listado con RF 3.3 (toggle) y RF 3.4 (calificación) --------------------
async function refrescar(listaEl) {
  try {
    const cuidadores = await api('GET', '/api/cuidadores');
    listaEl.innerHTML = '';
    if (!cuidadores.length) { listaEl.append(h('p', { class: 'placeholder' }, 'No hay cuidadores públicos.')); return; }
    cuidadores.forEach((c) => listaEl.append(tarjetaCuidador(c, listaEl)));
  } catch (e) {
    listaEl.innerHTML = '';
    listaEl.append(h('p', { class: 'error' }, e.message));
  }
}

function tarjetaCuidador(c, listaEl) {
  // RF 3.3: interruptor de alertas.
  const toggle = h('input', { type: 'checkbox', ...(c.recibe_alertas ? { checked: 'true' } : {}) });
  toggle.addEventListener('change', async () => {
    try {
      const r = await api('PATCH', `/api/cuidadores/${c.id}/alertas`, { recibe_alertas: toggle.checked });
      toast(`Alertas ${r.recibe_alertas ? 'activadas' : 'desactivadas'} para ${c.nombre}`, 'ok');
    } catch (e) { toast(e.message, 'error'); toggle.checked = !toggle.checked; }
  });

  const estrellas = c.calificacion_promedio != null
    ? '★'.repeat(Math.round(c.calificacion_promedio)) + '☆'.repeat(5 - Math.round(c.calificacion_promedio))
    : 'sin reseñas';

  // RF 3.4: formulario de reseña (verificada opcional).
  const cal = h('select', {}, ...[5, 4, 3, 2, 1].map((n) => h('option', { value: n }, `${n} ★`)));
  const coment = h('input', { placeholder: 'Comentario' });
  const verif = h('input', { type: 'checkbox', checked: 'true', style: CHK });
  const enviarResena = h('button', { class: 'btn secondary', onclick: async () => {
    try {
      await api('POST', `/api/cuidadores/${c.id}/resenas`, {
        calificacion: Number(cal.value), comentario: coment.value, verificada: verif.checked, dueno_nombre: 'Dueño',
      });
      toast('Reseña registrada', 'ok');
      refrescar(listaEl);
    } catch (e) { toast(e.message, 'error'); }
  } }, 'Enviar reseña');

  return h('div', { class: 'card' },
    h('div', { class: 'row' },
      h('div', {},
        h('strong', {}, c.nombre + ' '),
        h('span', { class: 'badge' }, rolEtiqueta(c.rol)),
        h('div', { class: 'stars' }, estrellas + ` (${c.total_resenas_verificadas} verif.)`),
        h('small', {}, `Especies: ${c.especies.join(', ') || '—'} · Tamaños: ${c.tamanos.join(', ') || '—'}`),
        h('br'),
        h('small', {}, `Medicamentos: ${c.administra_medicamentos ? 'sí' : 'no'} · Documento: ${c.documento_validado ? 'validado ✔' : 'pendiente'}`)),
      h('label', { class: 'switch' }, toggle, h('span', { class: 'track' }), h('span', {}, ' Alertas'))),
    h('div', { class: 'row', style: 'margin-top:10px' }, col('Calificación', cal), col('Comentario', coment),
      h('label', { class: 'switch' }, verif, h('span', {}, ' Verificada'))),
    enviarResena
  );
}

// --- helpers ----------------------------------------------------------------
function checkbox(valor) {
  const input = h('input', { type: 'checkbox', style: CHK });
  const wrap = h('label', { class: 'switch' }, input, h('span', {}, ' ' + valor));
  return { valor, input, wrap };
}
function rolEtiqueta(v) { return (ROLES.find((r) => r.valor === v) || {}).etiqueta || v; }
function col(lbl, input) { return h('div', {}, h('label', {}, lbl), input); }
