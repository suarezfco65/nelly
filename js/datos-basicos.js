// datos-basicos.js

const datosBasicos = {
  // Datos actuales y estado
  datosLocales: null, // Almacena solo la lista de datos básicos
  isModifying: false,
  tokenActual: null, // Almacenamiento temporal del token validado

  // --- Carga de Datos ---
  async cargarDatos() {
    try {
      const claveAcceso = sessionStorage.getItem("claveAcceso");
      if (!claveAcceso) {
        this.redirigirALogin();
        return;
      }

      let datosFull;
      let listaDatosBasicos = [];

      try {
        const responseEncriptado = await fetch(CONFIG.DATOS_ENCRYPTED_PATH);

        if (responseEncriptado.ok) {
          const datosEncriptados = await responseEncriptado.text();
          datosFull = await seguridad.desencriptar(
            datosEncriptados,
            claveAcceso
          );

          // Lógica de separación:
          // Si el archivo contiene la estructura antigua (combinada), extraemos solo datos-basicos.
          // Si es la nueva estructura separada, tomamos datos-basicos directamente.
          if (datosFull["datos-basicos"]) {
            listaDatosBasicos = datosFull["datos-basicos"];
          } else {
            // Si por alguna razón la estructura no coincide, intentamos migrar
            const migrado = this.migrarEstructura(datosFull);
            listaDatosBasicos = migrado["datos-basicos"];
          }
        } else {
          // Cargar la plantilla inicial si no hay encriptado (Primera vez o error de red)
          const responseInicial = await fetch(CONFIG.JSON_URL);
          if (!responseInicial.ok) {
            throw new Error("No se pudo cargar la plantilla inicial de datos.");
          }
          const datosLegacy = await responseInicial.json();
          const migrado = this.migrarEstructura(datosLegacy);
          listaDatosBasicos = migrado["datos-basicos"];
        }
      } catch (errorCarga) {
        // Manejo específico de error de clave
        if (
          errorCarga.message.includes("Clave incorrecta") ||
          errorCarga.message.includes("desencriptar")
        ) {
          throw errorCarga;
        }

        console.warn(
          "Error cargando encriptado, usando fallback JSON:",
          errorCarga
        );
        const responseInicial = await fetch(CONFIG.JSON_URL);
        const datosLegacy = await responseInicial.json();
        const migrado = this.migrarEstructura(datosLegacy);
        listaDatosBasicos = migrado["datos-basicos"];
      }

      this.datosLocales = listaDatosBasicos;

      // Mostrar datos (Solo renderizamos lo nuestro)
      this.renderizarDatosBasicos(this.datosLocales);

      // NOTA: Ya no llamamos a accesos.inicializar() aquí.
      // app.js se encarga de iniciar ambos módulos por separado.
    } catch (error) {
      console.error("Error cargando datos básicos:", error);

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
    if (!datosLegacy) {
      datosLegacy = {};
    }

    // Solo nos importa construir la estructura de datos-basicos
    // Ignoramos accesos aquí, ya que accesos.js hará su propia migración si es necesario
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
      // Accesos eliminados de este objeto retornado
    };
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
      return `<span class="masked sensitive" data-value="${valor}">${"•".repeat(
        valor.length
      )}</span>`;
    }

    switch (item.tipo) {
      case "fecha":
        return valor ? new Date(valor).toLocaleDateString() : "N/A";
      case "numero":
        return valor ? parseFloat(valor).toLocaleString() : "0";
      case "boolean":
        return valor === "true" || valor === true
          ? '<span class="badge bg-success">Sí</span>'
          : '<span class="badge bg-danger">No</span>';
      case "texto":
        return valor
          ? `<span style="white-space: pre-wrap;">${valor}</span>`
          : "";
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
          <i class="bi bi-pencil-square"></i> Modificar Datos Básicos
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
        return `<div class="form-check form-switch"><input type="checkbox" id="${id}" ${baseAttr} ${checked} class="form-check-input input-boolean" role="switch"></div>`;
      case "texto":
        return `<textarea id="${id}" rows="4" ${baseAttr} required>${item.valor}</textarea>`;
      default:
        return `<input type="text" id="${id}" value="${item.valor}" ${baseAttr} required>`;
    }
  },

  // --- Lógica de Arrastre (Drag and Drop) ---
  inicializarDragAndDrop() {
    const container = document.getElementById("camposDinamicosContainer");
    if (!container) return;

    container.classList.add("sortable-container");

    // Verificar si Sortable está disponible
    if (typeof Sortable !== "undefined") {
      new Sortable(container, {
        animation: 150,
        ghostClass: "blue-background-class",
        handle: ".form-campo-row",
        onEnd: function (evt) {
          console.log("Campo reordenado");
        },
      });
    } else {
      console.warn("Librería SortableJS no cargada.");
    }
  },

  renderizarFormularioModificacion() {
    this.isModifying = true;
    const datos = this.datosLocales;

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
            <div id="camposDinamicosContainer" class="drag-list">
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
                                <option value="texto">texto</option>
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
                <i class="bi bi-check-circle"></i> Guardar Solo Datos Básicos
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
        this.manejarModificacion(e);
      });

    document
      .getElementById("btnCancelarModificacionBasicos")
      .addEventListener("click", () => {
        // Al cancelar, volvemos a renderizar lo que teníamos en memoria localmente
        this.tokenActual = null;
        this.renderizarDatosBasicos(this.datosLocales);
        // NO llamamos a accesos.renderizar... aquí. Son independientes.
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

    this.inicializarDragAndDrop();
  },

  // --- Lógica del Token ---
  async solicitarTokenModificacion() {
    const feedback = document.getElementById("feedbackModificacionBasicos");

    try {
      feedback.innerHTML = `<div class="alert alert-info py-2"><div class="spinner-border spinner-border-sm me-2" role="status"></div> Verificando token...</div>`;

      // Verificamos el token (esto guardará el token en sesión si el usuario lo ingresa)
      await github.verificarToken();

      // Solo activamos la modificación de ESTE módulo
      this.renderizarFormularioModificacion();

      feedback.innerHTML = `<div class="alert alert-success py-2">Token verificado ✓</div>`;
      setTimeout(() => {
        if (feedback) feedback.innerHTML = "";
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
    const newIndex = container.children.length;

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
    newRow.dataset.tipo = tipo;

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

      if (!nombreInput || !valorInput) return;

      let valor, tipo, sensible;

      tipo = row.dataset.tipo;
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

    // Retornar la estructura estricta para el JSON independiente
    return { "datos-basicos": nuevosDatosBasicos };
  },

  async manejarModificacion(event) {
    event.preventDefault();

    const feedback = document.getElementById("feedbackModificacionBasicos");

    try {
      feedback.innerHTML = `<div class="alert alert-info"><div class="spinner-border spinner-border-sm me-2" role="status"></div> Guardando SOLO Datos Básicos...</div>`;

      // 1. Obtener SOLO los datos básicos del formulario actual
      // IMPORTANTE: Ya no consultamos a 'accesos' para nada.
      const datosParaGuardar = this.obtenerDatosFormulario();

      // 2. Guardar en GitHub (Sobrescribirá datos-basicos-encriptado.json solo con datos básicos)
      await this.guardarEnGitHub(datosParaGuardar);

      feedback.innerHTML = `<div class="alert alert-success"><strong>✓ Datos básicos actualizados</strong><br><small>Recargando...</small></div>`;

      // 3. Actualizar datos locales y recargar
      this.datosLocales = datosParaGuardar["datos-basicos"];
      setTimeout(() => {
        location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error modificando datos:", error);
      feedback.innerHTML = `<div class="alert alert-danger"><strong>Error al guardar:</strong> ${error.message}<br><small>Verifique la conexión y permisos</small></div>`;
    }
  },

  async guardarEnGitHub(datosModificados) {
    try {
      const claveAcceso = sessionStorage.getItem("claveAcceso");
      if (!claveAcceso) {
        throw new Error("No hay clave de acceso");
      }

      // Encriptar solo el objeto de datos básicos
      const datosEncriptadosStr = await seguridad.encriptar(
        datosModificados,
        claveAcceso
      );

      const datosEncriptadosBase64ForAPI = btoa(datosEncriptadosStr);

      const nombre =
        datosModificados["datos-basicos"].find((d) => d.campo === "Nombre")
          ?.valor || "Usuario";
      const commitMessage = `Actualizar datos básicos de ${nombre}`;

      // Intentar obtener SHA del archivo existente para hacer un update limpio
      let sha = null;
      try {
        const existingFile = await github._fetchProxy(
          "getFile",
          CONFIG.DATOS_ENCRYPTED_PATH,
          {},
          false
        );
        sha = existingFile.sha;
      } catch (error) {
        console.log(
          "Archivo encriptado no existe o no se pudo obtener SHA, se creará uno nuevo."
        );
      }

      await github.guardarArchivo(
        CONFIG.DATOS_ENCRYPTED_PATH,
        datosEncriptadosBase64ForAPI,
        commitMessage,
        sha
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
