const transacciones = {
  // Configuración para GitHub con Fine-Grained Token
  GITHUB_CONFIG: {
    OWNER: "suarezfco",
    REPO: "nelly",
    BRANCH: "main",
    FILE_PATH: "json/transacciones.json",
  },

  // Función para cargar transacciones desde JSON
  async cargarTransacciones() {
    try {
      const response = await fetch("json/transacciones.json");
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const datos = await response.json();
      this.mostrarTransacciones(datos.transacciones);
    } catch (error) {
      console.error("Error cargando transacciones:", error);
      this.mostrarError("Error al cargar las transacciones: " + error.message);
    }
  },

  // Función para mostrar transacciones en una tabla
  mostrarTransacciones(transacciones) {
    const ultimasTransacciones = transacciones.slice(0, 10); // Últimas 10 transacciones

    const contenido = `
      <div class="table-responsive">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th class="text-end">Ingreso (Bs)</th>
              <th class="text-end">Egreso (Bs)</th>
              <th class="text-end">Saldo (Bs)</th>
            </tr>
          </thead>
          <tbody>
            ${ultimasTransacciones
              .map(
                (trans) => `
              <tr>
                <td>${this.formatearFecha(trans.fecha)}</td>
                <td>${trans.descripcion}</td>
                <td class="text-end text-success">${
                  trans.ingreso > 0 ? trans.ingreso.toFixed(2) : "-"
                }</td>
                <td class="text-end text-danger">${
                  trans.egreso > 0 ? trans.egreso.toFixed(2) : "-"
                }</td>
                <td class="text-end fw-bold ${
                  trans.saldo >= 0 ? "text-success" : "text-danger"
                }">
                  ${trans.saldo.toFixed(2)}
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="mt-2 text-muted">
        Mostrando las últimas ${ultimasTransacciones.length} transacciones
      </div>
    `;

    document.getElementById("transaccionesContent").innerHTML = contenido;
  },

  // Función para formatear fecha
  formatearFecha(fechaString) {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString("es-ES");
  },

  // Función para mostrar error
  mostrarError(mensaje) {
    document.getElementById("transaccionesContent").innerHTML = `
      <div class="alert alert-danger">
        <strong>Error:</strong> ${mensaje}
      </div>
    `;
  },

  // Función para mostrar/ocultar formulario
  toggleFormulario() {
    const form = document.getElementById("formTransaccion");
    const boton = document.getElementById("mostrarFormTransaccion");

    if (form.style.display === "none") {
      form.style.display = "block";
      boton.textContent = "Ocultar Formulario";
      // Establecer fecha actual por defecto
      document.getElementById("fecha").value = new Date()
        .toISOString()
        .split("T")[0];
    } else {
      form.style.display = "none";
      boton.textContent = "Agregar Nueva Transacción";
      this.limpiarFormulario();
    }
  },

  // Función para limpiar formulario
  limpiarFormulario() {
    document.getElementById("nuevaTransaccionForm").reset();
    document.getElementById("feedbackTransaccion").innerHTML = "";
  },

  // Función para manejar envío del formulario
  async manejarEnvioFormulario(event) {
    event.preventDefault();

    const fecha = document.getElementById("fecha").value;
    const descripcion = document.getElementById("descripcion").value;
    const tipo = document.getElementById("tipo").value;
    const monto = parseFloat(document.getElementById("monto").value);
    const clave = document.getElementById("claveTransaccion").value;

    const feedback = document.getElementById("feedbackTransaccion");

    // Validar clave
    if (clave !== CONFIG.KEY) {
      feedback.innerHTML =
        '<div class="alert alert-danger">Clave incorrecta</div>';
      return;
    }

    // Crear nueva transacción
    const nuevaTransaccion = {
      fecha: fecha,
      descripcion: descripcion,
      ingreso: tipo === "ingreso" ? monto : 0,
      egreso: tipo === "egreso" ? monto : 0,
      saldo: 0, // Se calculará al actualizar el JSON
    };

    try {
      feedback.innerHTML =
        '<div class="alert alert-info">Guardando transacción...</div>';

      // En un entorno real, aquí iría la llamada a la API de GitHub
      // Por ahora, simulamos el guardado y recargamos la página
      await this.guardarEnGitHub(nuevaTransaccion);

      feedback.innerHTML =
        '<div class="alert alert-success">Transacción guardada exitosamente. Recargando...</div>';

      // Recargar después de 2 segundos
      setTimeout(() => {
        this.cargarTransacciones();
        this.toggleFormulario();
      }, 2000);
    } catch (error) {
      console.error("Error guardando transacción:", error);
      feedback.innerHTML = `<div class="alert alert-danger">Error al guardar: ${error.message}</div>`;
    }
  },
  /*
  // Función para simular guardado en GitHub (en producción usarías la API real)
  async simularGuardadoEnGitHub(nuevaTransaccion) {
    // En desarrollo, mostramos un mensaje
    console.log("Simulando guardado en GitHub:", nuevaTransaccion);

    // En producción, aquí implementarías:
    // 1. Obtener el SHA del archivo actual
    // 2. Actualizar el contenido del JSON
    // 3. Hacer commit a través de la API de GitHub

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 1000);
    });
  },
*/
  // Función real para guardar en GitHub con Fine-Grained Token
  async guardarEnGitHub(nuevaTransaccion) {
    const githubToken =
      "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";
    try {
      console.log("Iniciando guardado en GitHub...");

      // 1. Obtener el archivo actual
      const getResponse = await fetch(
        `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/${this.GITHUB_CONFIG.FILE_PATH}`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (!getResponse.ok) {
        const errorData = await getResponse.json();
        throw new Error(
          `Error al obtener archivo: ${getResponse.status} - ${errorData.message}`
        );
      }

      const fileData = await getResponse.json();
      console.log("Archivo actual obtenido:", fileData.sha);

      // 2. Actualizar el contenido
      const contenidoActual = JSON.parse(atob(fileData.content));
      contenidoActual.transacciones.unshift(nuevaTransaccion);

      // Calcular nuevo saldo basado en la transacción anterior
      if (contenidoActual.transacciones.length > 1) {
        const transaccionAnterior = contenidoActual.transacciones[1];
        nuevaTransaccion.saldo =
          tipo === "ingreso"
            ? transaccionAnterior.saldo + monto
            : transaccionAnterior.saldo - monto;
      } else {
        nuevaTransaccion.saldo = tipo === "ingreso" ? monto : -monto;
      }

      // 3. Actualizar el archivo en GitHub
      const updateResponse = await fetch(
        `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/${this.GITHUB_CONFIG.FILE_PATH}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({
            message: `Agregar transacción: ${nuevaTransaccion.descripcion}`,
            content: btoa(JSON.stringify(contenidoActual, null, 2)),
            sha: fileData.sha,
            branch: this.GITHUB_CONFIG.BRANCH,
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(
          `Error al actualizar: ${updateResponse.status} - ${errorData.message}`
        );
      }

      const result = await updateResponse.json();
      console.log("Archivo actualizado exitosamente:", result.commit.html_url);
      return result;
    } catch (error) {
      console.error("Error en guardarEnGitHub:", error);
      throw new Error(`Error al guardar en GitHub: ${error.message}`);
    }
  },

  // Función para inicializar eventos
  inicializarEventos() {
    // Botón para mostrar/ocultar formulario
    document
      .getElementById("mostrarFormTransaccion")
      .addEventListener("click", () => {
        this.toggleFormulario();
      });

    // Botón cancelar
    document
      .getElementById("cancelarTransaccion")
      .addEventListener("click", () => {
        this.toggleFormulario();
      });

    // Formulario de envío
    document
      .getElementById("nuevaTransaccionForm")
      .addEventListener("submit", (e) => {
        this.manejarEnvioFormulario(e);
      });
  },

  // Inicializar pestaña de transacciones
  inicializar() {
    this.inicializarEventos();
    this.cargarTransacciones();
    console.log('Pestaña "Transacciones" inicializada');
  },
};
