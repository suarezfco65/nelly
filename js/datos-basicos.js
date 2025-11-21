const datosBasicos = {
  // Función para cargar datos básicos desde JSON
  async cargarDatos() {
    try {
      const response = await fetch(CONFIG.JSON_URL);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const datos = await response.json();
      this.mostrarDatos(datos);
    } catch (error) {
      console.error("Error cargando datos:", error);
      elements.datosContent.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error al cargar los datos básicos:</strong> ${error.message}
          <br><small>Verifique que el archivo ${CONFIG.JSON_URL} exista y sea accesible.</small>
        </div>
      `;
    }
  },

  // Función para mostrar los datos en el HTML
  mostrarDatos(datos) {
    const contenido = `
      <p class="mb-1"><strong>Nombre:</strong> ${datos.nombre}</p>
      <p class="mb-3"><strong>Cédula de Identidad:</strong> ${datos.cedula}</p>

      <hr />

      <h5>Acceso a sistema Patria</h5>
      <p><strong>Contraseña:</strong> <span class="masked sensitive" data-value="${
        datos.accesos.patria.contrasena
      }">••••••••</span></p>

      <h5 class="mt-4">Acceso Bancaribe</h5>
      <p><strong>Usuario:</strong> ${datos.accesos.bancaribe.usuario}</p>
      <p><strong>Contraseña:</strong> <span class="masked sensitive" data-value="${
        datos.accesos.bancaribe.contrasena
      }">••••••••</span></p>

      <h5 class="mt-4">Acceso Banco Mercantil</h5>
      <p><strong>Usuario:</strong> ${datos.accesos.mercantil.usuario}</p>
      <p><strong>Contraseña:</strong> <span class="masked sensitive" data-value="${
        datos.accesos.mercantil.contrasena
      }">••••••••</span></p>

      <hr />

      <h5>Preguntas de seguridad (respuestas en minúsculas)</h5>
      <ul>
        ${datos.preguntasSeguridad
          .map(
            (p) => `
          <li>${p.pregunta} <strong class="masked sensitive" data-value="${
              p.respuesta
            }">${"•".repeat(p.respuesta.length)}</strong></li>
        `
          )
          .join("")}
      </ul>
    `;

    elements.datosContent.innerHTML = contenido;
  },

  // Inicializar pestaña de datos básicos
  inicializar() {
    this.cargarDatos();
    console.log('Pestaña "Datos Básicos" inicializada');
  },
};
