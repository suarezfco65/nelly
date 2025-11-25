// documentos.js - SIMPLIFICADO: GESTIÓN DE DOCUMENTOS DESDE GITHUB (carpeta 'docs')

const documentos = {
  documentosList: [],
  // Mantenemos tokenActual en sessionStorage para recordar si el usuario ya lo proporcionó
  tokenActual: sessionStorage.getItem("githubToken") || null,
  container: null,
  uploadModalInstance: null,

  // Helper para 4. y 5. solicitar el token y verificar permisos (Contents: write)
  async solicitarToken() {
    if (this.tokenActual) {
      try {
        await github.verificarToken(this.tokenActual);
        return this.tokenActual;
      } catch (e) {
        console.warn("El token guardado ya no es válido, solicitando uno nuevo.");
        this.tokenActual = null;
        sessionStorage.removeItem("githubToken");
      }
    }

    const token = prompt("Para realizar esta operación (Eliminar/Subir), por favor ingrese su token de acceso (GitHub PAT) con permisos 'Contents: Write':");
    if (!token) throw new Error("Operación cancelada: Token no proporcionado.");
    
    try {
        await github.verificarToken(token);
        this.tokenActual = token;
        sessionStorage.setItem("githubToken", token);
        return token;
    } catch (error) {
        alert("Token inválido o sin permisos: " + error.message);
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

  // 3. Función para abrir documento en modal (se mantiene con ajustes de estructura)
  abrirDocumento(elemento) {
    const archivo = elemento.getAttribute("data-file");
    const rutaCompleta = archivo.startsWith("docs/") ? archivo : `docs/${archivo}`;
    const tipoArchivo = this.obtenerTipoArchivo(archivo);

    elements.docModalTitle.textContent = elemento.textContent.trim();

    // Limpiar manejador de errores anterior
    if (state.imageErrorHandler) {
      elements.docImage.removeEventListener("error", state.imageErrorHandler);
    }

    // El footer del modal se usa en el index.html para una pequeña nota
    const footer = elements.docModal.querySelector(".modal-footer");

    if (tipoArchivo === "imagen") {
      elements.docIframe.style.display = "none";
      elements.docImage.style.display = "block";
      // Las imágenes se cargan de la ruta absoluta del repositorio
      const githubUser = CONFIG.GITHUB.OWNER;
      const githubRepo = CONFIG.GITHUB.REPO;
      const rawUrl = `https://raw.githubusercontent.com/${githubUser}/${githubRepo}/${CONFIG.GITHUB.BRANCH}/${archivo}`;
      
      elements.docImage.src = encodeURI(rawUrl);
      elements.docImage.alt = elemento.textContent.trim();

      state.imageErrorHandler = () => this.manejarErrorImagen(rutaCompleta);
      elements.docImage.addEventListener("error", state.imageErrorHandler);
      
      if (footer) footer.style.display = 'none';

    } else {
      // Para PDF, HTML, etc., usar iframe
      elements.docImage.style.display = "none";
      elements.docIframe.style.display = "block";
      elements.docIframe.src = encodeURI(rutaCompleta); // Para PDFs/HTML usar ruta relativa

      if (footer) footer.style.display = 'block';
    }

    docModalInstance.show();
  },

  // 2. Cargar documentos desde la carpeta 'docs' en GitHub
  async cargarDocumentosDesdeGithub() {
    this.documentosList = [];
    try {
        if (!this.tokenActual) {
            this.container.innerHTML = `<div class="alert alert-info">Para cargar la lista de documentos, es necesario ingresar un token de acceso. Haga clic en **Subir Nuevo Documento** para ingresar su token y refrescar la lista.</div>`;
            this.renderizarDocumentos([]); // Mostrar solo el botón de subir
            return;
        }

        this.container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div><p class="mt-2">Cargando documentos desde GitHub...</p></div>`;
        
        const contenidos = await github.obtenerContenidoDeDirectorio(this.tokenActual, 'docs');
        this.documentosList = contenidos;
        this.renderizarDocumentos(contenidos);
        console.log('Documentos cargados desde GitHub:', contenidos.length);

    } catch (error) {
      console.error('Error cargando documentos desde GitHub:', error);
      this.container.innerHTML = `<div class="alert alert-danger">Error al cargar la lista de documentos: ${error.message}. Por favor, verifique su token o los permisos.</div>`;
      this.renderizarDocumentos([]); // Mostrar al menos el botón de subir
    }
  },

  // 2. Renderizar la lista de documentos con botones
  renderizarDocumentos(documentos) {
    // Si hubo un error en la carga y el mensaje ya se insertó, no limpiar
    if (this.container.querySelector('.alert-info') || this.container.querySelector('.alert-danger')) {
         // Limpiamos solo para re-insertar la lista/botón si es necesario
         const listContainer = this.container.querySelector('.list-group');
         if(listContainer) listContainer.remove();
         const addBtnContainer = this.container.querySelector('.btn-primary.w-100');
         if(addBtnContainer) addBtnContainer.remove();
    } else {
        this.container.innerHTML = ""; // Limpiar el contenedor si la carga fue normal
    }

    const ul = document.createElement("ul");
    ul.className = "list-group list-group-flush mb-3";

    if (documentos.length === 0) {
        ul.innerHTML = '<li class="list-group-item text-muted">No hay documentos en la carpeta "docs".</li>';
    } else {
        documentos.forEach((doc) => {
          const li = document.createElement("li");
          li.className = "list-group-item d-flex justify-content-between align-items-center doc-item";

          // Nombre del documento (clickable para visualizar)
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
            e.stopPropagation(); // Evitar que se abra el modal de visualización
            this.eliminarDocumento(doc);
          };

          li.appendChild(deleteBtn);
          ul.appendChild(li);
        });
    }

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
      const token = await this.solicitarToken();
      
      const filePath = doc.archivo; // ej: 'docs/file.ext'
      const sha = doc.sha; // Se obtuvo de github.obtenerContenidoDeDirectorio
      
      if (!sha) {
          throw new Error("El documento no tiene un SHA asociado. No se puede eliminar.");
      }
      
      await github.eliminarArchivoDeGitHub(token, filePath, `Eliminar documento: ${doc.nombre}`);
      
      alert(`Documento ${doc.nombre} eliminado con éxito. La lista se actualizará.`);
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
      const token = await this.solicitarToken(); // Se solicita/verifica token
      
      const filePath = `docs/${fileName}`;
      const commitMessage = `Subir nuevo documento: ${fileName}`;
      
      await github.subirArchivoAGitHub(token, filePath, fileContentBase64, commitMessage);
      
      alert(`Documento ${fileName} subido con éxito.`);
      this.uploadModalInstance.hide(); // Cerrar modal al éxito
      await this.cargarDocumentosDesdeGithub(); // Actualizar lista
      
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
    
    // Inicializar instancia del modal de subida
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
        
        // Función para leer el archivo como Base64 (requerido por la API de GitHub)
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Content = e.target.result.split(',')[1];
            
            const uploadBtn = document.getElementById("uploadDocBtn");
            const originalText = uploadBtn.innerHTML;
            
            try {
                // Deshabilitar botón de subida y mostrar mensaje de espera
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Subiendo...';

                await this.subirDocumento(fileName, base64Content);
                fileInput.value = ''; // Limpiar input
            } catch (error) {
                 // El error ya es manejado y muestra un alert en subirDocumento
            } finally {
                // Re-habilitar botón y restablecer texto
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = originalText;
            }
        };
        reader.onerror = (e) => {
            alert("Error al leer el archivo: " + e.target.error.name);
        };
        reader.readAsDataURL(file); // Leer como Data URL para obtener Base64
    });
    
    // Cargar la lista inicial de documentos
    this.cargarDocumentosDesdeGithub();
  },
};
