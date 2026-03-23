// ============================================================
// frontend/js/pages.js
// ============================================================

const PageHandlers = {
  login() {
    const form = document.getElementById("login-form");
    const errEl = document.getElementById("login-error");
    const btnText = document.getElementById("login-btn-text");

    form.onsubmit = async (e) => {
      e.preventDefault();
      errEl.textContent = "";
      const correo = form.querySelector("[name=email]").value.trim();
      const contrasena = form.querySelector("[name=password]").value;
      btnText.textContent = "Entrando…";
      try {
        const res = await Auth.login(correo, contrasena);
        if (res.exito) {
          App.setUser(res.datos);
          App.navigate("projects");
        } else {
          errEl.textContent = res.mensaje ?? "Credenciales incorrectas";
          btnText.textContent = "Entrar";
        }
      } catch (err) {
        errEl.textContent = err.message;
        btnText.textContent = "Entrar";
      }
    };
  },

  async projects() {
    if (!App.state.tecnologias.length) {
      const techRes = await Tecnologias.listar();
      App.state.tecnologias = techRes.datos ?? [];
    }
    if (!App.state.usuarios.length && App.state.usuario?.rol === "admin") {
      const userRes = await Usuarios.listar();
      App.state.usuarios = userRes.datos ?? [];
    }

    const f = App.state.filtros;
    populateFilterSelects();
    restoreFilters();
    attachFilterListeners();
    await cargarProyectos();

    async function cargarProyectos() {
      const container = document.getElementById("projects-container");
      container.innerHTML = '<div class="loading">Cargando proyectos</div>';
      try {
        const res = await Proyectos.listar({
          busqueda: f.busqueda,
          estado: f.estado,
          usuario_id: f.usuario_id,
          tecnologia_id: f.tecnologia_id,
          pagina: f.pagina,
        });
        renderProyectos(res.datos ?? []);
        renderPaginacion(res.meta);
      } catch (err) {
        container.innerHTML = `<div class="empty-state"><p>${escHtml(err.message)}</p></div>`;
      }
    }

    function renderProyectos(proyectos) {
      const container = document.getElementById("projects-container");
      if (!proyectos.length) {
        container.innerHTML = `
          <div class="empty-state">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7h18M3 12h18M3 17h10"/></svg>
            <p>No se encontraron proyectos con estos filtros.</p>
          </div>`;
        return;
      }
      container.innerHTML = `<div class="projects-grid">${proyectos
        .map((p) => {
          const usuariosHtml = (p.usuarios ?? [])
            .map((u) =>
              u.rol === "propietario"
                ? `<span style="font-weight:600;font-size:11px;color:var(--text-secondary);background:var(--bg-raised);border:1px solid var(--border);padding:2px 8px;border-radius:20px">${escHtml(u.nombre)}</span>`
                : `<span style="font-weight:400;font-size:11px;color:var(--text-secondary);background:var(--bg-raised);border:1px solid var(--border);padding:2px 8px;border-radius:20px">${escHtml(u.nombre)}</span>`,
            )
            .join(" ");
          return `
          <div class="project-card" data-id="${p.id}">
            <div class="project-card-main">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">
                <h3 style="margin:0">${escHtml(p.nombre)}</h3>
                ${usuariosHtml ? `<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">${usuariosHtml}</div>` : ""}
              </div>
              ${p.subtitulo ? `<p style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${escHtml(p.subtitulo)}</p>` : ""}
              <p>${escHtml(p.descripcion ?? "")}</p>
              <div class="project-card-meta">
                ${statusBadge(p.estado)}
                ${techBadges(p.tecnologias)}
              </div>
            </div>
            <div class="project-card-actions">
              <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();App.navigate('project-detail',{id:${p.id}})">Ver</button>
              <button class="btn btn-ghost btn-sm admin-only" onclick="event.stopPropagation();openProjectModal(${p.id})">Editar</button>
              <button class="btn btn-danger btn-sm admin-only" onclick="event.stopPropagation();deleteProject(${p.id},'${escHtml(p.nombre)}')">Eliminar</button>
            </div>
          </div>`;
        })
        .join("")}</div>`;
      container.querySelectorAll(".project-card").forEach((card) => {
        card.addEventListener("click", () =>
          App.navigate("project-detail", { id: +card.dataset.id }),
        );
      });
    }

    function renderPaginacion(meta) {
      const el = document.getElementById("pagination");
      if (!meta || meta.total_paginas <= 1) {
        el.innerHTML = "";
        return;
      }
      const { pagina, total_paginas, total } = meta;
      let html = `<button ${pagina <= 1 ? "disabled" : ""} onclick="changePage(${pagina - 1})">‹</button>`;
      for (
        let i = Math.max(1, pagina - 2);
        i <= Math.min(total_paginas, pagina + 2);
        i++
      ) {
        html += `<button class="${i === pagina ? "active" : ""}" onclick="changePage(${i})">${i}</button>`;
      }
      html += `<button ${pagina >= total_paginas ? "disabled" : ""} onclick="changePage(${pagina + 1})">›</button>`;
      html += `<span class="page-info">${total} proyectos</span>`;
      el.innerHTML = html;
    }

    function populateFilterSelects() {
      document.getElementById("filter-owner").innerHTML =
        '<option value="">Todos los responsables</option>' +
        App.state.usuarios
          .map((u) => `<option value="${u.id}">${escHtml(u.nombre)}</option>`)
          .join("");
      document.getElementById("filter-tech").innerHTML =
        '<option value="">Todas las tecnologías</option>' +
        App.state.tecnologias
          .map((t) => `<option value="${t.id}">${escHtml(t.nombre)}</option>`)
          .join("");
    }

    function restoreFilters() {
      document.getElementById("filter-search").value = f.busqueda;
      document.getElementById("filter-status").value = f.estado;
      document.getElementById("filter-owner").value = f.usuario_id ?? "";
      document.getElementById("filter-tech").value = f.tecnologia_id;
    }

    function attachFilterListeners() {
      let timerBusqueda;
      document.getElementById("filter-search").oninput = (e) => {
        clearTimeout(timerBusqueda);
        timerBusqueda = setTimeout(() => {
          f.busqueda = e.target.value.trim();
          f.pagina = 1;
          cargarProyectos();
        }, 350);
      };
      document.getElementById("filter-status").onchange = (e) => {
        f.estado = e.target.value;
        f.pagina = 1;
        cargarProyectos();
      };
      document.getElementById("filter-owner").onchange = (e) => {
        f.usuario_id = e.target.value;
        f.pagina = 1;
        cargarProyectos();
      };
      document.getElementById("filter-tech").onchange = (e) => {
        f.tecnologia_id = e.target.value;
        f.pagina = 1;
        cargarProyectos();
      };
    }
  },

  async "project-detail"({ id }) {
    const container = document.getElementById("project-detail-content");
    container.innerHTML = '<div class="loading">Cargando</div>';
    try {
      const res = await Proyectos.obtener(id);
      const p = res.datos;

      const propietarios = (p.usuarios ?? []).filter(
        (u) => u.rol === "propietario",
      );
      const colaboradores = (p.usuarios ?? []).filter(
        (u) => u.rol === "colaborador",
      );

      const listaUsuariosHtml = (usuarios) =>
        usuarios.length
          ? usuarios
              .map(
                (
                  u,
                ) => `<span style="display:inline-flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="font-family:var(--font-sans)">${escHtml(u.nombre)}</span>
              <span style="font-size:11px;color:var(--text-muted)">${escHtml(u.correo)}</span>
            </span>`,
              )
              .join("<br>")
          : "—";

      container.innerHTML = `
        <div class="detail-header">
          <div>
            <h2>${escHtml(p.nombre)}</h2>
            ${p.subtitulo ? `<p style="color:var(--text-secondary);margin-top:4px;font-size:15px">${escHtml(p.subtitulo)}</p>` : ""}
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
              ${statusBadge(p.estado)}
              ${techBadges(p.tecnologias)}
            </div>
          </div>
          <div class="detail-actions">
            <button class="btn btn-ghost btn-sm admin-only" onclick="openProjectModal(${p.id})">Editar</button>
            <button class="btn btn-danger btn-sm admin-only" onclick="deleteProject(${p.id},'${escHtml(p.nombre)}',true)">Eliminar</button>
          </div>
        </div>

        <div class="detail-grid">
          <div>
            <div class="detail-section" style="margin-bottom:16px">
              <h4>Descripción</h4>
              <p style="font-size:13px;line-height:1.7;color:var(--text-secondary);white-space:pre-wrap">${escHtml(p.descripcion ?? "—")}</p>            </div>
            <div class="detail-section">
              <h4>Responsables</h4>
              <dl>
                <div class="detail-row"><dt>Propietarios</dt><dd class="plain">${listaUsuariosHtml(propietarios)}</dd></div>
                <div class="detail-row"><dt>Colaboradores</dt><dd class="plain">${listaUsuariosHtml(colaboradores)}</dd></div>
              </dl>
            </div>
          </div>
          <div>
            <div class="detail-section">
              <h4>Información técnica</h4>
              <dl>
                <div class="detail-row"><dt>Ubicación</dt><dd>${escHtml(p.ubicacion ?? "—")}</dd></div>
                <div class="detail-row"><dt>Ordenador</dt><dd>${escHtml(p.ordenador ?? "—")}</dd></div>
                <div class="detail-row"><dt>Entornos de desarrollo</dt><dd>${escHtml(p.entorno_desarrollo ?? "—")}</dd></div>
                <div class="detail-row"><dt>URL</dt><dd>${p.url ? `<a href="${escHtml(p.url)}" target="_blank">${escHtml(p.url)}</a>` : "—"}</dd></div>
                <div class="detail-row"><dt>Credenciales</dt><dd>${escHtml(p.ubicacion_credenciales ?? "—")}</dd></div>
              </dl>
            </div>
          </div>
        </div>

        <div class="detail-section" style="margin-top:24px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <h4>Archivos</h4>
            <label class="btn btn-ghost btn-sm admin-only" style="cursor:pointer">
              + Subir archivo
              <input type="file" multiple style="display:none" onchange="subirArchivos(${p.id}, this)">
            </label>
          </div>
          <div id="archivos-list">Cargando archivos...</div>
        </div>

        <div class="detail-section" style="margin-top:24px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <h4>Documentos</h4>
            <button class="btn btn-ghost btn-sm admin-only" onclick="openAsociarDocModal(${p.id})">+ Asociar documento</button>
          </div>
          <div id="docs-proyecto-filtros" style="margin-bottom:12px"></div>
          <div id="docs-proyecto-list">Cargando documentos...</div>
        </div>
      `;

      cargarArchivos(id);
      cargarDocsProyecto(id);
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>${escHtml(err.message)}</p></div>`;
    }
  },

  async technologies() {
    requireAdmin();
    cargarTecnologias();

    async function cargarTecnologias() {
      const tbody = document.getElementById("tech-tbody");
      tbody.innerHTML =
        '<tr><td colspan="3" class="loading">Cargando</td></tr>';
      try {
        const res = await Tecnologias.listar();
        App.state.tecnologias = res.datos ?? [];
        tbody.innerHTML = res.datos
          .map(
            (t) => `
          <tr>
            <td><span class="badge badge-tech" style="background:${t.color}22;color:${t.color};border:1px solid ${t.color}44">${escHtml(t.nombre)}</span></td>
            <td><span style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${escHtml(t.color)}</span></td>
            <td><div class="actions-cell">
              <button class="btn btn-ghost btn-sm" onclick="openTechModal(${t.id},'${escHtml(t.nombre)}','${escHtml(t.color)}')">Editar</button>
              <button class="btn btn-danger btn-sm" onclick="deleteTech(${t.id},'${escHtml(t.nombre)}')">Eliminar</button>
            </div></td>
          </tr>`,
          )
          .join("");
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" style="color:var(--red)">${escHtml(err.message)}</td></tr>`;
      }
    }

    window.openTechModal = function (
      id = null,
      nombre = "",
      color = "#6366f1",
    ) {
      document.getElementById("tech-modal-title").textContent = id
        ? "Editar Tecnología"
        : "Nueva Tecnología";
      document.getElementById("tech-form-id").value = id ?? "";
      document.getElementById("tech-form-name").value = nombre;
      document.getElementById("tech-form-color").value = color;
      document.getElementById("tech-modal").classList.add("open");
    };
    document.getElementById("tech-modal-close").onclick = () =>
      document.getElementById("tech-modal").classList.remove("open");

    document.getElementById("tech-form").onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById("tech-form-id").value;
      const datos = {
        nombre: document.getElementById("tech-form-name").value.trim(),
        color: document.getElementById("tech-form-color").value,
      };
      try {
        if (id) await Tecnologias.actualizar(+id, datos);
        else await Tecnologias.crear(datos);
        document.getElementById("tech-modal").classList.remove("open");
        toast(id ? "Tecnología actualizada" : "Tecnología creada", "success");
        cargarTecnologias();
      } catch (err) {
        toast(err.message, "error");
      }
    };

    window.deleteTech = (id, nombre) =>
      confirm(`¿Eliminar tecnología "${nombre}"?`, async () => {
        try {
          await Tecnologias.eliminar(id);
          toast("Tecnología eliminada", "success");
          cargarTecnologias();
        } catch (err) {
          toast(err.message, "error");
        }
      });
  },

  async users() {
    requireAdmin();
    cargarUsuarios();

    async function cargarUsuarios() {
      const tbody = document.getElementById("users-tbody");
      tbody.innerHTML =
        '<tr><td colspan="4" class="loading">Cargando</td></tr>';
      try {
        const res = await Usuarios.listar();
        tbody.innerHTML = res.datos
          .map(
            (u) => `
          <tr>
            <td><div style="font-weight:500">${escHtml(u.nombre)}</div></td>
            <td><span style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">${escHtml(u.correo)}</span></td>
            <td><span class="badge ${u.rol === "admin" ? "badge-status-produccion" : "badge-status-desarrollo"}">${u.rol}</span></td>
            <td><div class="actions-cell">
              <button class="btn btn-ghost btn-sm" onclick="openUserModal(${u.id})">Editar</button>
              <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id},'${escHtml(u.nombre)}')">Eliminar</button>
            </div></td>
          </tr>`,
          )
          .join("");
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:var(--red)">${escHtml(err.message)}</td></tr>`;
      }
    }

    window.openUserModal = function (id = null) {
      document.getElementById("user-modal-title").textContent = id
        ? "Editar Usuario"
        : "Nuevo Usuario";
      document.getElementById("user-form-id").value = id ?? "";
      document.getElementById("user-form").reset();
      if (id) document.getElementById("user-form-id").value = id;
      document.getElementById("user-pass-note").style.display = id
        ? "block"
        : "none";
      document.getElementById("user-modal").classList.add("open");
    };
    document.getElementById("user-modal-close").onclick = () =>
      document.getElementById("user-modal").classList.remove("open");

    document.getElementById("user-form").onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById("user-form-id").value;
      const datos = {
        nombre: document.getElementById("user-form-name").value.trim(),
        correo: document.getElementById("user-form-email").value.trim(),
        contrasena: document.getElementById("user-form-pass").value,
        rol: document.getElementById("user-form-role").value,
      };
      if (!datos.contrasena) delete datos.contrasena;
      try {
        if (id) await Usuarios.actualizar(+id, datos);
        else await Usuarios.crear(datos);
        document.getElementById("user-modal").classList.remove("open");
        toast(id ? "Usuario actualizado" : "Usuario creado", "success");
        cargarUsuarios();
      } catch (err) {
        toast(err.message, "error");
      }
    };

    window.deleteUser = (id, nombre) =>
      confirm(`¿Eliminar usuario "${nombre}"?`, async () => {
        try {
          await Usuarios.eliminar(id);
          toast("Usuario eliminado", "success");
          cargarUsuarios();
        } catch (err) {
          toast(err.message, "error");
        }
      });
  },

  // ================================================================
  // PÁGINA DOCUMENTOS
  // ================================================================
  async docs() {
    const sidebar = document.getElementById("docs-sidebar");
    const content = document.getElementById("docs-content");
    let categoriaActiva = null;
    let busqueda = "";
    let categorias = [];

    async function cargarTodo() {
      try {
        const res = await Docs.listarCategorias();
        categorias = res.datos ?? [];
        renderSidebar();
        renderDocs();
      } catch (err) {
        sidebar.innerHTML = `<p style="color:var(--red);padding:12px;font-size:12px">${escHtml(err.message)}</p>`;
      }
    }

    function renderSidebar() {
      sidebar.innerHTML = `
        <div class="docs-sidebar-header">
          <span class="docs-sidebar-title">Documentos</span>
          <button class="btn btn-primary btn-sm admin-only" onclick="openDocModal()">+ Nuevo</button>
        </div>
        <div style="padding:0 12px 12px">
          <input type="search" class="form-control" placeholder="Buscar…" style="font-size:12px"
            value="${escHtml(busqueda)}" oninput="docsSearch(this.value)">
        </div>
        <nav class="docs-nav">
          <button class="docs-nav-item ${categoriaActiva === null ? "active" : ""}" onclick="docsFiltrar(null)">
            Todos los documentos
          </button>
          ${categorias
            .map(
              (c) => `
            <div class="docs-nav-cat-row">
              <button class="docs-nav-item ${categoriaActiva === c.id ? "active" : ""}" onclick="docsFiltrar(${c.id})">
                <span class="docs-cat-dot" style="background:${c.color}"></span>
                ${escHtml(c.nombre)}
              </button>
              <button class="docs-nav-edit admin-only" onclick="openCatDocModal(${c.id},'${escHtml(c.nombre)}','${escHtml(c.color)}')" title="Editar">✎</button>
              <button class="docs-nav-edit admin-only" style="color:var(--red)" onclick="deleteCatDoc(${c.id},'${escHtml(c.nombre)}')" title="Eliminar">✕</button>
            </div>`,
            )
            .join("")}
        </nav>
        <div class="docs-sidebar-footer">
          <button class="btn btn-ghost btn-sm admin-only" style="width:100%;justify-content:center" onclick="openCatDocModal()">+ Nueva categoría</button>
        </div>
      `;
    }

    async function renderDocs() {
      content.innerHTML = '<div class="loading">Cargando</div>';
      try {
        const params = {};
        if (categoriaActiva !== null) params.categoria_id = categoriaActiva;
        if (busqueda) params.busqueda = busqueda;
        const res = await Docs.listar(params);
        const docs = res.datos ?? [];

        if (!docs.length) {
          content.innerHTML = `<div class="empty-state"><p>No hay documentos${busqueda ? " que coincidan" : ""}.</p></div>`;
          return;
        }

        content.innerHTML = `<div class="docs-list">${docs
          .map(
            (d) => `
          <div class="docs-card">
            <div class="docs-card-icon">${docIcon(d.tipo_mime)}</div>
            <div class="docs-card-body">
              <div class="docs-card-nombre">${escHtml(d.nombre)}</div>
              <div class="docs-card-meta">
                ${d.categoria_nombre ? `<span class="docs-cat-badge" style="background:${d.categoria_color}22;color:${d.categoria_color};border:1px solid ${d.categoria_color}44">${escHtml(d.categoria_nombre)}</span>` : ""}
                <span style="font-size:11px;color:var(--text-muted)">${formatearTamano(d.tamano)}</span>
                ${(d.proyectos ?? []).length ? `<span style="font-size:11px;color:var(--text-muted)">${d.proyectos.map((p) => escHtml(p.nombre)).join(", ")}</span>` : ""}
              </div>
            </div>
            <div class="docs-card-actions">
<button class="btn btn-ghost btn-sm" onclick="previsualizarDoc(${d.id},'${escHtml(d.nombre_original)}','${escHtml(d.tipo_mime)}')">Ver</button>              <a href="${Docs.descargar(d.id)}" target="_blank" class="btn btn-ghost btn-sm">Descargar</a>
              <button class="btn btn-ghost btn-sm admin-only" onclick="openDocModal(${d.id})">Editar</button>
              <button class="btn btn-danger btn-sm admin-only" onclick="deleteDoc(${d.id},'${escHtml(d.nombre)}')">✕</button>
            </div>
          </div>`,
          )
          .join("")}</div>`;
      } catch (err) {
        content.innerHTML = `<div class="empty-state"><p>${escHtml(err.message)}</p></div>`;
      }
    }

    window.docsFiltrar = function (id) {
      categoriaActiva = id;
      renderSidebar();
      renderDocs();
    };
    window.docsSearch = function (v) {
      busqueda = v;
      renderDocs();
    };

    window.openCatDocModal = function (
      id = null,
      nombre = "",
      color = "#6366f1",
    ) {
      document.getElementById("cat-doc-modal-title").textContent = id
        ? "Editar categoría"
        : "Nueva categoría";
      document.getElementById("cdf-id").value = id ?? "";
      document.getElementById("cdf-nombre").value = nombre;
      document.getElementById("cdf-color").value = color;
      document.getElementById("cat-doc-modal").classList.add("open");
    };

    window.deleteCatDoc = (id, nombre) =>
      confirm(`¿Eliminar la categoría "${nombre}"?`, async () => {
        try {
          await Docs.eliminarCategoria(id);
          toast("Categoría eliminada", "success");
          cargarTodo();
        } catch (err) {
          toast(err.message, "error");
        }
      });

    window.deleteDoc = (id, nombre) =>
      confirm(`¿Eliminar el documento "${nombre}"?`, async () => {
        try {
          await Docs.eliminar(id);
          toast("Documento eliminado", "success");
          renderDocs();
        } catch (err) {
          toast(err.message, "error");
        }
      });

    document.getElementById("cat-doc-modal-close").onclick = () =>
      document.getElementById("cat-doc-modal").classList.remove("open");
    document.getElementById("cat-doc-form").onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById("cdf-id").value;
      const datos = {
        nombre: document.getElementById("cdf-nombre").value.trim(),
        color: document.getElementById("cdf-color").value,
      };
      try {
        if (id) await Docs.actualizarCategoria(+id, datos);
        else await Docs.crearCategoria(datos);
        document.getElementById("cat-doc-modal").classList.remove("open");
        toast(id ? "Categoría actualizada" : "Categoría creada", "success");
        cargarTodo();
      } catch (err) {
        toast(err.message, "error");
      }
    };

    await cargarTodo();
  },
};

