// Utilidades compartidas por los módulos del frontend.

/** Llama a la API y devuelve el JSON. Lanza Error con el mensaje del backend. */
export async function api(method, url, body, isForm = false) {
  const opts = { method };
  if (body && !isForm) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  } else if (body && isForm) {
    opts.body = body; // FormData: el navegador pone el Content-Type con boundary
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = (data && data.error) || res.statusText || 'Error de red';
    throw new Error(msg);
  }
  return data;
}

/** Crea un elemento del DOM de forma concisa. */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function')
      el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** Notificación flotante temporal. tipo: info | ok | error */
export function toast(msg, tipo = 'info') {
  const t = h('div', { class: `toast ${tipo}` }, msg);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

/** Envuelve contenido en una tarjeta con título opcional. */
export function card(titulo, ...children) {
  const c = h('section', { class: 'card' });
  if (titulo) c.append(h('h3', { class: 'card-title' }, titulo));
  children.flat().forEach((ch) => ch && c.append(ch));
  return c;
}
