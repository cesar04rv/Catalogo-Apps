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
        </div>
      `;
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
      const ownerSel = document.getElementById("filter-owner");
      ownerSel.innerHTML =
        '<option value="">Todos los responsables</option>' +
        App.state.usuarios
          .map((u) => `<option value="${u.id}">${escHtml(u.nombre)}</option>`)
          .join("");
      const techSel = document.getElementById("filter-tech");
      techSel.innerHTML =
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

      const propietarios = (p.usuarios ?? []).filter(u => u.rol === "propietario");
      const colaboradores = (p.usuarios ?? []).filter(u => u.rol === "colaborador");

      const listaUsuariosHtml = (usuarios) =>
        usuarios.length
          ? usuarios.map(u => `<span style="display:inline-flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="font-family:var(--font-sans)">${escHtml(u.nombre)}</span>
              <span style="font-size:11px;color:var(--text-muted)">${escHtml(u.correo)}</span>
            </span>`).join("<br>")
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
              <p style="font-size:13px;line-height:1.7;color:var(--text-secondary)">${escHtml(p.descripcion ?? "—")}</p>
            </div>
            <div class="detail-section">
              <h4>Responsables</h4>
              <dl>
                <div class="detail-row">
                  <dt>Propietarios</dt>
                  <dd class="plain">${listaUsuariosHtml(propietarios)}</dd>
                </div>
                <div class="detail-row">
                  <dt>Colaboradores</dt>
                  <dd class="plain">${listaUsuariosHtml(colaboradores)}</dd>
                </div>
              </dl>
            </div>
          </div>
          <div>
            <div class="detail-section">
              <h4>Información técnica</h4>
              <dl>
                <div class="detail-row">
                  <dt>Ubicación</dt>
                  <dd>${escHtml(p.ubicacion ?? "—")}</dd>
                </div>
                <div class="detail-row">
                  <dt>Ordenador</dt>
                  <dd>${escHtml(p.ordenador ?? "—")}</dd>
                </div>
                <div class="detail-row">
                  <dt>Entornos de desarrollo</dt>
                  <dd>${escHtml(p.entorno_desarrollo ?? "—")}</dd>
                </div>
                <div class="detail-row">
                  <dt>URL</dt>
                  <dd>${p.url ? `<a href="${escHtml(p.url)}" target="_blank">${escHtml(p.url)}</a>` : "—"}</dd>
                </div>
                <div class="detail-row">
                  <dt>Credenciales</dt>
                  <dd>${escHtml(p.ubicacion_credenciales ?? "—")}</dd>
                </div>
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
      `;

      cargarArchivos(id);

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
            <td>
              <span class="badge badge-tech" style="background:${t.color}22;color:${t.color};border:1px solid ${t.color}44">${escHtml(t.nombre)}</span>
            </td>
            <td><span style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${escHtml(t.color)}</span></td>
            <td>
              <div class="actions-cell">
                <button class="btn btn-ghost btn-sm" onclick="openTechModal(${t.id},'${escHtml(t.nombre)}','${escHtml(t.color)}')">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="deleteTech(${t.id},'${escHtml(t.nombre)}')">Eliminar</button>
              </div>
            </td>
          </tr>
        `,
          )
          .join("");
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" style="color:var(--red)">${escHtml(err.message)}</td></tr>`;
      }
    }

    window.openTechModal = function (id = null, nombre = "", color = "#6366f1") {
      document.getElementById("tech-modal-title").textContent = id ? "Editar Tecnología" : "Nueva Tecnología";
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
            <td>
              <div style="font-weight:500">${escHtml(u.nombre)}</div>
            </td>
            <td>
              <span style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">${escHtml(u.correo)}</span>
            </td>
            <td>
              <span class="badge ${u.rol === "admin" ? "badge-status-produccion" : "badge-status-desarrollo"}">${u.rol}</span>
            </td>
            <td>
              <div class="actions-cell">
                <button class="btn btn-ghost btn-sm" onclick="openUserModal(${u.id})">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id},'${escHtml(u.nombre)}')">Eliminar</button>
              </div>
            </td>
          </tr>
        `,
          )
          .join("");
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:var(--red)">${escHtml(err.message)}</td></tr>`;
      }
    }

    window.openUserModal = function (id = null) {
      document.getElementById("user-modal-title").textContent = id ? "Editar Usuario" : "Nuevo Usuario";
      document.getElementById("user-form-id").value = id ?? "";
      document.getElementById("user-form").reset();
      if (id) document.getElementById("user-form-id").value = id;
      document.getElementById("user-pass-note").style.display = id ? "block" : "none";
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

// ---- Project Modal ----
window.openProjectModal = async function (id = null) {
  const modal = document.getElementById("project-modal");
  const titleEl = document.getElementById("project-modal-title");
  const form = document.getElementById("project-form");

  titleEl.textContent = id ? "Editar Proyecto" : "Nuevo Proyecto";
  form.reset();
  document.getElementById("project-form-id").value = id ?? "";

  // Recargar siempre usuarios y tecnologías para tener la lista actualizada
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
      (t) => `
    <span class="tech-tag" data-id="${t.id}" style="background:${t.color}22;color:${t.color};border:1px solid ${t.color}44">${escHtml(t.nombre)}</span>
  `,
    )
    .join("");
  picker.querySelectorAll(".tech-tag").forEach((tag) => {
    tag.onclick = () => tag.classList.toggle("selected");
  });

  // Picker de usuarios
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
      document.getElementById("pf-creds").value = p.ubicacion_credenciales ?? "";

      // Seleccionar tecnologías
      const techsSeleccionadas = (p.tecnologias ?? []).map((t) => t.id);
      picker.querySelectorAll(".tech-tag").forEach((tag) => {
        if (techsSeleccionadas.includes(+tag.dataset.id))
          tag.classList.add("selected");
      });

      // Cargar usuarios asignados
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
          </div>
        `,
          )
          .join("")}
      </div>
      ${
        disponibles.length
          ? `
        <div style="display:flex;gap:8px;align-items:center">
          <select id="pf-user-add-select" class="form-control" style="flex:1">
            <option value="">— Añadir usuario —</option>
            ${disponibles.map((u) => `<option value="${u.id}">${escHtml(u.nombre)}</option>`).join("")}
          </select>
          <button type="button" onclick="addProjectUser()" class="btn btn-ghost btn-sm">+ Añadir</button>
        </div>
      `
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

// ---- Archivos ----
async function cargarArchivos(proyectoId) {
  const el = document.getElementById("archivos-list");
  if (!el) return;
  try {
    const res = await Archivos.listar(proyectoId);
     console.log(res.datos)
    const archivos = res.datos ?? [];
    if (!archivos.length) {
      el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">No hay archivos adjuntos.</p>';
      return;
    }
    el.innerHTML = archivos.map(a => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-dim)">
        <span style="font-size:13px;flex:1;color:var(--text-primary)">${escHtml(a.nombre_original)}</span>
        <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${formatearTamano(a.tamano)}</span>
        <a href="/catalogo-apps/backend/uploads/${escHtml(a.nombre)}" onclick="event.preventDefault();descargarArchivo('${escHtml(a.nombre)}')" class="btn btn-ghost btn-sm">Descargar</a>        <button class="btn btn-danger btn-sm admin-only" onclick="eliminarArchivo(${a.id},${proyectoId})">✕</button>
      </div>
    `).join('');
  } catch {
    el.innerHTML = '<p style="font-size:12px;color:var(--red)">Error al cargar archivos.</p>';
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

window.descargarArchivo = function(nombre) {
  window.open(`/catalogo-apps/backend/uploads/${nombre}`, '_blank');
};