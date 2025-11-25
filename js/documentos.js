// documentos.js - SIMPLIFICADO: GESTIÓN DE DOCUMENTOS DESDE GITHUB (carpeta 'docs')

const documentos = {
  documentosList: [],
  // Mantenemos tokenActual en sessionStorage para recordar si el usuario ya lo proporcionó
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
    // Si ya tenemos un token, lo devolvemos (asumiendo que es válido)
    if (this.tokenActual) {
      return this.tokenActual;
    }

    const token = prompt(promptMessage || "Por favor, ingrese su Token de Acceso Personal (GitHub PAT):");
    if (!token) throw new Error("Operación cancelada: Token no proporcionado.");
    
    // Verificamos si el token es válido
    try {
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
    
    // Limpiar manejador de errores anterior
    if (state.imageErrorHandler) {
      elements.docImage.removeEventListener("error", state.imageErrorHandler);
    }

    const footer = elements.docModal.querySelector(".modal-footer");

    if (tipoArchivo === "imagen") {
      elements.docIframe.style.display = "none";
      elements.docImage.style.display = "block";
      
      // Construir la URL raw para imágenes
      const githubUser = CONFIG.GITHUB.OWNER;
      const githubRepo = CONFIG.GITHUB.REPO;
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

  // 2. Cargar documentos desde la carpeta 'docs' en GitHub - LÓGICA CORREGIDA
  async cargarDocumentosDesdeGithub() {
    this.documentosList = [];
    
    // Mostrar spinner inicial
    this.container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div><p class="mt-2">Cargando documentos...</p></div>`;

    if (!this.tokenActual) {
      // Si no hay token, se muestra el botón para solicitarlo
      this.container.innerHTML = `
        <div class="alert alert-warning text-center">
            <p>Para cargar la lista de documentos, es necesario un Token de Acceso Personal (PAT) de GitHub con permiso <code>contents:read</code>.</p>
            <button class="btn btn-sm btn-info text-white" id="requestTokenBtn">
                <i class="bi bi-key-fill me-1"></i> Ingresar Token y Cargar Documentos
            </button>
        </div>
      `;
      // Adjuntar el evento al botón para iniciar la solicitud de token
      document.getElementById('requestTokenBtn').addEventListener('click', async () => {
          try {
              // Llamar a solicitarToken, con el mensaje adecuado
              const token = await this.solicitarToken("Para visualizar los documentos, ingrese su Token (contents:read):", 'read');
              // Si tiene éxito, recargar la lista
              if (token) await this.cargarDocumentosDesdeGithub();
          } catch (e) {
              // Manejar silenciosamente la cancelación del prompt
          }
      });
      this.renderizarDocumentos([]); // Renderizar solo el botón de subir/agregar
      return;
    }

    try {
        // Si el token existe, se intenta cargar los documentos
        const contenidos = await github.obtenerContenidoDeDirectorio(this.tokenActual, 'docs');
        this.documentosList = contenidos;
        this.renderizarDocumentos(contenidos);
        console.log('Documentos cargados desde GitHub:', contenidos.length);

    } catch (error) {
      console.error('Error cargando documentos desde GitHub:', error);
      // Si el token almacenado falló (expiró o no tiene permiso de lectura)
      this.container.innerHTML = `<div class="alert alert-danger">Error al cargar la lista: ${error.message}.
          <button class="btn btn-sm btn-warning mt-2" id="requestTokenBtn">
              <i class="bi bi-key-fill me-1"></i> Re-ingresar Token
          </button>
      </div>`;
      // Adjuntar el evento para reingresar el token
      document.getElementById('requestTokenBtn').addEventListener('click', async () => {
          try {
              this.tokenActual = null; // Limpiar el token fallido para forzar el prompt
              const token = await this.solicitarToken("El token almacenado falló. Por favor, re-ingrese su Token (contents:read):", 'read');
              if (token) await this.cargarDocumentosDesdeGithub();
          } catch (e) {
              // Manejar silenciosamente la cancelación del prompt
          }
      });
      this.renderizarDocumentos([]); // Mostrar al menos el botón de subir
    }
  },

  // 2. Renderizar la lista de documentos con botones (se mantiene)
  renderizarDocumentos(documentos) {
    // Si hay un mensaje de alerta (advertencia/error), solo limpiamos la lista existente.
    const hasInitialAlert = this.container.querySelector('.alert-warning') || this.container.querySelector('.alert-danger');
    let listContainer = this.container.querySelector('.list-group');
    let addBtnContainer = this.container.querySelector('.btn-primary.w-100');

    // Si ya existe la lista y el botón, los removemos si hay una alerta para evitar duplicados.
    if (hasInitialAlert) {
      if(listContainer) listContainer.remove();
      if(addBtnContainer) addBtnContainer.remove();
    } else {
        this.container.innerHTML = ""; // Limpiar el contenedor si la carga fue normal
    }

    const ul = document.createElement("ul");
    ul.className = "list-group list-group-flush mb-3";

    if (documentos.length === 0 && !hasInitialAlert) {
        ul.innerHTML = '<li class="list-group-item text-muted">No hay documentos en la carpeta "docs".</li>';
    } else if (documentos.length > 0) {
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

    // Insertar la lista después de cualquier alerta/spinner/mensaje, pero antes del botón de subir
    this.container.appendChild(ul);
    
    // 2. Botón para agregar/subir un nuevo documento (al final)
    const addBtn = document.createElement("button");
    addBtn.className = "btn btn-primary w-100 mt-3";
    addBtn.innerHTML = '<i class="bi bi-upload me-2"></i> Subir Nuevo Documento';
    addBtn.onclick = () => this.mostrarModalSubida();
    this.container.appendChild(addBtn);
  },

  // 4. Eliminar un documento
  async eliminarDocumento(doc) {
    if (!confirm(`¿Está seguro que desea eliminar el documento: ${doc.nombre}?`)) {
      return;
    }

    try {
      // Solicitar token específicamente para escritura
      const token = await this.solicitarToken("Para ELIMINAR, ingrese su Token (contents:write):", 'write');
      
      const filePath = doc.archivo;
      const sha = doc.sha; 
      
      if (!sha) {
          throw new Error("El documento no tiene un SHA asociado. No se puede eliminar.");
      }
      
      await github.eliminarArchivoDeGitHub(token, filePath, `Eliminar documento: ${doc.nombre}`, sha);
      
      alert(`Documento ${doc.nombre} eliminado con éxito.`);
      await this.cargarDocumentosDesdeGithub(); // Actualizar lista
      
    } catch (error) {
      console.error("Error al eliminar documento:", error);
      alert("No se pudo eliminar el documento: " + error.message);
    }
  },

  // 5. Mostrar modal para subir documento
  mostrarModalSubida() {
    this.uploadModalInstance.show();
  },

  // 5. Subir el documento
  async subirDocumento(fileName, fileContentBase64) {
    if (!fileName || !fileContentBase64) {
        throw new Error("Faltan datos para la subida.");
    }

    try {
      // Solicitar token específicamente para escritura
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

  // Inicializar pestaña de documentos
  inicializar() {
    this.container = document.getElementById("docsContent");
    const uploadModalElement = document.getElementById("uploadDocModal");

    if (!this.container || !uploadModalElement) {
      console.error("No se encontró el contenedor docsContent o el modal uploadDocModal");
      return;
    }
    
    this.uploadModalInstance = new bootstrap.Modal(uploadModalElement);
    
    // Evento para el botón de subida dentro del modal
    document.getElementById("uploadDocBtn").addEventListener("click", async () => {
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
                fileInput.value = ''; // Limpiar input
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
    
    // Cargar la lista inicial de documentos
    this.cargarDocumentosDesdeGithub();
  },
};
