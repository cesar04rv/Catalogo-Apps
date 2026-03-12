// ============================================================
// frontend/js/app.js
// ============================================================

const App = {
  state: {
    usuario:      null,
    tecnologias:  [],
    usuarios:     [],
    filtros: { busqueda: '', estado: '', usuario_id: '', tecnologia_id: '', pagina: 1 },
  },

  navigate(pagina, datos = {}) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const destino = document.getElementById('page-' + pagina);
    if (destino) destino.classList.add('active');
    window.scrollTo(0, 0);
    const manejador = PageHandlers[pagina];
    if (manejador) manejador(datos);
  },

  setUser(usuario) {
    this.state.usuario = usuario;
    if (usuario?.rol === 'admin') {
      document.body.classList.add('is-admin');
    } else {
      document.body.classList.remove('is-admin');
    }
    document.getElementById('nav-user-name').textContent = usuario?.nombre ?? '';
    document.getElementById('navbar').style.display = usuario ? 'flex' : 'none';
  },

  async init() {
  initTheme();
  try {
    const res = await Auth.yo();
    if (res.exito && res.datos) {
      this.setUser(res.datos);
      this.navigate('projects');
    } else {
      this.navigate('login');
    }
  } catch {
    this.navigate('login');
  }
},
};

// ---- Toast ----
function toast(mensaje, tipo = 'info', duracion = 3500) {
  const iconos = { success: '✓', error: '✕', info: 'i' };
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.innerHTML = `<span>${iconos[tipo] ?? 'i'}</span><span>${mensaje}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), duracion);
}

// ---- Confirmación ----
function confirm(mensaje, alConfirmar) {
  const overlay = document.getElementById('confirm-overlay');
  const msg     = document.getElementById('confirm-message');
  const si      = document.getElementById('confirm-yes');
  const no      = document.getElementById('confirm-no');
  msg.textContent = mensaje;
  overlay.classList.add('open');
  const limpiar = () => overlay.classList.remove('open');
  si.onclick = () => { limpiar(); alConfirmar(); };
  no.onclick  = limpiar;
}

// ---- Helpers UI ----
function statusBadge(estado) {
  const etiquetas = { produccion: 'Producción', desarrollo: 'Desarrollo', parado: 'Parado' };
  return `<span class="badge badge-status-${estado}">${etiquetas[estado] ?? estado}</span>`;
}

function techBadges(tecnologias = []) {
  return tecnologias.map(t =>
    `<span class="badge badge-tech" style="background:${t.color}22;color:${t.color};border:1px solid ${t.color}44">${t.nombre}</span>`
  ).join('');
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(fechaStr) {
  if (!fechaStr) return '—';
  return new Date(fechaStr).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
}

// ---- Tema claro/oscuro ----
function initTheme() {
  const guardado = localStorage.getItem('tema') || 'light';
  document.documentElement.setAttribute('data-theme', guardado);
  actualizarBtnTema(guardado);
}

function toggleTheme() {
  const actual  = document.documentElement.getAttribute('data-theme');
  const siguiente = actual === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', siguiente);
  localStorage.setItem('tema', siguiente);
  actualizarBtnTema(siguiente);
}

function actualizarBtnTema(tema) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = tema === 'dark' ? '☀️' : '🌙';
}

// ---- Login / Logout ----
async function doLogin() {
  const errEl   = document.getElementById('login-error');
  const btnText = document.getElementById('login-btn-text');
  errEl.textContent = '';
  const correo     = document.getElementById('l-email').value.trim();
  const contrasena = document.getElementById('l-pass').value;
  if (!correo || !contrasena) { errEl.textContent = 'Introduce correo y contraseña'; return; }
  btnText.textContent = 'Entrando…';
  try {
    const res = await Auth.login(correo, contrasena);
    if (res.exito) {
      App.setUser(res.datos);
      App.navigate('projects');
    } else {
      errEl.textContent = res.mensaje ?? 'Credenciales incorrectas';
      btnText.textContent = 'Entrar';
    }
  } catch (err) {
    errEl.textContent = err.message;
    btnText.textContent = 'Entrar';
  }
}

async function doLogout() {
  try { await Auth.logout(); } catch {}
  App.setUser(null);
  App.navigate('login');
}

// ---- Iniciar app ----
document.addEventListener('DOMContentLoaded', () => App.init());