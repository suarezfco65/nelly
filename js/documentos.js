// documentos.js - SIMPLIFICADO: GESTIÓN DE DOCUMENTOS DESDE GITHUB (carpeta 'docs')

const documentos = {
  documentosList: [],
  // Mantenemos tokenActual en sessionStorage
  tokenActual: sessionStorage.getItem("githubToken") || null,
  container: null,
  uploadModalInstance: null,

  /**
   * Helper unificado para solicitar y validar el token para LECTURA o ESCRITURA.
   * @param {string} promptMessage - Mensaje mostrado en el prompt al usuario.
   * @param {string} requiredPermissions - Indicador de permisos ('read' o 'write').
   * @returns {Promise<string>} El token validado.
   */
  async solicitarToken(promptMessage, requiredPermissions = 'read') {
    if (this.tokenActual) {
      return this.tokenActual;
    }

    const token = prompt(promptMessage || "Por favor, ingrese su Token de Acceso Personal (GitHub PAT):");
    if (!token) throw new Error("Operación cancelada: Token no proporcionado.");
    
    try {
        // Asumiendo que github.js está configurado para usar el proxy y verificar el token
        await github.verificarToken(token); 
        this.tokenActual = token;
        sessionStorage.setItem("githubToken", token);
        return token;
    } catch (error) {
        alert(`Token inválido o sin los permisos requeridos (${requiredPermissions}): ` + error.message);
        throw new Error("Token inválido.");
    }
  },

  // Función para determinar el tipo de archivo (se mantiene)
  obtenerTipoArchivo(nombreArchivo) {
    const extension = nombreArchivo.split(".").pop().toLowerCase();
    const extensionesImagen = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "bmp",
      "webp",
    ];
    return extensionesImagen.includes(extension) ? "imagen" : "otro";
  },

  manejarErrorImagen(archivo) {
    console.error("Error al cargar la imagen:", archivo);
    alert(
      "Error al cargar la imagen. Verifique que el archivo exista o tenga permisos de lectura."
    );
  },

  // 3. Función para abrir documento en modal (se mantiene)
  abrirDocumento(elemento) {
    const archivo = elemento.getAttribute("data-file");
    const rutaCompleta = archivo.startsWith("docs/") ? archivo : `docs/${archivo}`;
    const tipoArchivo = this.obtenerTipoArchivo(archivo);

    elements.docModalTitle.textContent = elemento.textContent.trim();
    
    if (state.imageErrorHandler) {
      elements.docImage.removeEventListener("error", state.imageErrorHandler);
    }

    const footer = elements.docModal.querySelector(".modal-footer");

    if (tipoArchivo === "imagen") {
      elements.docIframe.style.display = "none";
      elements.docImage.style.display = "block";
      
      const githubUser = CONFIG.GITHUB.OWNER;
      const githubRepo = CONFIG.GITHUB.REPO;
      // Usar la URL raw para que el navegador pueda  la imagen directamente
      const rawUrl = `https://raw.githubusercontent.com/${githubUser}/${githubRepo}/${CONFIG.GITHUB.BRANCH}/${archivo}`;
      
      elements.docImage.src = encodeURI(rawUrl);
      elements.docImage.alt = elemento.textContent.trim();

      state.imageErrorHandler = () => this.manejarErrorImagen(rutaCompleta);
      elements.docImage.addEventListener("error", state.imageErrorHandler);
      
      if (footer) footer.style.display = 'none';

    } else {
      elements.docImage.style.display = "none";
      elements.docIframe.style.display = "block";
      elements.docIframe.src = encodeURI(rutaCompleta);
      if (footer) footer.style.display = 'block';
    }

    docModalInstance.show();
  },

  // NUEVO: Renderiza el botón de carga inicial o el mensaje de error
  renderizarEstadoInicial() {
    this.container.innerHTML = `
      <div class="alert alert-info text-center p-4" id="docsInitialMessage">
          <p class="mb-3">Los documentos están protegidos y requieren su Token de Acceso Personal (PAT) de GitHub con permiso <code>contents:read</code> para ser listados.</p>
          <button class="btn btn-success" id="mostrarDocsBtn">
              <i class="bi bi-folder-check me-2"></i> Mostrar Documentos
          </button>
      </div>
      <div id="documentosListContainer" class="mt-4">
          </div>
      <div id="documentosAddBtnContainer" class="mt-3">
          </div>
    `;
    
    // Adjuntar evento al nuevo botón "Mostrar Documentos"
    setTimeout(() => {
        const mostrarDocsBtn = document.getElementById('mostrarDocsBtn');
    if (mostrarDocsBtn) {
        mostrarDocsBtn.addEventListener('click', () => this.cargarDocumentosDesdeGithub());
    }    
    // Renderizar el botón de subir
    this.renderizarBotonSubir();
}, 1000);
    
  },
  
  // Función auxiliar para renderizar el botón de subir
  renderizarBotonSubir() {
      const btnContainer = document.getElementById('documentosAddBtnContainer');
      if (!btnContainer) return;
      
      btnContainer.innerHTML = ''; // Limpiar por si acaso
      const addBtn = document.createElement("button");
      addBtn.className = "btn btn-primary w-100";
      addBtn.innerHTML = '<i class="bi bi-upload me-2"></i> Subir Nuevo Documento';
      addBtn.onclick = () => this.mostrarModalSubida();
      btnContainer.appendChild(addBtn);
  },

  // 2. Cargar documentos desde la carpeta 'docs' en GitHub - LÓGICA ACTIVADA POR BOTÓN
  async cargarDocumentosDesdeGithub() {
    const listContainer = document.getElementById('documentosListContainer');
    const initialMessage = document.getElementById('docsInitialMessage');
    if (!listContainer || !initialMessage) return;
    
    // 1. Mostrar estado de carga y solicitar token
    listContainer.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div><p class="mt-2">Solicitando token y cargando documentos...</p></div>`;
    
    try {
        // Solicitar/Verificar el token
        const token = await this.solicitarToken("Para VISUALIZAR los documentos, ingrese su Token (contents:read):", 'read');
        
        // 2. Obtener contenidos
        const contenidos = await github.obtenerContenidoDeDirectorio(token, 'docs');
        this.documentosList = contenidos;
        
        // 3. Renderizar lista y eliminar el mensaje inicial de solicitud
        initialMessage.style.display = 'none'; // Ocultar el mensaje de solicitud de token
        this.renderizarDocumentos(contenidos);
        
        console.log('Documentos cargados desde GitHub:', contenidos.length);

    } catch (error) {
      console.error('Error cargando documentos desde GitHub:', error);
      listContainer.innerHTML = `<div class="alert alert-danger">Error al cargar la lista de documentos: ${error.message}. Intente nuevamente.</div>`;
      // Mostrar nuevamente el botón si hubo un error irrecuperable (ej: token inválido)
      initialMessage.style.display = 'block';
    }
  },

  // 2. Renderizar la lista de documentos con botones (solo la lista dentro del contenedor)
  renderizarDocumentos(documentos) {
    const listContainer = document.getElementById('documentosListContainer');
    listContainer.innerHTML = '';
    
    const ul = document.createElement("ul");
    ul.className = "list-group list-group-flush mb-3";

    if (documentos.length === 0) {
        ul.innerHTML = '<li class="list-group-item text-muted">No hay documentos en la carpeta "docs".</li>';
    } else {
        documentos.forEach((doc) => {
          const li = document.createElement("li");
          li.className = "list-group-item d-flex justify-content-between align-items-center doc-item";

          const nameSpan = document.createElement("span");
          nameSpan.textContent = doc.nombre;
          nameSpan.setAttribute("role", "button");
          nameSpan.setAttribute("data-file", doc.archivo);
          nameSpan.onclick = () => this.abrirDocumento(nameSpan);
          
          li.appendChild(nameSpan);

          // 4. Botón de eliminar
          const deleteBtn = document.createElement("button");
          deleteBtn.className = "btn btn-sm btn-danger";
          deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
          deleteBtn.title = `Eliminar ${doc.nombre}`;
          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.eliminarDocumento(doc);
          };

          li.appendChild(deleteBtn);
          ul.appendChild(li);
        });
    }

    listContainer.appendChild(ul);
  },

  // 4. Eliminar un documento (se mantiene)
  async eliminarDocumento(doc) {
    if (!confirm(`¿Está seguro que desea eliminar el documento: ${doc.nombre}?`)) {
      return;
    }

    try {
      const token = await this.solicitarToken("Para ELIMINAR, ingrese su Token (contents:write):", 'write');
      
      const filePath = doc.archivo;
      const sha = doc.sha; 
      
      if (!sha) {
          throw new Error("El documento no tiene un SHA asociado. No se puede eliminar.");
      }
      
      await github.eliminarArchivoDeGitHub(token, filePath, `Eliminar documento: ${doc.nombre}`, sha);
      
      alert(`Documento ${doc.nombre} eliminado con éxito.`);
      await this.cargarDocumentosDesdeGithub(); 
      
    } catch (error) {
      console.error("Error al eliminar documento:", error);
      alert("No se pudo eliminar el documento: " + error.message);
    }
  },

  // 5. Mostrar modal para subir documento (se mantiene)
  mostrarModalSubida() {
    this.uploadModalInstance.show();
  },

  // 5. Subir el documento (se mantiene)
  async subirDocumento(fileName, fileContentBase64) {
    if (!fileName || !fileContentBase64) {
        throw new Error("Faltan datos para la subida.");
    }

    try {
      const token = await this.solicitarToken("Para SUBIR, ingrese su Token (contents:write):", 'write');
      
      const filePath = `docs/${fileName}`;
      const commitMessage = `Subir nuevo documento: ${fileName}`;
      
      await github.subirArchivoAGitHub(token, filePath, fileContentBase64, commitMessage);
      
      alert(`Documento ${fileName} subido con éxito.`);
      this.uploadModalInstance.hide();
      await this.cargarDocumentosDesdeGithub();
      
    } catch (error) {
      console.error("Error al subir documento:", error);
      alert("No se pudo subir el documento: " + error.message);
    }
  },

  // Inicializar pestaña de documentos (Modificado para solo renderizar el estado inicial)
  inicializar() {
    this.container = document.getElementById("docsContent");
    const uploadModalElement = document.getElementById("uploadDocModal");

    if (!this.container) {
      console.error("No se encontró el contenedor docsContent");
      return;
    }
    
    // 1. Inicialización de MODAL (Mantenido por robustez)
    if (uploadModalElement) {
        this.uploadModalInstance = new bootstrap.Modal(uploadModalElement);
        const uploadDocBtn = document.getElementById("uploadDocBtn");
        
        if (uploadDocBtn) {
            uploadDocBtn.addEventListener("click", async () => {
                const fileInput = document.getElementById("docFileInput");
                if (fileInput.files.length === 0) {
                    alert("Por favor, seleccione un archivo.");
                    return;
                }
                
                const file = fileInput.files[0];
                const fileName = file.name;
                
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64Content = e.target.result.split(',')[1];
                    
                    const uploadBtn = document.getElementById("uploadDocBtn");
                    const originalText = uploadBtn.innerHTML;
                    
                    try {
                        uploadBtn.disabled = true;
                        uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Subiendo...';

                        await this.subirDocumento(fileName, base64Content);
                        fileInput.value = ''; 
                    } catch (error) {
                    } finally {
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = originalText;
                    }
                };
                reader.onerror = (e) => {
                    alert("Error al leer el archivo: " + e.target.error.name);
                };
                reader.readAsDataURL(file);
            });
        }
    } else {
        console.warn("No se encontró el modal de subida de documentos (#uploadDocModal).");
    }
    
    // 2. Mostrar el estado inicial con el botón "Mostrar Documentos"
    this.renderizarEstadoInicial();
  },
};
