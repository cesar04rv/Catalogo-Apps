const API_BASE = '/catalogo-apps/backend';

async function apiFetch(endpoint, { method = 'GET', body = null, params = {}, headers = {} } = {}) {
  let url = API_BASE + endpoint;

  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
  ).toString();
  if (qs) url += '?' + qs;

  const esFormData = body instanceof FormData;

  const opts = {
    method,
    credentials: 'same-origin',
    headers: esFormData ? {} : { 'Content-Type': 'application/json', ...headers },
  };
  if (body) opts.body = esFormData ? body : JSON.stringify(body);

  const res  = await fetch(url, opts);
  const data = await res.json().catch(() => ({ exito: false, mensaje: 'Respuesta no válida del servidor' }));

  if (endpoint.includes('/auth/login')) return data;

  if (res.status === 401) {
    App.navigate('login');
    throw new Error('Sesión expirada');
  }

  if (!res.ok && !data.exito) {
    throw new Error(data.mensaje || `Error ${res.status}`);
  }

  return data;
}

const Auth = {
  login:  (correo, contrasena) => apiFetch('/auth/login',  { method: 'POST', body: { correo, contrasena } }),
  logout: ()                   => apiFetch('/auth/logout', { method: 'POST' }),
  yo:     ()                   => apiFetch('/auth/me'),
};

const Proyectos = {
  listar:    (params = {}) => apiFetch('/proyectos',        { params }),
  obtener:   (id)          => apiFetch(`/proyectos/${id}`),
  crear:     (datos)       => apiFetch('/proyectos',        { method: 'POST',   body: datos }),
  actualizar:(id, datos)   => apiFetch(`/proyectos/${id}`,  { method: 'PUT',    body: datos }),
  eliminar:  (id)          => apiFetch(`/proyectos/${id}`,  { method: 'DELETE' }),
};

const Tecnologias = {
  listar:    ()            => apiFetch('/tecnologias'),
  crear:     (datos)       => apiFetch('/tecnologias',       { method: 'POST',   body: datos }),
  actualizar:(id, datos)   => apiFetch(`/tecnologias/${id}`, { method: 'PUT',    body: datos }),
  eliminar:  (id)          => apiFetch(`/tecnologias/${id}`, { method: 'DELETE' }),
};

const Usuarios = {
  listar:    ()            => apiFetch('/usuarios'),
  crear:     (datos)       => apiFetch('/usuarios',          { method: 'POST',   body: datos }),
  actualizar:(id, datos)   => apiFetch(`/usuarios/${id}`,    { method: 'PUT',    body: datos }),
  eliminar:  (id)          => apiFetch(`/usuarios/${id}`,    { method: 'DELETE' }),
};

const Archivos = {
  listar:   (proyectoId)            => apiFetch(`/proyectos/${proyectoId}/archivos`),
  subir:    (proyectoId, formData)  => apiFetch(`/proyectos/${proyectoId}/archivos`, { method: 'POST', body: formData }),
  eliminar: (id)                    => apiFetch(`/archivos/${id}`, { method: 'DELETE' }),
};

const Docs = {
  // Categorías
  listarCategorias:    ()            => apiFetch('/docs-categorias'),
  crearCategoria:      (datos)       => apiFetch('/docs-categorias',       { method: 'POST',   body: datos }),
  actualizarCategoria: (id, datos)   => apiFetch(`/docs-categorias/${id}`, { method: 'PUT',    body: datos }),
  eliminarCategoria:   (id)          => apiFetch(`/docs-categorias/${id}`, { method: 'DELETE' }),
  previsualizar: (id) => `${API_BASE}/docs/${id}/previsualizar`,

  // Documentos
  listar:    (params = {}) => apiFetch('/docs',       { params }),
  subir:     (formData)    => apiFetch('/docs',       { method: 'POST', body: formData }),
  actualizar:(id, datos)   => apiFetch(`/docs/${id}`, { method: 'PUT',  body: datos }),
  eliminar:  (id)          => apiFetch(`/docs/${id}`, { method: 'DELETE' }),
  descargar: (id)          => `${API_BASE}/docs/${id}/descargar`,
  obtenerContenido: (id) => apiFetch(`/docs/${id}/contenido`),

  // Asociar/desasociar proyectos
  asociar:    (docId, proyectoId) => apiFetch(`/docs/${docId}/proyectos/${proyectoId}`, { method: 'POST' }),
  desasociar: (docId, proyectoId) => apiFetch(`/docs/${docId}/proyectos/${proyectoId}`, { method: 'DELETE' }),
};