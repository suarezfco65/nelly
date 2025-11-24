// accesos.js

const accesos = {
  datosAccesos: null,
  container: null,
  isModifying: false,

  // --- Inicialización y Carga ---
  inicializar(datos) {
    this.datosAccesos = datos;
    // Asume que elements es global (definido en app.js)
    this.container = elements.accesosContent;
    this.renderizarAccesos(this.datosAccesos);
  },

  // --- Renderizado (Modo Lectura) ---
renderizarAccesos(accesos) {
  this.isModifying = false;

  const tableRows = accesos
    .map(
      (item, index) => `
            <tr data-index="${index}">
                <td>
                    <a href="${item.url}" target="_blank" title="Abrir ${item.sistema}">${item.sistema} 
                        <i class="bi bi-box-arrow-up-right small"></i>
                    </a>
                </td>
                <td>${item.usuario}</td>
                <td>
                    <span class="masked sensitive" data-value="${item.clave}">••••••••</span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-info btn-ver-detalles" data-index="${index}" title="Ver detalles">
                        <i class="bi bi-eye"></i> Detalles
                    </button>
                </td>
            </tr>
        `
    )
    .join("");

  const tableHTML = `
            <div class="table-responsive">
                <table class="table table-hover table-sm">
                    <thead>
                        <tr>
                            <th>Sistema</th>
                            <th>Usuario</th>
                            <th>Contraseña</th>
                            <th class="text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="accesosTableBody">
                        ${tableRows}
                    </tbody>
                </table>
            </div>
            
            <div class="mt-4">
                <button id="btnModificarAccesos" class="btn btn-warning">
                    <i class="bi bi-pencil-square"></i> Modificar Accesos
                </button>
            </div>
            <div id="feedbackAccesos" class="mt-3"></div>
        `;

  this.container.innerHTML = tableHTML;

  // Agregar event listeners para los botones de detalles
  this.container.querySelectorAll('.btn-ver-detalles').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = e.target.closest('button').getAttribute('data-index');
      this.mostrarModalDetalles(this.datosAccesos[index]);
    });
  });

  document
    .getElementById("btnModificarAccesos")
    ?.addEventListener("click", () => {
      datosBasicos.solicitarTokenModificacion();
    });
},

  // --- Renderizado (Modo Edición) ---
  renderizarFormularioModificacion(accesos) {
    this.datosAccesos = accesos;
    this.isModifying = true;

    const tableRows = accesos
      .map(
        (item, index) => `
            <tr data-index="${index}" class="fila-acceso-mod">
                <td><input type="text" class="form-control form-control-sm input-sistema" value="${item.sistema}" required></td>
                <td><input type="url" class="form-control form-control-sm input-url" value="${item.url}" required></td>
                <td><input type="text" class="form-control form-control-sm input-usuario" value="${item.usuario}" required></td>
                <td><input type="text" class="form-control form-control-sm input-clave" value="${item.clave}" required></td>
                <td><textarea class="form-control form-control-sm input-observaciones">${item.observaciones}</textarea></td>
                <td class="text-end">
                    <button type="button" class="btn btn-sm btn-danger btn-eliminar-acceso" data-index="${index}" title="Eliminar acceso">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `
      )
      .join("");

    const tableHTML = `
            <div class="card border-warning">
                <div class="card-header bg-warning text-dark">
                    <h5 class="mb-0">
                        <i class="bi bi-pencil-square"></i> Modificar Accesos a Sistemas
                        <small class="text-muted float-end">Token verificado ✓</small>
                    </h5>
                </div>
                <div class="card-body">
                    <form id="formModificarAccesos">
                        <div class="table-responsive">
                            <table class="table table-bordered table-sm align-middle">
                                <thead>
                                    <tr>
                                        <th>Sistema</th>
                                        <th>URL</th>
                                        <th>Usuario</th>
                                        <th>Contraseña</th>
                                        <th>Observaciones</th>
                                        <th class="text-end">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="accesosTableBody">
                                    ${tableRows}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="mt-4 d-flex justify-content-between">
                            <div>
                                <button type="submit" id="btnGuardarAccesos" class="btn btn-success me-2">
                                    <i class="bi bi-check-circle"></i> Guardar Cambios
                                </button>
                                <button type="button" id="btnCancelarModAccesos" class="btn btn-secondary">
                                    <i class="bi bi-x-circle"></i> Cancelar
                                </button>
                            </div>
                            <button type="button" id="btnAddAcceso" class="btn btn-info">
                                <i class="bi bi-plus-circle"></i> Agregar Acceso
                            </button>
                        </div>
                    </form>
                    <div id="feedbackAccesos" class="mt-3"></div>
                </div>
            </div>
        `;

    this.container.innerHTML = tableHTML;

    // Inicializar eventos en modo modificación
    document
      .getElementById("formModificarAccesos")
      ?.addEventListener("submit", (e) => {
        e.preventDefault();
        this.manejarGuardadoAccesos();
      });
    document
      .getElementById("btnCancelarModAccesos")
      ?.addEventListener("click", () => this.cancelarModificacion());
    document
      .getElementById("btnAddAcceso")
      ?.addEventListener("click", () => this.agregarNuevoAcceso());
    this.inicializarEventosModificacion();
  },

  // --- Lógica de Modificación Dinámica de Accesos ---
  agregarNuevoAcceso() {
    const tableBody = document.getElementById("accesosTableBody");
    const newIndex = tableBody.children.length;

    const newRow = document.createElement("tr");
    newRow.dataset.index = newIndex;
    newRow.classList.add("fila-acceso-mod", "bg-light");

    const nuevoAcceso = {
      sistema: "",
      url: "https://",
      usuario: "",
      clave: "",
      observaciones: "",
    };

    newRow.innerHTML = `
            <td><input type="text" class="form-control form-control-sm input-sistema" value="${nuevoAcceso.sistema}" required></td>
            <td><input type="url" class="form-control form-control-sm input-url" value="${nuevoAcceso.url}" required></td>
            <td><input type="text" class="form-control form-control-sm input-usuario" value="${nuevoAcceso.usuario}" required></td>
            <td><input type="text" class="form-control form-control-sm input-clave" value="${nuevoAcceso.clave}" required></td>
            <td><textarea class="form-control form-control-sm input-observaciones">${nuevoAcceso.observaciones}</textarea></td>
            <td class="text-end">
                <button type="button" class="btn btn-sm btn-danger btn-eliminar-acceso" data-index="${newIndex}" title="Eliminar acceso">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;

    tableBody.appendChild(newRow);
    newRow
      .querySelector(".btn-eliminar-acceso")
      .addEventListener("click", (e) => this.eliminarAcceso(newRow));
  },

  eliminarAcceso(rowElement) {
    if (confirm("¿Está seguro de eliminar este acceso?")) {
      rowElement.remove();
    }
  },

  inicializarEventosModificacion() {
    this.container.querySelectorAll(".btn-eliminar-acceso").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.eliminarAcceso(e.target.closest("tr"))
      );
    });
  },

  // --- Lógica de Guardado ---
  obtenerDatosFormulario() {
    const tableBody = document.getElementById("accesosTableBody");
    const nuevosAccesos = [];

    tableBody.querySelectorAll("tr.fila-acceso-mod").forEach((row) => {
      // Solo procesar filas que no fueron eliminadas
      if (row.parentNode) {
        nuevosAccesos.push({
          sistema: row.querySelector(".input-sistema").value.trim(),
          url: row.querySelector(".input-url").value.trim(),
          usuario: row.querySelector(".input-usuario").value.trim(),
          clave: row.querySelector(".input-clave").value.trim(),
          observaciones: row.querySelector(".input-observaciones").value.trim(),
        });
      }
    });

    return { accesos: nuevosAccesos };
  },

  cancelarModificacion() {
    // Al cancelar, se pide a datosBasicos que restaure el estado original
    datosBasicos.tokenActual = null;
    datosBasicos.isModifying = false;

    // Volver al modo lectura en ambas pestañas
    datosBasicos.renderizarDatosBasicos(
      datosBasicos.datosCompletos["datos-basicos"]
    );
    this.renderizarAccesos(datosBasicos.datosCompletos.accesos);
  },

  async manejarGuardadoAccesos() {
    const feedback = document.getElementById("feedbackAccesos");

    try {
      feedback.innerHTML = `<div class="alert alert-info"><div class="spinner-border spinner-border-sm me-2" role="status"></div> Guardando cambios en GitHub...</div>`;

      if (!datosBasicos.tokenActual) {
        throw new Error("Token no disponible.");
      }

      // Obtener los accesos modificados de esta pestaña
      const datosModificadosAccesos = this.obtenerDatosFormulario();

      // Construir el objeto completo (combinando los datos básicos)
      const datosFinales = {
        "datos-basicos": datosBasicos.isModifying
          ? datosBasicos.obtenerDatosFormulario()["datos-basicos"]
          : datosBasicos.datosCompletos["datos-basicos"],
        accesos: datosModificadosAccesos.accesos,
      };

      // Delegar el guardado al módulo datosBasicos
      await datosBasicos.guardarEnGitHub(
        datosFinales,
        datosBasicos.tokenActual
      );

      feedback.innerHTML = `<div class="alert alert-success"><strong>✓ Datos actualizados exitosamente</strong><br><small>El cambio ha sido enviado a GitHub. La página se recargará en 2 segundos...</small></div>`;

      // Actualizar datos locales y recargar
      datosBasicos.datosCompletos = datosFinales;
      setTimeout(() => {
        location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error modificando accesos:", error);
      feedback.innerHTML = `<div class="alert alert-danger"><strong>Error al guardar:</strong> ${error.message}<br><small>Verifique la conexión y permisos</small></div>`;
    }
  },
};
