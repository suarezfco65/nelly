// documentos.js - VERSIÓN COMPLETA CON CRUD Y SUBIDA DE ARCHIVOS

const documentos = {
  documentosList: [],
  tokenActual: null,
  isModifying: false,
  container: null,

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
    const rutaCompleta = archivo.startsWith('docs/') ? archivo : `docs/${archivo}`;
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
      elements.docImage.src = encodeURI(rutaCompleta);
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
      elements.docIframe.src = encodeURI(rutaCompleta);
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
        Nota: Los archivos se almacenan en la carpeta docs/ y subcarpetas.
      </div>
    `;

    if (this.container) {
      this.container.innerHTML = containerHTML;
    } else {
      console.error("No se encontró el contenedor de documentos");
      return;
    }

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
                     value="${doc.archivo}" placeholder="archivo.ext o subcarpeta/archivo.ext" required>
              <small class="form-text text-muted">Ruta relativa desde docs/</small>
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
                    <th>Archivo (ruta desde docs/)</th>
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
              <div>
                <button type="button" id="btnAddDocumento" class="btn btn-info me-2">
                  <i class="bi bi-plus-circle"></i> Agregar Documento
                </button>
                <button type="button" id="btnSubirArchivo" class="btn btn-primary">
                  <i class="bi bi-upload"></i> Subir Archivo
                </button>
              </div>
            </div>
          </form>
          <div id="feedbackDocumentos" class="mt-3"></div>
        </div>
      </div>
    `;

    if (this.container) {
      this.container.innerHTML = containerHTML;
    }

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
    document.getElementById("btnSubirArchivo")?.addEventListener("click", () => {
      this.mostrarModalSubida();
    });
    
    this.inicializarEventosModificacion();
  },

  // Mostrar modal para subir archivo
  mostrarModalSubida() {
    const modalHTML = `
      <div class="modal fade" id="uploadModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Subir Archivo a GitHub</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
              <form id="uploadForm">
                <div class="mb-3">
                  <label for="archivoInput" class="form-label">Seleccionar archivo</label>
                  <input type="file" class="form-control" id="archivoInput" required>
                </div>
                <div class="mb-3">
                  <label for="rutaDestino" class="form-label">Ruta de destino (desde docs/)</label>
                  <input type="text" class="form-control" id="rutaDestino" 
                         placeholder="subcarpeta/archivo.ext o archivo.ext" required>
                  <small class="form-text text-muted">El archivo se guardará en: docs/[ruta ingresada]</small>
                </div>
                <div id="uploadFeedback"></div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btnSubirConfirmar">Subir Archivo</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Agregar modal al DOM si no existe
    if (!document.getElementById('uploadModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    const uploadModal = new bootstrap.Modal(document.getElementById('uploadModal'));
    
    // Configurar evento de subida
    document.getElementById('btnSubirConfirmar').onclick = () => {
      this.subirArchivoGitHub();
    };

    uploadModal.show();
  },

  // Subir archivo a GitHub
  async subirArchivoGitHub() {
    const fileInput = document.getElementById('archivoInput');
    const rutaDestino = document.getElementById('rutaDestino').value.trim();
    const feedback = document.getElementById('uploadFeedback');

    if (!fileInput.files.length) {
      feedback.innerHTML = '<div class="alert alert-warning">Seleccione un archivo</div>';
      return;
    }

    if (!rutaDestino) {
      feedback.innerHTML = '<div class="alert alert-warning">Ingrese la ruta de destino</div>';
      return;
    }

    const file = fileInput.files[0];
    const rutaCompleta = `docs/${rutaDestino}`;

    try {
      feedback.innerHTML = '<div class="alert alert-info">Subiendo archivo...</div>';

      // Leer archivo como base64
      const base64Content = await this.fileToBase64(file);

      // Subir a GitHub
      await github.guardarArchivo(
        rutaCompleta,
        base64Content.split(',')[1], // Remover el prefijo data:...
        this.tokenActual,
        `Subir archivo: ${rutaDestino}`
      );

      feedback.innerHTML = '<div class="alert alert-success">Archivo subido exitosamente</div>';
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();
        // Agregar el nuevo archivo a la lista
        this.agregarDocumentoDesdeSubida(file.name, rutaDestino);
      }, 2000);

    } catch (error) {
      console.error('Error subiendo archivo:', error);
      feedback.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  },

  // Convertir archivo a base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  },

  // Agregar documento desde subida
  agregarDocumentoDesdeSubida(nombreArchivo, rutaDestino) {
    const tableBody = document.getElementById("documentosTableBody");
    const newIndex = tableBody.children.length;

    const newRow = document.createElement("tr");
    newRow.dataset.index = newIndex;
    newRow.classList.add("fila-documento-mod", "bg-light");

    newRow.innerHTML = `
      <td>
        <input type="text" class="form-control form-control-sm input-nombre" 
               value="${nombreArchivo}" placeholder="Nombre del documento" required>
      </td>
      <td>
        <input type="text" class="form-control form-control-sm input-archivo" 
               value="${rutaDestino}" placeholder="archivo.ext o subcarpeta/archivo.ext" required>
        <small class="form-text text-muted">Ruta relativa desde docs/</small>
      </td>
      <td class="text-center">
        <span class="badge bg-secondary">${this.obtenerTipoArchivo(rutaDestino).toUpperCase()}</span>
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

  // Agregar nuevo documento
  agregarNuevoDocumento() {
    const tableBody = document.getElementById("documentosTableBody");
    const newIndex = tableBody.children.length;

    const newRow = document.createElement("tr");
    newRow.dataset.index = newIndex;
    newRow.classList.add("fila-documento-mod", "bg-light");

    const nuevoDocumento = {
      nombre: "",
      archivo: "",
    };

    newRow.innerHTML = `
      <td>
        <input type="text" class="form-control form-control-sm input-nombre" 
               value="${nuevoDocumento.nombre}" placeholder="Nombre del documento" required>
      </td>
      <td>
        <input type="text" class="form-control form-control-sm input-archivo" 
               value="${nuevoDocumento.archivo}" placeholder="archivo.ext o subcarpeta/archivo.ext" required>
        <small class="form-text text-muted">Ruta relativa desde docs/</small>
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
            archivo: archivo // Solo guardamos la ruta relativa desde docs/
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
      // Convertir documentos a JSON y luego a base64
      const contenidoJSON = JSON.stringify(documentos, null, 2);
      const contenidoBase64 = btoa(unescape(encodeURIComponent(contenidoJSON)));

      // Guardar en el archivo de documentos
      await github.guardarArchivo(
        "json/documentos.json",
        contenidoBase64,
        githubToken,
        "Actualizar lista de documentos"
      );

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

  // Inicializar eventos de documentos (para modo lectura)
  inicializarEventosDocumentos() {
    if (this.container) {
      this.container.querySelectorAll(".doc-item").forEach((item) => {
        item.addEventListener("click", () => this.abrirDocumento(item));
      });
    }
  },

  // Cargar documentos iniciales
  cargarDocumentosIniciales() {
    // Documentos por defecto - ahora con rutas relativas desde docs/
    const documentosIniciales = [
      { nombre: "Mi Conexión Bancaribe - Personas", archivo: "Mi Conexión Bancaribe - Personas .pdf" },
      { nombre: "SENIAT", archivo: "SENIAT.jpeg" },
      { nombre: "RIF PDF", archivo: "rif.pdf" },
      { nombre: "RIF PNG", archivo: "rif.png" },
      { nombre: "Tarjeta Bancaribe Frente", archivo: "tarjeta bancaribe frente.jpeg" },
      { nombre: "Tarjeta Bancaribe Dorso", archivo: "tarjeta bancaribe dorso.jpeg" },
      { nombre: "Index HTML", archivo: "index.html" }
    ];

    this.renderizarDocumentos(documentosIniciales);
  },

  // Inicializar pestaña de documentos
  inicializar() {
    this.container = document.getElementById("docsContent");
    if (!this.container) {
      console.error("No se encontró el contenedor docsContent");
      return;
    }
    
    this.cargarDocumentosIniciales();
    console.log('Pestaña "Documentos" inicializada con gestión CRUD y subida de archivos');
  },
};