// ---- Helpers ----
function requireAdmin() {
  if (App.state.usuario?.rol !== "admin") {
    App.navigate("projects");
    toast("Acceso solo para administradores", "error");
  }
}

function changePage(pagina) {
  App.state.filtros.pagina = pagina;
  App.navigate("projects");
}

function docIcon(mime) {
  if (!mime) return "📄";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime === "application/pdf") return "📕";
  if (mime.includes("word")) return "📝";
  if (mime.includes("excel") || mime.includes("spreadsheet")) return "📊";
  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    mime.includes("compressed")
  )
    return "📦";
  if (mime.startsWith("video/")) return "🎬";
  return "📄";
}

// ---- Project Modal ----
window.openProjectModal = async function (id = null) {
  const modal = document.getElementById("project-modal");
  const titleEl = document.getElementById("project-modal-title");
  const form = document.getElementById("project-form");

  titleEl.textContent = id ? "Editar Proyecto" : "Nuevo Proyecto";
  form.reset();
  document.getElementById("project-form-id").value = id ?? "";

  try {
    const [techRes, userRes] = await Promise.all([
      Tecnologias.listar(),
      Usuarios.listar(),
    ]);
    App.state.tecnologias = techRes.datos ?? App.state.tecnologias;
    App.state.usuarios = userRes.datos ?? App.state.usuarios;
  } catch {}

  const picker = document.getElementById("pf-tech-picker");
  picker.innerHTML = App.state.tecnologias
    .map(
      (t) =>
        `<span class="tech-tag" data-id="${t.id}" style="background:${t.color}22;color:${t.color};border:1px solid ${t.color}44">${escHtml(t.nombre)}</span>`,
    )
    .join("");
  picker.querySelectorAll(".tech-tag").forEach((tag) => {
    tag.onclick = () => tag.classList.toggle("selected");
  });

  renderUserPicker([]);

  if (id) {
    try {
      const res = await Proyectos.obtener(id);
      const p = res.datos;
      document.getElementById("pf-name").value = p.nombre ?? "";
      document.getElementById("pf-subtitle").value = p.subtitulo ?? "";
      document.getElementById("pf-description").value = p.descripcion ?? "";
      document.getElementById("pf-status").value = p.estado ?? "desarrollo";
      document.getElementById("pf-ordenador").value = p.ordenador ?? "";
      document.getElementById("pf-location").value = p.ubicacion ?? "";
      document.getElementById("pf-devenv").value = p.entorno_desarrollo ?? "";
      document.getElementById("pf-url").value = p.url ?? "";
      document.getElementById("pf-creds").value =
        p.ubicacion_credenciales ?? "";
      const techsSeleccionadas = (p.tecnologias ?? []).map((t) => t.id);
      picker.querySelectorAll(".tech-tag").forEach((tag) => {
        if (techsSeleccionadas.includes(+tag.dataset.id))
          tag.classList.add("selected");
      });
      renderUserPicker(p.usuarios ?? []);
    } catch (err) {
      toast(err.message, "error");
      return;
    }
  }

  modal.classList.add("open");
};

