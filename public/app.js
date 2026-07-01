// Shell del frontend: obtiene el manifiesto de módulos del backend y construye
// la navegación por pestañas. Cada módulo se carga dinámicamente desde
// /modules/<id>.js y debe exportar por defecto una función render(root, meta).

const tabsEl = document.getElementById('tabs');
const contentEl = document.getElementById('content');

async function init() {
  let modulos = [];
  try {
    const res = await fetch('/api/modules');
    modulos = await res.json();
  } catch (e) {
    contentEl.innerHTML = `<p class="error">No se pudo contactar al servidor: ${e.message}</p>`;
    return;
  }

  if (!modulos.length) {
    contentEl.innerHTML = '<p class="placeholder">Aún no hay módulos disponibles.</p>';
    return;
  }

  tabsEl.innerHTML = '';
  modulos.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.textContent = m.titulo;
    btn.addEventListener('click', () => activar(m, btn));
    tabsEl.appendChild(btn);
    if (i === 0) activar(m, btn);
  });
}

async function activar(meta, btn) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  contentEl.innerHTML = '<p class="placeholder">Cargando…</p>';
  try {
    const mod = await import(meta.frontend);
    contentEl.innerHTML = '';
    mod.default(contentEl, meta);
  } catch (e) {
    contentEl.innerHTML = `<p class="error">No se pudo cargar el módulo «${meta.titulo}»: ${e.message}</p>`;
  }
}

init();
