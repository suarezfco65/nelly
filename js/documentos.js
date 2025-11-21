const documentos = {
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

  // Inicializar eventos de documentos
  inicializarEventos() {
    document.querySelectorAll(".doc-item").forEach((item) => {
      item.addEventListener("click", () => this.abrirDocumento(item));
    });
  },

  // Inicializar pestaña de documentos
  inicializar() {
    this.inicializarEventos();
    console.log('Pestaña "Documentos" inicializada');
  },
};
