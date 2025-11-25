// datos-basicos.js

const datosBasicos = {
  // Datos actuales y estado
  datosCompletos: null, // Toda la data: { "datos-basicos": [...], "accesos": [...] }
  isModifying: false,

  // --- Carga de Datos ---
  async cargarDatos() {
    try {
      const claveAcceso = sessionStorage.getItem("claveAcceso");
      if (!claveAcceso) {
        this.redirigirALogin();
        return;
      }

      let datos;
      try {
        const responseEncriptado = await fetch(CONFIG.DATOS_ENCRYPTED_PATH);
        if (responseEncriptado.ok) {
          const datosEncriptados = await responseEncriptado.text();
          datos = await seguridad.desencriptar(datosEncriptados, claveAcceso);
          // Verificar que la nueva estructura exista (para manejar la migración en caso de un archivo antiguo)
          if (!datos || !datos["datos-basicos"] || !datos.accesos) {
            datos = this.migrarEstructura(datos);
          }
        } else {
          // Cargar la plantilla inicial si no hay encriptado
          const responseInicial = await fetch(CONFIG.JSON_URL);
          if (!responseInicial.ok) {
            throw new Error("No se pudo cargar la plantilla inicial de datos.");
          }
          const datosLegacy = await responseInicial.json();
          datos = this.migrarEstructura(datosLegacy);
        }
      } catch (errorCarga) {
        // En caso de error de desencriptación, intentar cargar datos antiguos para migrar
        if (
          errorCarga.message.includes("Clave incorrecta") ||
          errorCarga.message.includes("desencriptar")
        ) {
          throw errorCarga; // Re-lanzar para que se maneje como clave incorrecta
        }
        const responseInicial = await fetch(CONFIG.JSON_URL);
        if (!responseInicial.ok) {
          throw new Error("No se pudo cargar la plantilla inicial de datos.");
        }
        const datosLegacy = await responseInicial.json();
        datos = this.migrarEstructura(datosLegacy);
      }

      this.datosCompletos = datos;

      // Mostrar datos de la pestaña actual
      this.renderizarDatosBasicos(datos["datos-basicos"]);

      // Inicializar la pestaña de Accesos (asumido global)
      if (typeof accesos !== "undefined" && accesos.inicializar) {
        accesos.inicializar(datos.accesos);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);

      if (
        error.message.includes("Clave incorrecta") ||
        error.message.includes("desencriptar")
      ) {
        this.mostrarError(
          "Clave de acceso incorrecta. Redirigiendo al login..."
        );
        setTimeout(() => {
          this.redirigirALogin();
        }, 2000);
      } else {
        this.mostrarError(
          "Error al cargar los datos básicos: " + error.message
        );
      }
    }
  },

  // --- Migración de Estructura Antigua a Nueva ---
  migrarEstructura(datosLegacy) {
      // Validar datosLegacy
  if (!datosLegacy) {
    datosLegacy = {};
  }
    // Intenta extraer los datos del formato antiguo y convertirlos al nuevo
    const preguntas = datosLegacy.preguntasSeguridad || [];
    const accesosAntiguos = datosLegacy.accesos || {};

    const newStructure = {
      "datos-basicos": [
        {
          campo: "Nombre",
          tipo: "string",
          valor: datosLegacy.nombre || "Nelly Quiroz",
          sensible: false,
        },
        {
          campo: "Cédula de Identidad",
          tipo: "string",
          valor: datosLegacy.cedula || "6251509",
          sensible: false,
        },
        {
          campo: "Dato Extra (Ejemplo)",
          tipo: "string",
          valor: "Campo dinámico de prueba",
          sensible: false,
        },
      ],
      accesos: [
        {
          sistema: "Patria",
          url: "https://www.patria.org.ve/",
          usuario: accesosAntiguos.patria?.usuario || datosLegacy.cedula || "",
          clave: accesosAntiguos.patria?.contrasena || "",
          observaciones: "",
        },
        {
          sistema: "Bancaribe",
          url: "https://www.bancaribe.com.ve/",
          usuario: accesosAntiguos.bancaribe?.usuario || "",
          clave: accesosAntiguos.bancaribe?.contrasena || "",
          observaciones:
            preguntas.length > 0
              ? "Respuestas de Seguridad migradas: " +
                preguntas
                  .map((p) => p.pregunta + ": " + p.respuesta)
                  .join(" / ")
              : "",
        },
        {
          sistema: "Mercantil",
          url: "https://www.mercantilbanco.com/personas",
          usuario: accesosAntiguos.mercantil?.usuario || "",
          clave: accesosAntiguos.mercantil?.contrasena || "",
          observaciones: "",
        },
      ],
    };
    console.log(
      "Datos migrados a la nueva estructura. Las preguntas de seguridad se movieron a Observaciones de Bancaribe."
    );
    return newStructure;
  },

  // --- Redirección y Errores ---
  redirigirALogin() {
    sessionStorage.removeItem("claveAcceso");
    window.location.href = CONFIG.LOGIN_URL;
  },

  mostrarError(mensaje) {
    elements.datosContent.innerHTML = `<div class="alert alert-danger"><strong>Error:</strong> ${mensaje}</div>`;
  },

  // --- Renderizado (Modo Lectura) ---
  renderizarValor(item) {
    let valor = item.valor;
    if (item.sensible && !this.isModifying) {
      // Si es sensible y no estamos modificando, enmascarar
      return `<span class="masked sensitive" data-value="${valor}">${"•".repeat(
        valor.length
      )}</span>`;
    }

    // Mostrar formato correspondiente al tipo
    switch (item.tipo) {
      case "fecha":
        return valor ? new Date(valor).toLocaleDateString() : "N/A";
      case "numero":
        return valor ? parseFloat(valor).toLocaleString() : "0";
      case "boolean":
        return valor === "true" || valor === true
          ? '<span class="badge bg-success">Sí</span>'
          : '<span class="badge bg-danger">No</span>';
      default:
        return valor;
    }
  },

  renderizarDatosBasicos(datos) {
    this.isModifying = false;
    const contenido = datos
      .map(
        (item) => `
      <div class="row mb-2 pb-2 border-bottom">
        <div class="col-sm-4 col-12"><strong>${item.campo} ${
          item.sensible ? "🔑" : ""
        }:</strong></div>
        <div class="col-sm-8 col-12">${this.renderizarValor(item)}</div>
      </div>
    `
      )
      .join("");

    elements.datosContent.innerHTML = `
      <div class="mb-4">
        ${contenido}
      </div>
      <div class="mt-4">
        <button id="btnModificarDatos" class="btn btn-warning">
          <i class="bi bi-pencil-square"></i> Modificar Datos
        </button>
      </div>
      <div id="feedbackModificacionBasicos" class="mt-3"></div>
    `;

    document
      .getElementById("btnModificarDatos")
      ?.addEventListener("click", () => {
        this.solicitarTokenModificacion();
      });
  },

  // --- Renderizado (Modo Edición) ---
  renderizarTipoInput(item) {
    const id = "mod-" + item.campo.replace(/\s/g, "-").replace(/[^\w-]/g, "");
    const baseAttr = `class="form-control form-control-sm" data-campo="${item.campo}" data-tipo="${item.tipo}" data-sensible="${item.sensible}"`;

    switch (item.tipo) {
      case "fecha":
        return `<input type="date" id="${id}" value="${item.valor}" ${baseAttr} required>`;
      case "numero":
        return `<input type="number" id="${id}" value="${item.valor}" ${baseAttr} step="any" required>`;
      case "boolean":
        const checked =
          item.valor === "true" || item.valor === true || item.valor === 1
            ? "checked"
            : "";
        // El valor real debe ser capturado del checked state
        return `<div class="form-check form-switch"><input type="checkbox" id="${id}" ${baseAttr} ${checked} class="form-check-input input-boolean" role="switch"></div>`;
      default: // string
        return `<input type="text" id="${id}" value="${item.valor}" ${baseAttr} required>`;
    }
  },

  renderizarFormularioModificacion() {
    this.isModifying = true; // Activar flag de modificación
    const datos = this.datosCompletos["datos-basicos"];

    const formularioCampos = datos
      .map(
        (item, index) => `
      <div class="row mb-3 align-items-center form-campo-row" data-index="${index}" data-sensible="${
          item.sensible
        }" data-tipo="${item.tipo}">
        <div class="col-4">
            <label class="form-label small text-muted">${item.tipo} ${
          item.sensible ? "🔑" : ""
        }</label>
            <input type="text" class="form-control form-control-sm input-campo-nombre" value="${
              item.campo
            }" required placeholder="Nombre del campo">
        </div>
        <div class="col-6">
            <label for="mod-campo-${index}" class="form-label">Valor</label>
            ${this.renderizarTipoInput(item).replace(
              "required>",
              `id="mod-campo-${index}" required>`
            )}
        </div>
        <div class="col-2 text-end">
            <button type="button" class="btn btn-sm btn-danger btn-eliminar-campo" data-index="${index}" title="Eliminar campo">
                <i class="bi bi-trash"></i>
            </button>
        </div>
      </div>
    `
      )
      .join("");

    const formularioHTML = `
      <div class="card border-warning">
        <div class="card-header bg-warning text-dark">
          <h5 class="mb-0">
            <i class="bi bi-pencil-square"></i> Modificar Datos Básicos
            <small class="text-muted float-end">Token verificado ✓</small>
          </h5>
        </div>
        <div class="card-body">
          <form id="formModificarDatosBasicos">
            <div id="camposDinamicosContainer">
                ${formularioCampos}
            </div>
            
            <div class="mt-4 border-top pt-3">
                <button type="button" id="btnAddCampo" class="btn btn-sm btn-info mb-3">
                    <i class="bi bi-plus-circle"></i> Agregar Nuevo Campo
                </button>
                <div id="addCampoForm" class="p-3 border rounded d-none">
                    <div class="row g-2">
                        <div class="col-md-4">
                            <input type="text" class="form-control form-control-sm" id="newCampoNombre" placeholder="Nombre del nuevo campo">
                        </div>
                        <div class="col-md-3">
                            <select class="form-select form-select-sm" id="newCampoTipo">
                                <option value="string">string</option>
                                <option value="fecha">fecha</option>
                                <option value="numero">número</option>
                                <option value="boolean">boolean</option>
                            </select>
                        </div>
                        <div class="col-md-3 d-flex align-items-center">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" id="newCampoSensible">
                                <label class="form-check-label small" for="newCampoSensible">Sensible</label>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <button type="button" id="btnConfirmAddCampo" class="btn btn-sm btn-primary w-100">Agregar</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="mt-4">
              <button type="submit" class="btn btn-success">
                <i class="bi bi-check-circle"></i> Guardar Cambios
              </button>
              <button type="button" id="btnCancelarModificacionBasicos" class="btn btn-secondary">
                <i class="bi bi-x-circle"></i> Cancelar
              </button>
            </div>
          </form>
          <div id="feedbackModificacionBasicos" class="mt-3"></div>
        </div>
      </div>
    `;

    elements.datosContent.innerHTML = formularioHTML;

    // Inicializar eventos del formulario
    document
      .getElementById("formModificarDatosBasicos")
      .addEventListener("submit", (e) => {
        this.ficacion(e);
      });
    document
      .getElementById("btnCancelarModificacionBasicos")
      .addEventListener("click", () => {
        this.tokenActual = null; // Limpiar token
        this.renderizarDatosBasicos(this.datosCompletos["datos-basicos"]); // Volver al modo lectura
        // Asegurar que accesos.js también se restaure
        if (typeof accesos !== "undefined" && accesos.renderizarAccesos) {
          accesos.renderizarAccesos(this.datosCompletos.accesos);
        }
      });
    document.getElementById("btnAddCampo").addEventListener("click", (e) => {
      e.target.style.display = "none";
      document.getElementById("addCampoForm").classList.remove("d-none");
    });
    document
      .getElementById("btnConfirmAddCampo")
      .addEventListener("click", () => this.agregarNuevoCampo());

    elements.datosContent
      .querySelectorAll(".btn-eliminar-campo")
      .forEach((btn) => {
        btn.addEventListener("click", (e) =>
          this.eliminarCampo(e.target.closest(".form-campo-row"))
        );
      });
  },

  // --- Lógica del Token ---
  async solicitarTokenModificacion() {
    const feedback = document.getElementById("feedbackModificacionBasicos");

    try {
      feedback.innerHTML = `<div class="alert alert-info py-2"><div class="spinner-border spinner-border-sm me-2" role="status"></div> Verificando token...</div>`;
      
      await github.verificarToken();

      // Activar modo modificación en ambas pestañas
      this.renderizarFormularioModificacion();
      if (
        typeof accesos !== "undefined" &&
        accesos.renderizarFormularioModificacion
      ) {
        accesos.renderizarFormularioModificacion(this.datosCompletos.accesos);
      }

      feedback.innerHTML = `<div class="alert alert-success py-2">Token verificado ✓</div>`;
      setTimeout(() => {
        feedback.innerHTML = "";
      }, 1000);
    } catch (error) {
      feedback.innerHTML = `<div class="alert alert-danger py-2">Error: ${error.message}</div>`;
    }
  },

  // --- Lógica de Modificación Dinámica de Campos Básicos ---
  agregarNuevoCampo() {
    const container = document.getElementById("camposDinamicosContainer");
    const nombreInput = document.getElementById("newCampoNombre");
    const tipoInput = document.getElementById("newCampoTipo");
    const sensibleInput = document.getElementById("newCampoSensible");

    const nombre = nombreInput.value.trim();
    const tipo = tipoInput.value;
    const sensible = sensibleInput.checked;

    if (!nombre) {
      alert("El nombre del campo no puede estar vacío.");
      return;
    }

    const newItem = {
      campo: nombre,
      tipo: tipo,
      valor: "",
      sensible: sensible,
    };
    const newIndex = container.children.length; // Usar el largo actual como índice temporal

    const newRow = document.createElement("div");
    newRow.classList.add(
      "row",
      "mb-3",
      "align-items-center",
      "form-campo-row",
      "bg-light",
      "p-2",
      "rounded"
    );
    newRow.dataset.index = newIndex;
    newRow.dataset.sensible = sensible;
    newRow.dataset.tipo = tipo; // Guardar el tipo en la fila para el guardado

    newRow.innerHTML = `
        <div class="col-4">
            <label class="form-label small text-muted">${newItem.tipo} ${
      newItem.sensible ? "🔑" : ""
    }</label>
            <input type="text" class="form-control form-control-sm input-campo-nombre" value="${
              newItem.campo
            }" required placeholder="Nombre del campo">
        </div>
        <div class="col-6">
            <label for="mod-campo-${newIndex}" class="form-label">Valor</label>
            ${this.renderizarTipoInput(newItem).replace(
              "required>",
              `id="mod-campo-${newIndex}" required>`
            )}
        </div>
        <div class="col-2 text-end">
            <button type="button" class="btn btn-sm btn-danger btn-eliminar-campo" data-index="${newIndex}" title="Eliminar campo">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;

    container.appendChild(newRow);
    nombreInput.value = "";
    tipoInput.value = "string";
    sensibleInput.checked = false;
    document.getElementById("addCampoForm").classList.add("d-none");
    document.getElementById("btnAddCampo").style.display = "inline-block";

    newRow
      .querySelector(".btn-eliminar-campo")
      .addEventListener("click", (e) => this.eliminarCampo(newRow));
  },

  eliminarCampo(rowElement) {
    if (
      confirm(
        "¿Está seguro de eliminar este campo? Esta acción es irreversible al guardar."
      )
    ) {
      rowElement.remove();
    }
  },

  // --- Lógica de Guardado ---
  obtenerDatosFormulario() {
    const container = document.getElementById("camposDinamicosContainer");
    const nuevosDatosBasicos = [];

    container.querySelectorAll(".form-campo-row").forEach((row) => {
      const nombreInput = row.querySelector(".input-campo-nombre");
      const valorInput = row.querySelector(
        "input:not(.input-campo-nombre), select, textarea"
      );

      if (!nombreInput || !valorInput) return; // Saltar si el campo está incompleto

      let valor, tipo, sensible;

      tipo = row.dataset.tipo; // Usar el tipo guardado en la fila
      sensible = row.dataset.sensible === "true";

      if (tipo === "boolean" && valorInput.type === "checkbox") {
        valor = valorInput.checked ? "true" : "false";
      } else {
        valor = valorInput.value;
      }

      nuevosDatosBasicos.push({
        campo: nombreInput.value.trim(),
        tipo: tipo,
        valor: valor,
        sensible: sensible,
      });
    });

    // Retornar el objeto parcial para la combinación final
    return { "datos-basicos": nuevosDatosBasicos };
  },

async manejarModificacion(event) {
  event.preventDefault();

  const feedback = document.getElementById("feedbackModificacionBasicos");

  try {
    feedback.innerHTML = `<div class="alert alert-info"><div class="spinner-border spinner-border-sm me-2" role="status"></div> Guardando cambios en GitHub...</div>`;

    // 1. Obtener los datos modificados de ambas pestañas
    const datosBasicosMod = this.obtenerDatosFormulario()["datos-basicos"];
    const accesosMod = accesos.isModifying
      ? accesos.obtenerDatosFormulario().accesos
      : this.datosCompletos.accesos;

    const datosFinales = {
      "datos-basicos": datosBasicosMod,
      accesos: accesosMod,
    };

    // 2. Guardar en GitHub (CORREGIDO)
    await this.guardarEnGitHub(datosFinales); // ← ESTA ES LA CORRECCIÓN PRINCIPAL

    feedback.innerHTML = `<div class="alert alert-success"><strong>✓ Datos actualizados exitosamente</strong><br><small>El cambio ha sido enviado a GitHub. La página se recargará en 2 segundos...</small></div>`;

    // 3. Actualizar datos locales y recargar
    this.datosCompletos = datosFinales;
    setTimeout(() => {
      location.reload();
    }, 2000);
  } catch (error) {
    console.error("Error modificando datos:", error);
    feedback.innerHTML = `<div class="alert alert-danger"><strong>Error al guardar:</strong> ${error.message}<br><small>Verifique la conexión y permisos</small></div>`;
  }
},
  // Función para guardar en GitHub (Corregida con Base64)
async guardarEnGitHub(datosModificados) {
  try {
    const claveAcceso = sessionStorage.getItem("claveAcceso");
    if (!claveAcceso) {
      throw new Error("No hay clave de acceso");
    }

    const datosEncriptadosStr = await seguridad.encriptar(
      datosModificados,
      claveAcceso
    );
    // Base64 para la API de GitHub (doble codificación)
    const datosEncriptadosBase64ForAPI = btoa(datosEncriptadosStr);

    const nombre =
      datosModificados["datos-basicos"].find((d) => d.campo === "Nombre")
        ?.valor || "Usuario";
    const commitMessage = `Actualizar datos encriptados de ${nombre}`;

    // NUEVO: Intentar obtener SHA del archivo existente
    let sha = null;
    try {
      const existingFile = await github._fetchProxy('getFile', CONFIG.DATOS_ENCRYPTED_PATH, {}, false);
      sha = existingFile.sha;
      console.log('✅ SHA del archivo existente:', sha);
    } catch (error) {
      console.log('📄 Archivo encriptado no existe, se creará nuevo');
    }

    await github.guardarArchivo(
      CONFIG.DATOS_ENCRYPTED_PATH,
      datosEncriptadosBase64ForAPI,
      commitMessage,
      sha // NUEVO: Pasar el SHA si existe
    );
  } catch (error) {
    console.error("Error en guardarEnGitHub:", error);
    throw error;
  }
},

inicializar() {
  try {
    this.cargarDatos();
  } catch (error) {
    console.error("Error en inicialización:", error);
    this.mostrarError("Error al inicializar los datos básicos");
  }
},
};
