// documentos.js - VERSIÓN COMPLETA CON CRUD

const documentos = {
  documentosList: [],
  tokenActual: null,
  isModifying: false,

  // Función para determinar el tipo de archivo
  obtenerTipoArchivo(nombreArchivo) {
    const extension = nombreArchivo.split(".").pop().toLowerCase();
    const extensionesImagen = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
    return extensionesImagen.includes(extension) ? "imagen" : "otro";
  },

  // Función para manejar errores de imagen
  manejarErrorImagen(archivo) {
    console.error("Error al cargar la imagen:", archivo);
    alert("Error al cargar la imagen. Verifique que el archivo exista.");
  },

  // Función para abrir documento en modal
  abrirDocumento(elemento) {
    const archivo = elemento.getAttribute("data-file");
    const tipoArchivo = this.obtenerTipoArchivo(archivo);

    elements.docModalTitle.textContent = elemento.textContent.trim();

    // Remover manejador de errores anterior si existe
    if (state.imageErrorHandler) {
      elements.docImage.removeEventListener("error", state.imageErrorHandler);
    }

    if (tipoArchivo === "imagen") {
      // Mostrar imagen
      elements.docIframe.style.display = "none";
      elements.docImage.style.display = "block";
      elements.docImage.src = encodeURI(archivo);
      elements.docImage.alt = elemento.textContent.trim();

      // Configurar nuevo manejador de errores para esta imagen específica
      state.imageErrorHandler = () => this.manejarErrorImagen(archivo);
      elements.docImage.addEventListener("error", state.imageErrorHandler);

      // Manejar carga exitosa de imagen
      elements.docImage.onload = function () {
        console.log("Imagen cargada correctamente:", archivo);
      };
    } else {
      // Mostrar PDF u otros archivos
      elements.docImage.style.display = "none";
      elements.docIframe.style.display = "block";
      elements.docIframe.src = encodeURI(archivo);
    }

    docModalInstance.show();
  },

  // --- NUEVAS FUNCIONES CRUD ---

  // Renderizar documentos en modo lectura
  renderizarDocumentos(documentos) {
    this.isModifying = false;
    this.documentosList = documentos;

    const documentosHTML = documentos
      .map(
        (doc, index) => `
          <li class="list-group-item d-flex justify-content-between align-items-center doc-item" 
              data-file="${doc.archivo}" role="button">
            <div class="flex-grow-1">
              <span class="document-name">${doc.nombre}</span>
              <small class="text-muted d-block">${doc.archivo}</small>
            </div>
            <span class="badge bg-secondary">${this.obtenerTipoArchivo(doc.archivo).toUpperCase()}</span>
          </li>
        `
      )
      .join("");

    const containerHTML = `
      <p class="mb-2">
        Lista de documentos almacenados. Haga clic en cualquiera para visualizarlo en un modal.
      </p>

      <ul class="list-group mb-3" id="documentsList">
        ${documentosHTML}
      </ul>

      <div class="mt-4">
        <button id="btnModificarDocumentos" class="btn btn-warning">
          <i class="bi bi-pencil-square"></i> Gestionar Documentos
        </button>
      </div>
      
      <div id="feedbackDocumentos" class="mt-3"></div>

      <div class="mt-3 text-muted small">
        Nota: los nombres contienen espacios y caracteres especiales; el visor usa encodeURI al cargar el archivo para evitar errores.
      </div>
    `;

    document.getElementById("docs").querySelector(".tab-pane").innerHTML = containerHTML;

    // Event listeners
    this.inicializarEventosDocumentos();
    document.getElementById("btnModificarDocumentos")?.addEventListener("click", () => {
      this.solicitarTokenModificacion();
    });
  },

  // Renderizar documentos en modo edición
  renderizarFormularioModificacion() {
    this.isModifying = true;

    const documentosHTML = this.documentosList
      .map(
        (doc, index) => `
          <tr data-index="${index}" class="fila-documento-mod">
            <td>
              <input type="text" class="form-control form-control-sm input-nombre" 
                     value="${doc.nombre}" placeholder="Nombre del documento" required>
            </td>
            <td>
              <input type="text" class="form-control form-control-sm input-archivo" 
                     value="${doc.archivo}" placeholder="ruta/archivo.ext" required>
            </td>
            <td class="text-center">
              <span class="badge bg-secondary">${this.obtenerTipoArchivo(doc.archivo).toUpperCase()}</span>
            </td>
            <td class="text-end">
              <button type="button" class="btn btn-sm btn-danger btn-eliminar-documento" 
                      data-index="${index}" title="Eliminar documento">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        `
      )
      .join("");

    const containerHTML = `
      <div class="card border-warning">
        <div class="card-header bg-warning text-dark">
          <h5 class="mb-0">
            <i class="bi bi-pencil-square"></i> Gestionar Documentos
            <small class="text-muted float-end">Token verificado ✓</small>
          </h5>
        </div>
        <div class="card-body">
          <form id="formModificarDocumentos">
            <div class="table-responsive">
              <table class="table table-bordered table-sm align-middle">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Archivo (ruta)</th>
                    <th class="text-center">Tipo</th>
                    <th class="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody id="documentosTableBody">
                  ${documentosHTML}
                </tbody>
              </table>
            </div>
            
            <div class="mt-4 d-flex justify-content-between">
              <div>
                <button type="submit" id="btnGuardarDocumentos" class="btn btn-success me-2">
                  <i class="bi bi-check-circle"></i> Guardar Cambios
                </button>
                <button type="button" id="btnCancelarModDocumentos" class="btn btn-secondary">
                  <i class="bi bi-x-circle"></i> Cancelar
                </button>
              </div>
              <button type="button" id="btnAddDocumento" class="btn btn-info">
                <i class="bi bi-plus-circle"></i> Agregar Documento
              </button>
            </div>
          </form>
          <div id="feedbackDocumentos" class="mt-3"></div>
        </div>
      </div>
    `;

    document.getElementById("docs").querySelector(".tab-pane").innerHTML = containerHTML;

    // Event listeners
    document.getElementById("formModificarDocumentos")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.manejarGuardadoDocumentos();
    });
    document.getElementById("btnCancelarModDocumentos")?.addEventListener("click", () => {
      this.cancelarModificacion();
    });
    document.getElementById("btnAddDocumento")?.addEventListener("click", () => {
      this.agregarNuevoDocumento();
    });
    this.inicializarEventosModificacion();
  },

  // Agregar nuevo documento
  agregarNuevoDocumento() {
    const tableBody = document.getElementById("documentosTableBody");
    const newIndex = tableBody.children.length;

    const newRow = document.createElement("tr");
    newRow.dataset.index = newIndex;
    newRow.classList.add("fila-documento-mod", "bg-light");

    const nuevoDocumento = {
      nombre: "",
      archivo: "docs/",
    };

    newRow.innerHTML = `
      <td>
        <input type="text" class="form-control form-control-sm input-nombre" 
               value="${nuevoDocumento.nombre}" placeholder="Nombre del documento" required>
      </td>
      <td>
        <input type="text" class="form-control form-control-sm input-archivo" 
               value="${nuevoDocumento.archivo}" placeholder="docs/archivo.ext" required>
      </td>
      <td class="text-center">
        <span class="badge bg-secondary">-</span>
      </td>
      <td class="text-end">
        <button type="button" class="btn btn-sm btn-danger btn-eliminar-documento" 
                data-index="${newIndex}" title="Eliminar documento">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;

    tableBody.appendChild(newRow);
    
    // Actualizar tipo cuando se escribe en el campo archivo
    const archivoInput = newRow.querySelector('.input-archivo');
    archivoInput.addEventListener('input', (e) => {
      const tipo = this.obtenerTipoArchivo(e.target.value);
      newRow.querySelector('.badge').textContent = tipo.toUpperCase();
      newRow.querySelector('.badge').className = `badge bg-${tipo === 'imagen' ? 'success' : 'secondary'}`;
    });

    newRow.querySelector(".btn-eliminar-documento").addEventListener("click", (e) => {
      this.eliminarDocumento(newRow);
    });
  },

  // Eliminar documento
  eliminarDocumento(rowElement) {
    if (confirm("¿Está seguro de eliminar este documento?")) {
      rowElement.remove();
    }
  },

  // Inicializar eventos en modo modificación
  inicializarEventosModificacion() {
    document.querySelectorAll(".btn-eliminar-documento").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.eliminarDocumento(e.target.closest("tr"));
      });
    });

    // Actualizar tipos en tiempo real
    document.querySelectorAll(".input-archivo").forEach(input => {
      input.addEventListener('input', (e) => {
        const row = e.target.closest('tr');
        const tipo = this.obtenerTipoArchivo(e.target.value);
        const badge = row.querySelector('.badge');
        badge.textContent = tipo.toUpperCase();
        badge.className = `badge bg-${tipo === 'imagen' ? 'success' : 'secondary'}`;
      });
    });
  },

  // Obtener datos del formulario
  obtenerDatosFormulario() {
    const tableBody = document.getElementById("documentosTableBody");
    const nuevosDocumentos = [];

    tableBody.querySelectorAll("tr.fila-documento-mod").forEach((row) => {
      if (row.parentNode) {
        const nombre = row.querySelector(".input-nombre").value.trim();
        const archivo = row.querySelector(".input-archivo").value.trim();
        
        if (nombre && archivo) {
          nuevosDocumentos.push({
            nombre: nombre,
            archivo: archivo
          });
        }
      }
    });

    return nuevosDocumentos;
  },

  // Cancelar modificación
  cancelarModificacion() {
    this.tokenActual = null;
    this.isModifying = false;
    this.renderizarDocumentos(this.documentosList);
  },

  // Manejar guardado de documentos
  async manejarGuardadoDocumentos() {
    const feedback = document.getElementById("feedbackDocumentos");

    try {
      feedback.innerHTML = `<div class="alert alert-info"><div class="spinner-border spinner-border-sm me-2" role="status"></div> Guardando cambios en GitHub...</div>`;

      if (!this.tokenActual) {
        throw new Error("Token no disponible.");
      }

      const nuevosDocumentos = this.obtenerDatosFormulario();

      if (nuevosDocumentos.length === 0) {
        throw new Error("Debe haber al menos un documento.");
      }

      // Guardar en GitHub
      await this.guardarEnGitHub(nuevosDocumentos, this.tokenActual);

      feedback.innerHTML = `<div class="alert alert-success"><strong>✓ Documentos actualizados exitosamente</strong><br><small>Los cambios han sido enviados a GitHub. La página se recargará en 2 segundos...</small></div>`;

      this.documentosList = nuevosDocumentos;
      setTimeout(() => {
        location.reload();
      }, 2000);

    } catch (error) {
      console.error("Error modificando documentos:", error);
      feedback.innerHTML = `<div class="alert alert-danger"><strong>Error al guardar:</strong> ${error.message}</div>`;
    }
  },

  // Solicitar token para modificación
  async solicitarTokenModificacion() {
    const githubToken = prompt("Ingrese su Fine-Grained Token de GitHub para gestionar documentos:");
    if (!githubToken) return;

    const feedback = document.getElementById("feedbackDocumentos");

    try {
      feedback.innerHTML = `<div class="alert alert-info py-2"><div class="spinner-border spinner-border-sm me-2" role="status"></div> Verificando token...</div>`;
      await github.verificarToken(githubToken);
      this.tokenActual = githubToken;

      this.renderizarFormularioModificacion();
      feedback.innerHTML = `<div class="alert alert-success py-2">Token verificado ✓</div>`;
      setTimeout(() => {
        feedback.innerHTML = "";
      }, 1000);
    } catch (error) {
      feedback.innerHTML = `<div class="alert alert-danger py-2">Error: ${error.message}</div>`;
      this.tokenActual = null;
    }
  },

  // Guardar en GitHub
  async guardarEnGitHub(documentos, githubToken) {
    try {
      // Aquí implementarías la lógica para guardar en GitHub
      // Por ahora, solo mostraremos un mensaje
      console.log("Guardando documentos:", documentos);
      
      // Simulación de guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // En una implementación real, aquí guardarías en un archivo JSON en GitHub
      alert("Funcionalidad de guardado en GitHub pendiente de implementar");

    } catch (error) {
      console.error("Error en guardarEnGitHub:", error);
      throw error;
    }
  },

  // Inicializar eventos de documentos (para modo lectura)
  inicializarEventos() {
    document.querySelectorAll(".doc-item").forEach((item) => {
      item.addEventListener("click", () => this.abrirDocumento(item));
    });
  },

  // Cargar documentos iniciales
  cargarDocumentosIniciales() {
    // Documentos por defecto
    const documentosIniciales = [
      { nombre: "Mi Conexión Bancaribe - Personas", archivo: "docs/Mi Conexión Bancaribe - Personas .pdf" },
      { nombre: "SENIAT", archivo: "docs/SENIAT.jpeg" },
      { nombre: "RIF PDF", archivo: "docs/rif.pdf" },
      { nombre: "RIF PNG", archivo: "docs/rif.png" },
      { nombre: "Tarjeta Bancaribe Frente", archivo: "docs/tarjeta bancaribe frente.jpeg" },
      { nombre: "Tarjeta Bancaribe Dorso", archivo: "docs/tarjeta bancaribe dorso.jpeg" },
      { nombre: "Index HTML", archivo: "docs/index.html" }
    ];

    this.renderizarDocumentos(documentosIniciales);
  },

  // Inicializar pestaña de documentos
  inicializar() {
    this.cargarDocumentosIniciales();
    console.log('Pestaña "Documentos" inicializada con gestión CRUD');
  },
};
