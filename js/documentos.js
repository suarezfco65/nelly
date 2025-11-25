// documentos.js - VERSIÓN CON NUEVO FLUJO DE AGREGAR DOCUMENTOS

const documentos = {
  documentosList: [],
  tokenActual: null,
  isModifying: false,
  container: null,
  archivoSubido: null, // Para almacenar la información del archivo subido

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

    if (state.imageErrorHandler) {
      elements.docImage.removeEventListener("error", state.imageErrorHandler);
    }

    if (tipoArchivo === "imagen") {
      elements.docIframe.style.display = "none";
      elements.docImage.style.display = "block";
      elements.docImage.src = encodeURI(rutaCompleta);
      elements.docImage.alt = elemento.textContent.trim();

      state.imageErrorHandler = () => this.manejarErrorImagen(archivo);
      elements.docImage.addEventListener("error", state.imageErrorHandler);

      elements.docImage.onload = function () {
        console.log("Imagen cargada correctamente:", archivo);
      };
    } else {
      elements.docImage.style.display = "none";
      elements.docIframe.style.display = "block";
      elements.docIframe.src = encodeURI(rutaCompleta);
    }

    docModalInstance.show();
  },

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
    `;

    if (this.container) {
      this.container.innerHTML = containerHTML;
    } else {
      console.error("No se encontró el contenedor de documentos");
      return;
    }

    this.inicializarEventosDocumentos();
    document.getElementById("btnModificarDocumentos")?.addEventListener("click", () => {
      this.solicitarTokenModificacion();
    });
  },

  // Renderizar documentos en modo edición
  renderizarFormularioModificacion() {
    this.isModifying = true;
    this.archivoSubido = null;

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
                <button type="button" id="btnVolverDocumentos" class="btn btn-secondary me-2">
                  <i class="bi bi-arrow-left"></i> Volver
                </button>
                <button type="button" id="btnAgregarDocumento" class="btn btn-info">
                  <i class="bi bi-plus-circle"></i> Agregar Documento
                </button>
              </div>
              <button type="submit" id="btnGuardarDocumentos" class="btn btn-success">
                <i class="bi bi-check-circle"></i> Guardar Cambios
              </button>
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
    document.getElementById("btnVolverDocumentos")?.addEventListener("click", () => {
      this.cancelarModificacion();
    });
    document.getElementById("btnAgregarDocumento")?.addEventListener("click", () => {
      this.mostrarFormularioAgregarDocumento();
    });
    
    this.inicializarEventosModificacion();
  },

  // Mostrar formulario para agregar nuevo documento
  mostrarFormularioAgregarDocumento() {
    const modalHTML = `
      <div class="modal fade" id="agregarDocModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Agregar Nuevo Documento</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
              <form id="formAgregarDocumento">
                <div class="mb-3">
                  <label for="nombreDocumento" class="form-label">Nombre del Documento *</label>
                  <input type="text" class="form-control" id="nombreDocumento" 
                         placeholder="Ingrese el nombre del documento" required>
                  <small class="form-text text-muted">Debe tener más de 3 caracteres</small>
                </div>
                
                <div class="mb-3">
                  <label for="archivoDocumento" class="form-label">Archivo</label>
                  <input type="text" class="form-control" id="archivoDocumento" 
                         placeholder="Se completará automáticamente al subir el archivo" disabled>
                </div>
                
                <div class="mb-3">
                  <button type="button" id="btnSubirArchivo" class="btn btn-outline-primary" disabled>
                    <i class="bi bi-upload"></i> Subir Archivo
                  </button>
                  <small class="form-text text-muted d-block">
                    Primero ingrese el nombre del documento para habilitar la subida
                  </small>
                </div>
                
                <div id="feedbackAgregarDoc" class="mt-3"></div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" id="btnConfirmarAgregar" class="btn btn-success" disabled>
                <i class="bi bi-check-circle"></i> Agregar Documento
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Agregar modal al DOM si no existe
    if (!document.getElementById('agregarDocModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    const agregarDocModal = new bootstrap.Modal(document.getElementById('agregarDocModal'));
    
    // Configurar eventos del modal
    this.configurarEventosAgregarDocumento();
    
    agregarDocModal.show();
  },

  // Configurar eventos del formulario de agregar documento
  configurarEventosAgregarDocumento() {
    const nombreInput = document.getElementById('nombreDocumento');
    const archivoInput = document.getElementById('archivoDocumento');
    const btnSubir = document.getElementById('btnSubirArchivo');
    const btnConfirmar = document.getElementById('btnConfirmarAgregar');
    const feedback = document.getElementById('feedbackAgregarDoc');

    // Limpiar estado anterior
    this.archivoSubido = null;
    nombreInput.value = '';
    archivoInput.value = '';
    btnSubir.disabled = true;
    btnConfirmar.disabled = true;

    // Validar nombre en tiempo real
    nombreInput.addEventListener('input', () => {
      const nombreValido = nombreInput.value.trim().length > 3;
      btnSubir.disabled = !nombreValido;
      
      // Si ya se subió un archivo, habilitar el botón de confirmar
      if (nombreValido && this.archivoSubido) {
        btnConfirmar.disabled = false;
      } else {
        btnConfirmar.disabled = true;
      }
    });

    // Evento para subir archivo
    btnSubir.addEventListener('click', () => {
      this.mostrarModalSubidaArchivo();
    });

    // Evento para confirmar agregar documento
    btnConfirmar.addEventListener('click', () => {
      this.agregarDocumentoConfirmado();
    });
  },

  // Mostrar modal para subir archivo
  mostrarModalSubidaArchivo() {
    const modalHTML = `
      <div class="modal fade" id="subirArchivoModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Subir Archivo</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
              <form id="formSubirArchivo">
                <div class="mb-3">
                  <label for="archivoInput" class="form-label">Seleccionar archivo *</label>
                  <input type="file" class="form-control" id="archivoInput" required>
                </div>
                <div class="mb-3">
                  <label for="rutaDestino" class="form-label">Ruta de destino (opcional)</label>
                  <input type="text" class="form-control" id="rutaDestino" 
                         placeholder="subcarpeta (dejar vacío para docs/)">
                  <small class="form-text text-muted">
                    Si se especifica una subcarpeta, el archivo se guardará en: docs/[subcarpeta]/
                  </small>
                </div>
                <div id="feedbackSubirArchivo"></div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btnConfirmarSubida">Subir Archivo</button>
            </div>
          </div>
        </div>
      </div>
    `;

    if (!document.getElementById('subirArchivoModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    const subirArchivoModal = new bootstrap.Modal(document.getElementById('subirArchivoModal'));
    
    // Configurar evento de subida
    document.getElementById('btnConfirmarSubida').onclick = () => {
      this.subirArchivoGitHub();
    };

    // Limpiar formulario al mostrar
    document.getElementById('archivoInput').value = '';
    document.getElementById('rutaDestino').value = '';
    document.getElementById('feedbackSubirArchivo').innerHTML = '';

    subirArchivoModal.show();
  },

  // Subir archivo a GitHub
  async subirArchivoGitHub() {
    const fileInput = document.getElementById('archivoInput');
    const rutaDestino = document.getElementById('rutaDestino').value.trim();
    const feedback = document.getElementById('feedbackSubirArchivo');

    if (!fileInput.files.length) {
      feedback.innerHTML = '<div class="alert alert-warning">Seleccione un archivo</div>';
      return;
    }

    const file = fileInput.files[0];
    const nombreArchivo = file.name;
    
    // Construir ruta completa
    let rutaCompleta = 'docs/';
    if (rutaDestino) {
      rutaCompleta += `${rutaDestino}/`;
    }
    rutaCompleta += nombreArchivo;

    // Ruta relativa para el campo archivo
    let rutaRelativa = '';
    if (rutaDestino) {
      rutaRelativa = `${rutaDestino}/${nombreArchivo}`;
    } else {
      rutaRelativa = nombreArchivo;
    }

    try {
      feedback.innerHTML = '<div class="alert alert-info">Subiendo archivo a GitHub...</div>';

      // Leer archivo como base64
      const base64Content = await this.fileToBase64(file);

      // Subir a GitHub
      await github.guardarArchivo(
        rutaCompleta,
        base64Content.split(',')[1],
        this.tokenActual,
        `Subir archivo: ${rutaRelativa}`
      );

      feedback.innerHTML = '<div class="alert alert-success">Archivo subido exitosamente</div>';
      
      // Guardar información del archivo subido
      this.archivoSubido = {
        nombreArchivo: nombreArchivo,
        rutaRelativa: rutaRelativa
      };

      // Actualizar el formulario principal
      setTimeout(() => {
        bootstrap.Modal.getInstance(document.getElementById('subirArchivoModal')).hide();
        this.actualizarFormularioConArchivoSubido();
      }, 1500);

    } catch (error) {
      console.error('Error subiendo archivo:', error);
      feedback.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  },

  // Actualizar formulario con archivo subido
  actualizarFormularioConArchivoSubido() {
    const archivoInput = document.getElementById('archivoDocumento');
    const btnConfirmar = document.getElementById('btnConfirmarAgregar');
    const nombreInput = document.getElementById('nombreDocumento');

    if (this.archivoSubido) {
      archivoInput.value = this.archivoSubido.rutaRelativa;
      
      // Habilitar botón de confirmar si el nombre es válido
      if (nombreInput.value.trim().length > 3) {
        btnConfirmar.disabled = false;
      }
    }
  },

  // Agregar documento confirmado
  agregarDocumentoConfirmado() {
    const nombreInput = document.getElementById('nombreDocumento');
    const archivoInput = document.getElementById('archivoDocumento');
    const feedback = document.getElementById('feedbackAgregarDoc');

    const nombre = nombreInput.value.trim();
    const archivo = archivoInput.value.trim();

    if (!nombre || nombre.length <= 3) {
      feedback.innerHTML = '<div class="alert alert-warning">El nombre debe tener más de 3 caracteres</div>';
      return;
    }

    if (!archivo) {
      feedback.innerHTML = '<div class="alert alert-warning">Debe subir un archivo primero</div>';
      return;
    }

    // Agregar a la tabla
    this.agregarFilaDocumento(nombre, archivo);

    // Cerrar modal y limpiar
    bootstrap.Modal.getInstance(document.getElementById('agregarDocModal')).hide();
    this.archivoSubido = null;
  },

  // Agregar fila a la tabla de documentos
  agregarFilaDocumento(nombre, archivo) {
    const tableBody = document.getElementById("documentosTableBody");
    const newIndex = tableBody.children.length;

    const newRow = document.createElement("tr");
    newRow.dataset.index = newIndex;
    newRow.classList.add("fila-documento-mod", "bg-light");

    newRow.innerHTML = `
      <td>
        <input type="text" class="form-control form-control-sm input-nombre" 
               value="${nombre}" placeholder="Nombre del documento" required>
      </td>
      <td>
        <input type="text" class="form-control form-control-sm input-archivo" 
               value="${archivo}" placeholder="archivo.ext o subcarpeta/archivo.ext" required>
        <small class="form-text text-muted">Ruta relativa desde docs/</small>
      </td>
      <td class="text-center">
        <span class="badge bg-secondary">${this.obtenerTipoArchivo(archivo).toUpperCase()}</span>
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

  // Convertir archivo a base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  },

  // Eliminar documento (modificada)
  async eliminarDocumento(rowElement) {
    const nombre = rowElement.querySelector('.input-nombre').value;
    const archivo = rowElement.querySelector('.input-archivo').value;
    
    const confirmacion = confirm(`¿Está seguro de eliminar el documento "${nombre}"?\n\nEsta acción eliminará tanto el registro como el archivo físico de GitHub.`);
    
    if (!confirmacion) return;

    try {
      // Mostrar feedback de eliminación
      const feedback = document.getElementById("feedbackDocumentos");
      feedback.innerHTML = `<div class="alert alert-info"><div class="spinner-border spinner-border-sm me-2" role="status"></div> Eliminando documento de GitHub...</div>`;

      // Eliminar archivo físico de GitHub
      await this.eliminarArchivoGitHub(archivo, this.tokenActual);

      // Eliminar la fila de la tabla
      rowElement.remove();

      feedback.innerHTML = `<div class="alert alert-success">Documento eliminado exitosamente</div>`;
      
      // Limpiar feedback después de 3 segundos
      setTimeout(() => {
        feedback.innerHTML = '';
      }, 3000);

    } catch (error) {
      console.error('Error eliminando documento:', error);
      const feedback = document.getElementById("feedbackDocumentos");
      feedback.innerHTML = `<div class="alert alert-danger">Error al eliminar documento: ${error.message}</div>`;
    }
  },

  // Nueva función para eliminar archivo físico de GitHub
  async eliminarArchivoGitHub(rutaArchivo, githubToken) {
    try {
      // Construir la ruta completa en el repositorio
      const rutaCompleta = `docs/${rutaArchivo}`;
      
      // Primero obtener el SHA del archivo actual
      const config = CONFIG.GITHUB;
      const getResponse = await fetch(
        `${config.API_BASE}/contents/${rutaCompleta}`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (!getResponse.ok) {
        // Si el archivo no existe, solo continuamos con la eliminación del registro
        console.warn(`Archivo no encontrado en GitHub: ${rutaCompleta}`);
        return;
      }

      const fileData = await getResponse.json();
      const sha = fileData.sha;

      // Eliminar el archivo de GitHub
      const deleteResponse = await fetch(
        `${config.API_BASE}/contents/${rutaCompleta}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({
            message: `Eliminar archivo: ${rutaArchivo}`,
            sha: sha,
            branch: config.BRANCH,
          }),
        }
      );

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(`Error al eliminar archivo: ${errorData.message}`);
      }

      console.log(`Archivo eliminado de GitHub: ${rutaCompleta}`);
      
    } catch (error) {
      console.error("Error en eliminarArchivoGitHub:", error);
      throw error;
    }
  },

  // Modificar la función de guardado para manejar eliminaciones pendientes
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

      // Guardar la nueva lista en GitHub
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

  // Inicializar eventos en modo modificación
  inicializarEventosModificacion() {
    document.querySelectorAll(".btn-eliminar-documento").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.eliminarDocumento(e.target.closest("tr"));
      });
    });

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

// Modificar la función de guardado para manejar eliminaciones pendientes
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

      // Guardar la nueva lista en GitHub
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
      const contenidoJSON = JSON.stringify(documentos, null, 2);
      const contenidoBase64 = btoa(unescape(encodeURIComponent(contenidoJSON)));

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
  inicializarEventosDocumentos() {
    if (this.container) {
      this.container.querySelectorAll(".doc-item").forEach((item) => {
        item.addEventListener("click", () => this.abrirDocumento(item));
      });
    }
  },

  // Cargar documentos iniciales
  cargarDocumentosIniciales() {
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
    console.log('Pestaña "Documentos" inicializada con nuevo flujo de agregar documentos');
  },
};
