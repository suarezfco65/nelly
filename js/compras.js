const compras = {
  // Función para abrir compra en modal
  abrirCompra(elemento) {
    const archivo = elemento.getAttribute("data-file");
    elements.compraIframe.src = encodeURI(archivo);
    elements.compraModalTitle.textContent = elemento.textContent.trim();
    compraModalInstance.show();
  },

  // Inicializar eventos de compras
  inicializarEventos() {
    document.querySelectorAll(".compra-item").forEach((item) => {
      item.addEventListener("click", () => this.abrirCompra(item));
    });
  },

  // Inicializar pestaña de compras
  inicializar() {
    this.inicializarEventos();
    console.log('Pestaña "Compras" inicializada');
  },
};
