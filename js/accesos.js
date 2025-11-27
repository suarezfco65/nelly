// accesos.js - VERSIÓN INDEPENDIENTE

const accesos = {
  datosAccesos: [],
  container: null,
  isModifying: false,

  // --- Inicialización y Carga ---
  async inicializar() {
    // Asignar el contenedor del DOM
    this.container = elements.accesosContent;
    await this.cargarDatos();
  },

  async cargarDatos() {
    try {
      const claveAcceso = sessionStorage.getItem("claveAcceso");

      // Si no hay clave, detener (la app redirigirá en otro lado si es necesario)
      if (!claveAcceso) return;

      let datosRecuperados = [];

      // 1. Intentar cargar el NUEVO archivo independiente (CONFIG.PATHS.ACCESOS)
      try {
        // Nota: Asegúrate de haber agregado ACCESOS a CONFIG.PATHS en global-config.js
        // Si no, usa "json/accesos-encriptado.json" directamente como fallback string
        const pathAccesos =
          CONFIG.PATHS.ACCESOS || "json/accesos-encriptado.json";

        const response = await fetch(pathAccesos);

        if (response.ok) {
          const textoEnc = await response.text();
          const jsonDescifrado = await seguridad.desencriptar(
            textoEnc,
            claveAcceso
          );
          datosRecuperados = jsonDescifrado.accesos || [];
          console.log("✅ Accesos cargados desde archivo independiente.");
        } else {
          throw new Error("Archivo independiente no existe aún.");
        }
      } catch (errorNuevo) {
        console.log(
          "⚠️ No se encontró archivo independiente, buscando en legado..."
        );

        // 2. FALLBACK: Intentar rescatar datos del archivo VIEJO (datos-basicos-encriptado.json)
        try {
          const responseOld = await fetch(CONFIG.PATHS.ENCRIPTADO);
          if (responseOld.ok) {
            const textoOld = await responseOld.text();
            const jsonOld = await seguridad.desencriptar(textoOld, claveAcceso);
            if (jsonOld.accesos && Array.isArray(jsonOld.accesos)) {
              datosRecuperados = jsonOld.accesos;
              console.log(
                "✅ Accesos recuperados del archivo antiguo (Migración en proceso)."
              );
            }
          }
        } catch (errorViejo) {
          console.error("❌ No se encontraron accesos en ninguna fuente.");
        }
      }

      this.datosAccesos = datosRecuperados;
      this.renderizarAccesos(this.datosAccesos);
    } catch (error) {
      this.container.innerHTML = `<div class="alert alert-danger">Error cargando accesos: ${error.message}</div>`;
    }
  },

  // --- Modal de Detalles (Sin cambios en lógica visual) ---
  mostrarModalDetalles(acceso) {
    const modalHTML = `
      <div class="modal fade" id="detallesAccesoModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">
                <i class="bi bi-info-circle"></i> Detalles de Acceso - ${
                  acceso.sistema
                }
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-md-6">
                  <h6 class="text-muted">Información Básica</h6>
                  <table class="table table-sm table-borderless">
                    <tr><td><strong>Sistema:</strong></td><td>${
                      acceso.sistema
                    }</td></tr>
                    <tr>
                      <td><strong>URL:</strong></td>
                      <td><a href="${acceso.url}" target="_blank">${
      acceso.url
    } <i class="bi bi-box-arrow-up-right small"></i></a></td>
                    </tr>
                    <tr><td><strong>Usuario:</strong></td><td>${
                      acceso.usuario
                    }</td></tr>
                  </table>
                </div>
                <div class="col-md-6">
                  <h6 class="text-muted">Observaciones</h6>
                  <div class="border rounded p-3 bg-light" style="min-height: 120px; white-space: pre-line;">
                    ${
                      acceso.observaciones ||
                      '<span class="text-muted"><em>Sin observaciones</em></span>'
                    }
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="bi bi-x-circle"></i> Cerrar
              </button>
              <a href="${acceso.url}" target="_blank" class="btn btn-primary">
                <i class="bi bi-box-arrow-up-right"></i> Ir al Sistema
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    const modalExistente = document.getElementById("detallesAccesoModal");
    if (modalExistente) modalExistente.remove();

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    const modal = new bootstrap.Modal(
      document.getElementById("detallesAccesoModal")
    );
    modal.show();
  },

  // --- Renderizado (Modo Lectura) ---
  renderizarAccesos(accesosList) {
    this.isModifying = false;

    if (!accesosList || accesosList.length === 0) {
      this.container.innerHTML = `
        <div class="alert alert-warning">No hay accesos registrados.</div>
        <button id="btnModificarAccesos" class="btn btn-warning mt-2">
            <i class="bi bi-plus-circle"></i> Agregar Primer Acceso
        </button>
        <div id="feedbackAccesos" class="mt-3"></div>
      `;
      document
        .getElementById("btnModificarAccesos")
        ?.addEventListener("click", () => {
          this.solicitarTokenModificacion();
        });
      return;
    }

    const tableRows = accesosList
      .map(
        (item, index) => `
      <tr data-index="${index}">
        <td>
          <a href="${item.url}" target="_blank" title="Abrir ${item.sistema}">${item.sistema} 
            <i class="bi bi-box-arrow-up-right small"></i>
          </a>
        </td>
        <td>${item.usuario}</td>
        <td><span class="masked sensitive">••••••••</span></td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-info btn-ver-detalles" data-index="${index}" title="Ver detalles">
            <i class="bi bi-eye"></i> Detalles
          </button>
        </td>
      </tr>
    `
      )
      .join("");

    this.container.innerHTML = `
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
          <tbody id="accesosTableBody">${tableRows}</tbody>
        </table>
      </div>
      <div class="mt-4">
        <button id="btnModificarAccesos" class="btn btn-warning">
          <i class="bi bi-pencil-square"></i> Modificar Accesos
        </button>
      </div>
      <div id="feedbackAccesos" class="mt-3"></div>
    `;

    // Eventos
    this.container.querySelectorAll(".btn-ver-detalles").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = e.target.closest("button").getAttribute("data-index");
        this.mostrarModalDetalles(this.datosAccesos[index]);
      });
    });

    document
      .getElementById("btnModificarAccesos")
      ?.addEventListener("click", () => {
        this.solicitarTokenModificacion(); // Llama a SU PROPIA función
      });
  },

  // --- Lógica del Token (Independiente) ---
  async solicitarTokenModificacion() {
    const feedback = document.getElementById("feedbackAccesos");
    try {
      feedback.innerHTML = `<div class="alert alert-info py-2"><div class="spinner-border spinner-border-sm me-2"></div> Verificando token...</div>`;

      // Verifica token contra GitHub directamente
      await github.verificarToken();

      // Si pasa, renderiza el formulario de edición
      this.renderizarFormularioModificacion(this.datosAccesos);
    } catch (error) {
      feedback.innerHTML = `<div class="alert alert-danger py-2">Error: ${error.message}</div>`;
    }
  },

  // --- Renderizado (Modo Edición) ---
  renderizarFormularioModificacion(accesosList) {
    this.isModifying = true;
    this.datosAccesos = accesosList;

    const tableRows = accesosList
      .map(
        (item, index) => `
      <tr data-index="${index}" class="fila-acceso-mod">
        <td><input type="text" class="form-control form-control-sm input-sistema" value="${item.sistema}" required></td>
        <td><input type="url" class="form-control form-control-sm input-url" value="${item.url}" required></td>
        <td><input type="text" class="form-control form-control-sm input-usuario" value="${item.usuario}" required></td>
        <td><input type="text" class="form-control form-control-sm input-clave" value="${item.clave}" required></td>
        <td><textarea class="form-control form-control-sm input-observaciones" placeholder="Observaciones...">${item.observaciones}</textarea></td>
        <td class="text-end">
          <button type="button" class="btn btn-sm btn-danger btn-eliminar-acceso" data-index="${index}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `
      )
      .join("");

    this.container.innerHTML = `
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
                <tbody id="accesosTableBody">${tableRows}</tbody>
              </table>
            </div>
            
            <div class="mt-4 d-flex justify-content-between">
              <div>
                <button type="submit" id="btnGuardarAccesos" class="btn btn-success me-2">
                  <i class="bi bi-check-circle"></i> Guardar Accesos
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

    // Eventos Modo Edición
    document
      .getElementById("formModificarAccesos")
      ?.addEventListener("submit", (e) => {
        e.preventDefault();
        this.manejarGuardadoAccesos();
      });

    document
      .getElementById("btnCancelarModAccesos")
      ?.addEventListener("click", () => {
        this.cancelarModificacion();
      });

    document.getElementById("btnAddAcceso")?.addEventListener("click", () => {
      this.agregarNuevoAcceso();
    });

    this.inicializarEventosEliminar();
  },

  // --- Helpers de Edición ---
  agregarNuevoAcceso() {
    const tableBody = document.getElementById("accesosTableBody");
    const newIndex = tableBody.children.length;
    const newRow = document.createElement("tr");
    newRow.dataset.index = newIndex;
    newRow.classList.add("fila-acceso-mod", "bg-light");

    newRow.innerHTML = `
      <td><input type="text" class="form-control form-control-sm input-sistema" value="" required placeholder="Nuevo Sistema"></td>
      <td><input type="url" class="form-control form-control-sm input-url" value="https://" required></td>
      <td><input type="text" class="form-control form-control-sm input-usuario" value="" required></td>
      <td><input type="text" class="form-control form-control-sm input-clave" value="" required></td>
      <td><textarea class="form-control form-control-sm input-observaciones"></textarea></td>
      <td class="text-end">
        <button type="button" class="btn btn-sm btn-danger btn-eliminar-acceso" data-index="${newIndex}">
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
    if (confirm("¿Eliminar este acceso?")) rowElement.remove();
  },

  inicializarEventosEliminar() {
    this.container.querySelectorAll(".btn-eliminar-acceso").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.eliminarAcceso(e.target.closest("tr"))
      );
    });
  },

  cancelarModificacion() {
    // Restaurar solo la vista de accesos, usando la data que ya teníamos en memoria
    this.renderizarAccesos(this.datosAccesos);
  },

  obtenerDatosFormulario() {
    const tableBody = document.getElementById("accesosTableBody");
    const nuevosAccesos = [];

    tableBody.querySelectorAll("tr.fila-acceso-mod").forEach((row) => {
      // Validar que la fila siga existiendo en el DOM
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

    // Retornamos estructura estricta
    return { accesos: nuevosAccesos };
  },

  // --- Guardado Independiente ---
  async manejarGuardadoAccesos() {
    const feedback = document.getElementById("feedbackAccesos");

    try {
      feedback.innerHTML = `<div class="alert alert-info"><div class="spinner-border spinner-border-sm me-2"></div> Guardando accesos independientemente...</div>`;

      // 1. Obtener datos del formulario
      const datosParaGuardar = this.obtenerDatosFormulario();

      // 2. Guardar en su PROPIO archivo
      await this.guardarEnGitHub(datosParaGuardar);

      feedback.innerHTML = `<div class="alert alert-success"><strong>✓ Accesos actualizados</strong><br><small>Recargando...</small></div>`;

      this.datosAccesos = datosParaGuardar.accesos;
      setTimeout(() => location.reload(), 2000);
    } catch (error) {
      console.error("Error guardando accesos:", error);
      feedback.innerHTML = `<div class="alert alert-danger"><strong>Error:</strong> ${error.message}</div>`;
    }
  },

  async guardarEnGitHub(datos) {
    const claveAcceso = sessionStorage.getItem("claveAcceso");
    if (!claveAcceso) throw new Error("Sesión expirada");

    // Encriptar
    const encriptadoStr = await seguridad.encriptar(datos, claveAcceso);
    const base64Content = btoa(encriptadoStr);

    const pathAccesos = CONFIG.PATHS.ACCESOS || "json/accesos-encriptado.json";

    // Intentar obtener SHA para actualizar (o null para crear si es la primera vez que se separa)
    let sha = null;
    try {
      const file = await github._fetchProxy("getFile", pathAccesos, {}, false);
      sha = file.sha;
    } catch (e) {
      console.log(
        "Archivo de accesos independiente no existe, se creará uno nuevo."
      );
    }

    // Guardar
    await github.guardarArchivo(
      pathAccesos,
      base64Content,
      "Actualización de Accesos (Independiente)",
      sha
    );
  },
};