function renderUserPicker(usuariosAsignados) {
  const container = document.getElementById("pf-user-picker");
  const asignados = usuariosAsignados.map((u) => ({ ...u }));

  function render() {
    const idsAsignados = asignados.map((u) => u.id);
    const disponibles = App.state.usuarios.filter(
      (u) => !idsAsignados.includes(u.id),
    );
    container.innerHTML = `
      <div id="pf-user-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">
        ${asignados
          .map(
            (u) => `
          <div style="display:flex;align-items:center;gap:8px;background:var(--bg-raised);padding:6px 10px;border-radius:var(--radius-sm);border:1px solid var(--border)">
            <span style="flex:1;font-size:13px">${escHtml(u.nombre)}</span>
            <select data-uid="${u.id}" class="form-control" style="width:140px;padding:4px 8px;font-size:12px">
              <option value="propietario" ${u.rol === "propietario" ? "selected" : ""}>Propietario</option>
              <option value="colaborador" ${u.rol === "colaborador" ? "selected" : ""}>Colaborador</option>
            </select>
            <button type="button" onclick="removeProjectUser(${u.id})" class="btn btn-ghost btn-icon" style="padding:4px 6px;font-size:12px">✕</button>
          </div>`,
          )
          .join("")}
      </div>
      ${
        disponibles.length
          ? `<div style="display:flex;gap:8px;align-items:center">
            <select id="pf-user-add-select" class="form-control" style="flex:1">
              <option value="">— Añadir usuario —</option>
              ${disponibles.map((u) => `<option value="${u.id}">${escHtml(u.nombre)}</option>`).join("")}
            </select>
            <button type="button" onclick="addProjectUser()" class="btn btn-ghost btn-sm">+ Añadir</button>
          </div>`
          : '<p style="font-size:12px;color:var(--text-muted)">Todos los usuarios están asignados.</p>'
      }
    `;
    container.querySelectorAll("select[data-uid]").forEach((sel) => {
      sel.onchange = () => {
        const u = asignados.find((x) => x.id === +sel.dataset.uid);
        if (u) u.rol = sel.value;
      };
    });
  }

  window.addProjectUser = function () {
    const sel = document.getElementById("pf-user-add-select");
    const uid = +sel.value;
    if (!uid) return;
    const usuario = App.state.usuarios.find((u) => u.id === uid);
    if (usuario && !asignados.find((u) => u.id === uid)) {
      asignados.push({
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: "colaborador",
      });
      render();
    }
  };

  window.removeProjectUser = function (uid) {
    const idx = asignados.findIndex((u) => u.id === uid);
    if (idx !== -1) {
      asignados.splice(idx, 1);
      render();
    }
  };

  window.getProjectUsers = function () {
    container.querySelectorAll("select[data-uid]").forEach((sel) => {
      const u = asignados.find((x) => x.id === +sel.dataset.uid);
      if (u) u.rol = sel.value;
    });
    return asignados.map((u) => ({ usuario_id: u.id, rol: u.rol }));
  };

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("project-modal-close").onclick = () =>
    document.getElementById("project-modal").classList.remove("open");

  document.getElementById("project-form").onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById("project-form-id").value;
    const techsSeleccionadas = [
      ...document.querySelectorAll("#pf-tech-picker .tech-tag.selected"),
    ].map((t) => +t.dataset.id);
    const datos = {
      nombre: document.getElementById("pf-name").value.trim(),
      subtitulo: document.getElementById("pf-subtitle").value.trim(),
      descripcion: document.getElementById("pf-description").value.trim(),
      estado: document.getElementById("pf-status").value,
      ubicacion: document.getElementById("pf-location").value.trim(),
      ordenador: document.getElementById("pf-ordenador").value.trim(),
      entorno_desarrollo: document.getElementById("pf-devenv").value.trim(),
      url: document.getElementById("pf-url").value.trim(),
      ubicacion_credenciales: document.getElementById("pf-creds").value.trim(),
      tecnologia_ids: techsSeleccionadas,
      proyecto_usuarios: window.getProjectUsers ? window.getProjectUsers() : [],
    };
    try {
      if (id) await Proyectos.actualizar(+id, datos);
      else await Proyectos.crear(datos);
      document.getElementById("project-modal").classList.remove("open");
      toast(id ? "Proyecto actualizado" : "Proyecto creado", "success");
      App.navigate("projects");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  // Modal subir/editar documento
  document.getElementById("doc-modal-close").onclick = () =>
    document.getElementById("doc-modal").classList.remove("open");
  document.getElementById("doc-form").onsubmit = async (e) => {
    e.preventDefault();
    const id          = document.getElementById("df-id").value;
const nombre      = document.getElementById("df-nombre").value.trim();
const descripcion = document.getElementById("df-descripcion").value.trim();
const categoriaId = document.getElementById("df-categoria").value;
const proyectoIds = [
      ...document.querySelectorAll(
        "#df-proyectos-picker .doc-proy-tag.selected",
      ),
    ].map((t) => +t.dataset.id);

    try {
      if (id) {
        const datos = {
          nombre,
          descripcion,
          categoria_id: categoriaId || null,
          proyecto_ids: proyectoIds,
        };
        // Si el editor de contenido está visible, enviar el contenido
        const contenidoWrap = document.getElementById("df-contenido-wrap");
        if (contenidoWrap && contenidoWrap.style.display !== "none") {
          datos.contenido = document.getElementById("df-contenido").value;
        }
        await Docs.actualizar(+id, datos);
        toast("Documento actualizado", "success");
      } else {
        const archivo = document.getElementById("df-archivo").files[0];
        if (!archivo) {
          toast("Selecciona un archivo", "error");
          return;
        }
        const fd = new FormData();
        fd.append("archivo", archivo);
        fd.append("nombre", nombre || archivo.name);
        fd.append("categoria_id", categoriaId);
        fd.append("proyecto_ids", JSON.stringify(proyectoIds));
        await Docs.subir(fd);
        toast("Documento subido", "success");
      }
      document.getElementById("doc-modal").classList.remove("open");
      // Refrescar lista si estamos en docs
      if (document.getElementById("docs-content")) window.docsSearch?.("");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  // Modal asociar doc
  document.getElementById("asociar-doc-modal-close").onclick = () =>
    document.getElementById("asociar-doc-modal").classList.remove("open");
});

window.deleteProject = function (id, nombre, volverAtras = false) {
  confirm(
    `¿Eliminar el proyecto "${nombre}"? Esta acción no se puede deshacer.`,
    async () => {
      try {
        await Proyectos.eliminar(id);
        toast("Proyecto eliminado", "success");
        App.navigate("projects");
      } catch (err) {
        toast(err.message, "error");
      }
    },
  );
};

// ---- Archivos (sistema antiguo) ----
async function cargarArchivos(proyectoId) {
  const el = document.getElementById("archivos-list");
  if (!el) return;
  try {
    const res = await Archivos.listar(proyectoId);
    const archivos = res.datos ?? [];
    if (!archivos.length) {
      el.innerHTML =
        '<p style="font-size:12px;color:var(--text-muted)">No hay archivos adjuntos.</p>';
      return;
    }
    el.innerHTML = archivos
      .map(
        (a) => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-dim)">
        <span style="font-size:13px;flex:1;color:var(--text-primary)">${escHtml(a.nombre_original)}</span>
        <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${formatearTamano(a.tamano)}</span>
        <a href="/catalogo-apps/backend/uploads/${escHtml(a.nombre)}" onclick="event.preventDefault();descargarArchivo('${escHtml(a.nombre)}')" class="btn btn-ghost btn-sm">Descargar</a>
        <button class="btn btn-danger btn-sm admin-only" onclick="eliminarArchivo(${a.id},${proyectoId})">✕</button>
      </div>`,
      )
      .join("");
  } catch {
    el.innerHTML =
      '<p style="font-size:12px;color:var(--red)">Error al cargar archivos.</p>';
  }
}

window.subirArchivos = async function (proyectoId, input) {
  const archivos = [...input.files];
  if (!archivos.length) return;
  for (const archivo of archivos) {
    const formData = new FormData();
    formData.append("archivo", archivo);
    try {
      await Archivos.subir(proyectoId, formData);
      toast(`${archivo.name} subido`, "success");
    } catch (err) {
      toast(`Error: ${err.message}`, "error");
    }
  }
  cargarArchivos(proyectoId);
  input.value = "";
};

window.eliminarArchivo = function (id, proyectoId) {
  confirm("¿Eliminar este archivo?", async () => {
    try {
      await Archivos.eliminar(id);
      toast("Archivo eliminado", "success");
      cargarArchivos(proyectoId);
    } catch (err) {
      toast(err.message, "error");
    }
  });
};

function formatearTamano(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

window.descargarArchivo = function (nombre) {
  window.open(`/catalogo-apps/backend/uploads/${nombre}`, "_blank");
};

// ---- Documentos en proyecto ----
async function cargarDocsProyecto(proyectoId) {
  const el = document.getElementById("docs-proyecto-list");
  const filtrosEl = document.getElementById("docs-proyecto-filtros");
  if (!el) return;

  try {
    const [docsRes, catRes] = await Promise.all([
      Docs.listar({ proyecto_id: proyectoId }),
      Docs.listarCategorias(),
    ]);
    const docs = docsRes.datos ?? [];
    const categorias = catRes.datos ?? [];

    if (categorias.length && filtrosEl) {
      filtrosEl.innerHTML = `
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm active" onclick="filtrarDocsProyecto(this,'')">Todos</button>
          ${categorias
            .map(
              (c) => `
            <button class="btn btn-ghost btn-sm" data-cat="${c.id}" onclick="filtrarDocsProyecto(this,${c.id})"
              style="border-color:${c.color}44;color:${c.color}">
              ${escHtml(c.nombre)}
            </button>`,
            )
            .join("")}
        </div>`;
    }

    window._docsProyecto = docs;
    window._proyectoActual = proyectoId;
    renderDocsProyecto(docs, proyectoId);
  } catch {
    el.innerHTML =
      '<p style="font-size:12px;color:var(--red)">Error al cargar documentos.</p>';
  }
}

function renderDocsProyecto(docs, proyectoId) {
  const el = document.getElementById("docs-proyecto-list");
  if (!el) return;
  if (!docs.length) {
    el.innerHTML =
      '<p style="font-size:12px;color:var(--text-muted)">No hay documentos asociados a este proyecto.</p>';
    return;
  }
  el.innerHTML = docs
    .map(
      (d) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-dim)">
      <span style="font-size:18px">${docIcon(d.tipo_mime)}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:var(--text-primary)">${escHtml(d.nombre)}</div>
        ${d.categoria_nombre ? `<span class="docs-cat-badge" style="background:${d.categoria_color}22;color:${d.categoria_color};border:1px solid ${d.categoria_color}44">${escHtml(d.categoria_nombre)}</span>` : ""}
      </div>
      <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${formatearTamano(d.tamano)}</span>
<button class="btn btn-ghost btn-sm" onclick="previsualizarDoc(${d.id},'${escHtml(d.nombre_original)}','${escHtml(d.tipo_mime)}')">Ver</button>      <a href="${Docs.descargar(d.id)}" target="_blank" class="btn btn-ghost btn-sm">Descargar</a>
      <button class="btn btn-danger btn-sm admin-only" onclick="desasociarDoc(${d.id},${proyectoId})">✕</button>
    </div>`,
    )
    .join("");
}

window.filtrarDocsProyecto = function (btn, categoriaId) {
  document
    .querySelectorAll("#docs-proyecto-filtros button")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const docs = categoriaId
    ? (window._docsProyecto ?? []).filter((d) => d.categoria_id == categoriaId)
    : (window._docsProyecto ?? []);
  renderDocsProyecto(docs, window._proyectoActual);
};

window.desasociarDoc = function (docId, proyectoId) {
  confirm("¿Quitar este documento del proyecto?", async () => {
    try {
      await Docs.desasociar(docId, proyectoId);
      toast("Documento desasociado", "success");
      cargarDocsProyecto(proyectoId);
    } catch (err) {
      toast(err.message, "error");
    }
  });
};

// ---- Modal subir/editar documento ----
window.openDocModal = async function (id = null) {
  document.getElementById("doc-modal-title").textContent = id ? "Editar documento" : "Nuevo documento";
  document.getElementById("df-id").value = id ?? "";
  document.getElementById("doc-form").reset();
  if (id) document.getElementById("df-id").value = id;

  document.getElementById("df-archivo-wrap").style.display    = id ? "none" : "block";
  document.getElementById("df-crear-wrap").style.display      = id ? "none" : "block";
  document.getElementById("df-contenido-wrap").style.display  = "none";

  try {
    const catRes  = await Docs.listarCategorias();
    const cats    = catRes.datos ?? [];
    document.getElementById("df-categoria").innerHTML =
      '<option value="">Sin categoría</option>' +
      cats.map((c) => `<option value="${c.id}">${escHtml(c.nombre)}</option>`).join("");

    const projRes   = await Proyectos.listar();
    const proyectos = projRes.datos ?? [];
    const picker    = document.getElementById("df-proyectos-picker");
    picker.innerHTML = proyectos.map((p) =>
      `<span class="doc-proy-tag" data-id="${p.id}">${escHtml(p.nombre)}</span>`
    ).join("");
    picker.querySelectorAll(".doc-proy-tag").forEach((tag) => { tag.onclick = () => tag.classList.toggle("selected"); });

    if (id) {
      const res = await Docs.listar();
      const doc = (res.datos ?? []).find((d) => d.id === +id);
      if (doc) {
        document.getElementById("df-nombre").value      = doc.nombre;
        document.getElementById("df-descripcion").value = doc.descripcion ?? "";
        document.getElementById("df-categoria").value   = doc.categoria_id ?? "";
        const idsAsoc = (doc.proyectos ?? []).map((p) => p.id);
        picker.querySelectorAll(".doc-proy-tag").forEach((tag) => {
          if (idsAsoc.includes(+tag.dataset.id)) tag.classList.add("selected");
        });

        // Intentar cargar contenido si es editable
        try {
          const contRes = await Docs.obtenerContenido(id);
          if (contRes.exito) {
            document.getElementById("df-contenido-wrap").style.display = "block";
            document.getElementById("df-contenido").value = contRes.datos.contenido;
            document.getElementById("df-extension").value = contRes.datos.extension;
          }
        } catch {} // Si no es editable simplemente no muestra el editor
      }
    }
  } catch (err) { toast(err.message, "error"); return; }

  document.getElementById("doc-modal").classList.add("open");
};

// ---- Modal asociar doc a proyecto ----
window.openAsociarDocModal = async function (proyectoId) {
  const el = document.getElementById("asociar-doc-lista");
  el.innerHTML = '<div class="loading" style="padding:20px">Cargando</div>';
  document.getElementById("asociar-doc-modal").classList.add("open");

  try {
    const [todosRes, asocRes] = await Promise.all([
      Docs.listar(),
      Docs.listar({ proyecto_id: proyectoId }),
    ]);
    const todos = todosRes.datos ?? [];
    const asocIds = (asocRes.datos ?? []).map((d) => d.id);

    if (!todos.length) {
      el.innerHTML =
        '<p style="font-size:12px;color:var(--text-muted);padding:12px">No hay documentos disponibles. Sube documentos primero desde la sección Documentos.</p>';
      return;
    }

    el.innerHTML = todos
      .map((d) => {
        const asoc = asocIds.includes(d.id);
        return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-dim)">
          <span style="font-size:16px">${docIcon(d.tipo_mime)}</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500">${escHtml(d.nombre)}</div>
            ${d.categoria_nombre ? `<span style="font-size:11px;color:${d.categoria_color}">${escHtml(d.categoria_nombre)}</span>` : ""}
          </div>
          <button class="btn btn-sm ${asoc ? "btn-danger" : "btn-primary"}"
            onclick="toggleAsocDoc(${d.id},${proyectoId},${asoc},this)">
            ${asoc ? "Desasociar" : "Asociar"}
          </button>
        </div>`;
      })
      .join("");
  } catch (err) {
    el.innerHTML = `<p style="color:var(--red);font-size:12px;padding:12px">${escHtml(err.message)}</p>`;
  }
};

window.toggleAsocDoc = async function (docId, proyectoId, estaAsociado, btn) {
  try {
    if (estaAsociado) {
      await Docs.desasociar(docId, proyectoId);
      btn.textContent = "Asociar";
      btn.className = "btn btn-sm btn-primary";
      btn.onclick = () => toggleAsocDoc(docId, proyectoId, false, btn);
    } else {
      await Docs.asociar(docId, proyectoId);
      btn.textContent = "Desasociar";
      btn.className = "btn btn-sm btn-danger";
      btn.onclick = () => toggleAsocDoc(docId, proyectoId, true, btn);
    }
    cargarDocsProyecto(proyectoId);
  } catch (err) {
    toast(err.message, "error");
  }
};

// ---- Previsualización de documentos ----
function esVisualizableEnNavegador(mime, nombre = "") {
  if (!mime) return false;
  if (mime.startsWith("image/")) return "imagen";
  if (mime === "application/pdf") return "pdf";
  if (mime === "text/plain") return "texto";
  if (nombre.endsWith(".md") || nombre.endsWith(".markdown")) return "texto";
  if (mime === "text/markdown" || mime === "text/x-markdown") return "texto";
  if (nombre.endsWith(".md") || nombre.endsWith(".markdown")) return "texto";
  if (mime === "text/html") return "texto";
  if (mime === "text/css") return "texto";
  if (mime === "text/javascript" || mime === "application/javascript")
    return "texto";
  if (mime === "application/json") return "texto";
  if (mime === "text/xml" || mime === "application/xml") return "texto";
  // Detectar por extensión si el mime es genérico
  return false;
}

window.previsualizarDoc = async function (id, nombre, mime) {
  const tipo = esVisualizableEnNavegador(mime, nombre);
  const url = Docs.descargar(id);

  const overlay = document.getElementById("preview-modal");
  const titulo = document.getElementById("preview-modal-title");
  const cuerpo = document.getElementById("preview-modal-body");

  titulo.textContent = nombre;
  cuerpo.innerHTML = '<div class="loading">Cargando previsualización</div>';
  overlay.classList.add("open");

  if (tipo === "imagen") {
    cuerpo.innerHTML = `<img src="${url}" style="max-width:100%;max-height:75vh;display:block;margin:0 auto;border-radius:var(--radius)">`;
  } else if (tipo === "pdf") {
    const urlPreview = Docs.previsualizar(id);
    cuerpo.innerHTML = `<iframe src="${urlPreview}" style="width:100%;height:75vh;border:none;border-radius:var(--radius)"></iframe>`;
  } else if (tipo === "texto") {
    try {
      const resp = await fetch(Docs.previsualizar(id), {
        credentials: "same-origin",
      });
      const text = await resp.text();
      const nombreLower = nombre.toLowerCase();
      const esMarkdown =
        nombreLower.endsWith(".md") || nombreLower.endsWith(".markdown");
      console.log("nombre:", nombre);
      console.log("nombreLower:", nombreLower);
      console.log("esMarkdown:", esMarkdown);
      console.log("marked disponible:", typeof marked);
      console.log("texto primeros 100 chars:", text.substring(0, 100));
      if (esMarkdown) {
        cuerpo.innerHTML = `<div class="markdown-preview">${marked.parse(text)}</div>`;
      } else {
        cuerpo.innerHTML = `<pre class="text-preview">${escHtml(text)}</pre>`;
      }
    } catch {
      cuerpo.innerHTML =
        '<p style="color:var(--red)">No se pudo cargar el contenido.</p>';
    }
  } else {
    // No previsualizable, ofrecer descarga
    cuerpo.innerHTML = `
      <div style="text-align:center;padding:40px 24px">
        <div style="font-size:48px;margin-bottom:16px">${docIcon(mime)}</div>
        <p style="color:var(--text-secondary);margin-bottom:20px">Este tipo de archivo no se puede previsualizar.</p>
        <a href="${url}" target="_blank" class="btn btn-primary">Descargar</a>
      </div>`;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const previewClose = document.getElementById("preview-modal-close");
  if (previewClose) {
    previewClose.onclick = () => {
      document.getElementById("preview-modal").classList.remove("open");
      document.getElementById("preview-modal-body").innerHTML = "";
    };
  }
});