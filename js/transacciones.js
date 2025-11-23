const transacciones = {
  // Configuración para GitHub con Fine-Grained Token
  GITHUB_CONFIG: {
    OWNER: 'suarezfco65',
    REPO: 'nelly',
    BRANCH: 'main',
    FILE_PATH: 'json/transacciones.json'
  },

  // Estado de la aplicación
  tokenActual: null,
  transaccionesPendientes: [],
  tasasDolar: [], // Array de todas las tasas
  ultimaTasa: null,

  // Formato de números para Venezuela
  formatoNumero: new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }),

// Función para obtener todas las tasas de dólar - VERSIÓN CORREGIDA
async obtenerTasasDolar() {
  try {
    const response = await fetch('https://api.dolarvzla.com/public/exchange-rate/list');
    if (!response.ok) {
      throw new Error('Error al obtener tasas de dólar');
    }
    
    const datos = await response.json();
    
    // USAR LA ESTRUCTURA CORRECTA DE LA API
    if (!datos.rates || !Array.isArray(datos.rates)) {
      throw new Error('Formato de respuesta inválido - no se encontró array "rates"');
    }
    
    // Mapear correctamente los datos de la nueva estructura
    this.tasasDolar = datos.rates
      .filter(tasa => 
        tasa.usd && 
        tasa.date
      )
      .map(tasa => ({
        fecha: tasa.date,
        tasa: parseFloat(tasa.usd),
        currency: 'USD'
      }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // Más reciente primero
    
    // Guardar la última tasa (más reciente)
    if (this.tasasDolar.length > 0) {
      this.ultimaTasa = this.tasasDolar[0].tasa;
      console.log('✅ Tasas de dólar obtenidas:', this.tasasDolar.length, 'registros');
      console.log('💰 Última tasa:', this.ultimaTasa, 'Bs/$ - Fecha:', this.tasasDolar[0].fecha);
    } else {
      throw new Error('No se encontraron tasas USD válidas');
    }
    
    return this.tasasDolar;
    
  } catch (error) {
    console.error('Error obteniendo tasas de dólar:', error);
    // Usar tasa por defecto si hay error
    this.ultimaTasa = 40.0;
    this.tasasDolar = [{ fecha: new Date().toISOString().split('T')[0], tasa: 40.0, currency: 'USD' }];
    console.log('⚠️ Usando tasa por defecto:', this.ultimaTasa);
    return this.tasasDolar;
  }
},
  
  // Función para buscar tasa por fecha específica
  buscarTasaPorFecha(fechaTransaccion) {
    if (!this.tasasDolar || this.tasasDolar.length === 0) {
      return this.ultimaTasa;
    }
    
    // Buscar tasa exacta para la fecha
    const tasaExacta = this.tasasDolar.find(tasa => tasa.fecha === fechaTransaccion);
    if (tasaExacta) {
      return tasaExacta.tasa;
    }
    
    // Si no encuentra tasa exacta, buscar la más cercana (anterior)
    const fechaTrans = new Date(fechaTransaccion);
    const tasasAnteriores = this.tasasDolar.filter(tasa => new Date(tasa.fecha) <= fechaTrans);
    
    if (tasasAnteriores.length > 0) {
      // La más reciente de las anteriores
      return tasasAnteriores[0].tasa;
    }
    
    // Si no hay tasas anteriores, usar la primera disponible (más antigua)
    const tasaMasAntigua = this.tasasDolar[this.tasasDolar.length - 1];
    if (tasaMasAntigua) {
      return tasaMasAntigua.tasa;
    }
    
    // Último recurso: usar la última tasa
    return this.ultimaTasa;
  },

  // Función para convertir bolívares a dólares con tasa por fecha
  convertirBsADolares(montoBs, fechaTransaccion) {
    if (!montoBs || montoBs <= 0) return null;
    
    const tasa = this.buscarTasaPorFecha(fechaTransaccion);
    if (!tasa || tasa <= 0) {
      return null;
    }
    
    return montoBs / tasa;
  },

  // Función para formatear monto en dólares
  formatearDolares(monto) {
    if (monto === null || monto === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(monto);
  },

  // Función para obtener información de la tasa usada
  obtenerInfoTasa(fechaTransaccion) {
    const tasa = this.buscarTasaPorFecha(fechaTransaccion);
    if (!tasa) return null;
    
    // Buscar la tasa en el array para obtener la fecha
    const tasaInfo = this.tasasDolar.find(t => t.tasa === tasa);
    return {
      tasa: tasa,
      fecha: tasaInfo ? tasaInfo.fecha : 'Última disponible',
      esExacta: tasaInfo ? tasaInfo.fecha === fechaTransaccion : false
    };
  },

  // Función para cargar transacciones desde JSON
  async cargarTransacciones() {
    try {
      // Obtener tasas de dólar primero
      await this.obtenerTasasDolar();
      
      const response = await fetch('json/transacciones.json');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const datos = await response.json();
      this.mostrarTransacciones(datos.transacciones);
    } catch (error) {
      console.error('Error cargando transacciones:', error);
      this.mostrarError('Error al cargar las transacciones: ' + error.message);
    }
  },



  // Función para mostrar transacciones en una tabla - VERSIÓN RESPONSIVE
mostrarTransacciones(transacciones) {
  const ultimasTransacciones = transacciones.slice(0, 10);
  
  // Detectar si la pantalla es angosta (menos de 768px)
  const esPantallaAngosta = window.innerWidth < 768;
  
  const contenido = `
    <div class="table-responsive">
      <table class="table table-striped table-hover">
        <thead class="table-dark">
          <tr>
            ${esPantallaAngosta ? `
              <th>Transacción</th>
              <th class="text-end">Saldo (Bs)</th>
            ` : `
              <th>Fecha</th>
              <th>Descripción</th>
              <th class="text-end">Ingreso (Bs)</th>
              <th class="text-end">Egreso (Bs)</th>
              <th class="text-end">Saldo (Bs)</th>
            `}
          </tr>
        </thead>
        <tbody>
          ${ultimasTransacciones.map(trans => {
            const monto = trans.ingreso > 0 ? trans.ingreso : trans.egreso;
            const montoDolares = this.convertirBsADolares(monto, trans.fecha);
            const infoTasa = this.obtenerInfoTasa(trans.fecha);
            const tooltipTasa = infoTasa ? 
              `Tasa: ${this.formatoNumero.format(infoTasa.tasa)} Bs/$ (${infoTasa.fecha})` : 
              'Tasa no disponible';
            
            const esIngreso = trans.ingreso > 0;
            const colorMonto = esIngreso ? 'text-success' : 'text-danger';
            const simboloMonto = esIngreso ? '+' : '-';
            
            if (esPantallaAngosta) {
              // VISTA COMPACTA para pantallas angostas
              return `
                <tr>
                  <td>
                    <div class="d-flex flex-column">
                      <div class="d-flex align-items-start">
                        <strong class="me-2">${this.formatearFecha(trans.fecha)}</strong>
                        <span class="flex-grow-1">${trans.descripcion}</span>
                      </div>
                      <div class="mt-1">
                        <strong class="${colorMonto}">
                          ${simboloMonto} ${this.formatoNumero.format(monto)} Bs
                        </strong>
                        ${montoDolares ? `
                          <small class="text-muted ms-2" title="${tooltipTasa}">
                            (${this.formatearDolares(montoDolares)})
                            ${!infoTasa?.esExacta ? ' *' : ''}
                          </small>
                        ` : ''}
                      </div>
                    </div>
                  </td>
                  <td class="text-end fw-bold ${trans.saldo >= 0 ? 'text-success' : 'text-danger'}">
                    ${this.formatoNumero.format(trans.saldo)}
                  </td>
                </tr>
              `;
            } else {
              // VISTA EXTENDIDA para pantallas anchas
              return `
                <tr>
                  <td>${this.formatearFecha(trans.fecha)}</td>
                  <td>
                    <div>
                      ${trans.descripcion}
                      ${monto > 0 ? `
                        <br>
                        <small class="text-muted" title="${tooltipTasa}">
                          ${this.formatearDolares(montoDolares)}
                          ${!infoTasa?.esExacta ? ' *' : ''}
                        </small>
                      ` : ''}
                    </div>
                  </td>
                  <td class="text-end text-success">${trans.ingreso > 0 ? this.formatoNumero.format(trans.ingreso) : '-'}</td>
                  <td class="text-end text-danger">${trans.egreso > 0 ? this.formatoNumero.format(trans.egreso) : '-'}</td>
                  <td class="text-end fw-bold ${trans.saldo >= 0 ? 'text-success' : 'text-danger'}">
                    ${this.formatoNumero.format(trans.saldo)}
                  </td>
                </tr>
              `;
            }
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="mt-2 text-muted">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          Mostrando las últimas ${ultimasTransacciones.length} transacciones
          ${this.tokenActual ? '<span class="badge bg-success ms-2">Token Activo</span>' : ''}
          <span class="badge bg-light text-dark ms-2">
            <i class="bi bi-${esPantallaAngosta ? 'phone' : 'laptop'}"></i>
            ${esPantallaAngosta ? 'Vista compacta' : 'Vista extendida'}
          </span>
        </div>
        <div>
          ${this.ultimaTasa ? `
            <span class="badge bg-info">Tasa actual: $1 = ${this.formatoNumero.format(this.ultimaTasa)} Bs</span>
            <span class="badge bg-secondary ms-1">${this.tasasDolar.length} tasas cargadas</span>
          ` : ''}
        </div>
      </div>
      ${ultimasTransacciones.some(trans => {
        const infoTasa = this.obtenerInfoTasa(trans.fecha);
        return infoTasa && !infoTasa.esExacta;
      }) ? `
        <div class="mt-1 small text-warning">
          <i class="bi bi-info-circle"></i> * Tasas aproximadas (no se encontró tasa exacta para la fecha)
        </div>
      ` : ''}
    </div>
  `;

  document.getElementById('transaccionesContent').innerHTML = contenido;
  this.actualizarEstadoBoton();
},

  
  // Función para formatear fecha - VERSIÓN ROBUSTA
  formatearFecha(fechaString) {
    try {
      // Dividir la fecha en partes para evitar problemas de zona horaria
      const [anio, mes, dia] = fechaString.split('-').map(Number);
      
      // Crear fecha usando componentes individuales (evita problemas de UTC)
      const fecha = new Date(anio, mes - 1, dia); // mes - 1 porque JavaScript usa 0-11
      
      // Verificar si la fecha es válida
      if (isNaN(fecha.getTime())) {
        throw new Error('Fecha inválida');
      }
      
      return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
    } catch (error) {
      console.error('Error formateando fecha:', fechaString, error);
      return fechaString; // Devolver el string original si hay error
    }
  },

  // Función para mostrar error
  mostrarError(mensaje) {
    document.getElementById('transaccionesContent').innerHTML = `
      <div class="alert alert-danger">
        <strong>Error:</strong> ${mensaje}
      </div>
    `;
  },

  // Función para actualizar estado del botón
  actualizarEstadoBoton() {
    const boton = document.getElementById('mostrarFormTransaccion');
    if (this.tokenActual) {
      boton.innerHTML = '<i class="bi bi-plus-circle"></i> Agregar Transacción (Token ✓)';
      boton.className = 'btn btn-success';
    } else {
      boton.innerHTML = '<i class="bi bi-plus-circle"></i> Agregar Nueva Transacción';
      boton.className = 'btn btn-primary';
    }
  },

  // Función para mostrar/ocultar formulario
  toggleFormulario() {
    const form = document.getElementById('formTransaccion');
    const boton = document.getElementById('mostrarFormTransaccion');
    
    if (form.style.display === 'none') {
      // Si no tenemos token, solicitarlo antes de mostrar el formulario
      if (!this.tokenActual) {
        this.solicitarTokenInicial();
        return;
      }
      
      // Si tenemos token, mostrar formulario directamente
      form.style.display = 'block';
      boton.innerHTML = '<i class="bi bi-dash-circle"></i> Ocultar Formulario';
      // Establecer fecha actual por defecto
      document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
      // Enfocar el campo de descripción
      document.getElementById('descripcion').focus();
    } else {
      form.style.display = 'none';
      this.actualizarEstadoBoton();
      this.limpiarFormulario();
    }
  },

  // Función para solicitar token inicial
  async solicitarTokenInicial() {
    const githubToken = prompt('Ingrese su Fine-Grained Token de GitHub para agregar transacciones:');
    if (!githubToken) {
      return;
    }
    
    const feedback = document.getElementById('transaccionesContent');
    
    try {
      // Mostrar mensaje de verificación
      const contenidoOriginal = feedback.innerHTML;
      feedback.innerHTML = `
        <div class="text-center py-4">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Verificando token...</span>
          </div>
          <p class="mt-2">Verificando token de GitHub...</p>
        </div>
      `;
      
      // Verificar token
      const tokenValido = await this.verificarToken(githubToken);
      if (!tokenValido) {
        throw new Error('Token inválido o sin permisos suficientes');
      }
      
      // Guardar token
      this.tokenActual = githubToken;
      
      // Restaurar contenido y mostrar formulario
      this.mostrarTransacciones((await fetch('json/transacciones.json').then(r => r.json())).transacciones);
      
      // Mostrar mensaje de éxito
      setTimeout(() => {
        const alerta = document.createElement('div');
        alerta.className = 'alert alert-success alert-dismissible fade show';
        alerta.innerHTML = `
          <strong>✓ Token verificado correctamente</strong>
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.getElementById('transaccionesContent').prepend(alerta);
      }, 100);
      
      // Mostrar formulario
      this.toggleFormulario();
      
    } catch (error) {
      console.error('Error verificando token:', error);
      this.mostrarError(`Error al verificar token: ${error.message}`);
      // Recargar transacciones después de 3 segundos
      setTimeout(() => {
        this.cargarTransacciones();
      }, 3000);
    }
  },

  // Función para limpiar formulario
  limpiarFormulario() {
    document.getElementById('nuevaTransaccionForm').reset();
    document.getElementById('feedbackTransaccion').innerHTML = '';
  },

  // Función para manejar envío del formulario (SIN solicitar token nuevamente)
  async manejarEnvioFormulario(event) {
    event.preventDefault();
    
    const fecha = document.getElementById('fecha').value;
    const descripcion = document.getElementById('descripcion').value;
    const tipo = document.getElementById('tipo').value;
    const monto = parseFloat(document.getElementById('monto').value);
    
    const feedback = document.getElementById('feedbackTransaccion');
    
    // Validaciones básicas
    if (!fecha) {
      feedback.innerHTML = '<div class="alert alert-warning">La fecha es requerida</div>';
      return;
    }
    
    if (!descripcion.trim()) {
      feedback.innerHTML = '<div class="alert alert-warning">La descripción es requerida</div>';
      return;
    }
    
    if (!monto || monto <= 0) {
      feedback.innerHTML = '<div class="alert alert-warning">El monto debe ser mayor a 0</div>';
      return;
    }
    
    // Verificar que tenemos token
    if (!this.tokenActual) {
      feedback.innerHTML = '<div class="alert alert-danger">Token no disponible. Por favor, reinicie el proceso.</div>';
      return;
    }
    
    // Crear nueva transacción
    const nuevaTransaccion = {
      fecha: fecha,
      descripcion: descripcion.trim(),
      ingreso: tipo === 'ingreso' ? monto : 0,
      egreso: tipo === 'egreso' ? monto : 0,
      saldo: 0 // Se calculará en guardarEnGitHub
    };
    
    try {
      feedback.innerHTML = '<div class="alert alert-info">Guardando transacción en GitHub...</div>';
      
      // Obtener tasa de dólar para la fecha específica
      await this.obtenerTasasDolar();
      const montoDolares = this.convertirBsADolares(monto, fecha);
      const infoTasa = this.obtenerInfoTasa(fecha);
      
      // Usar la función de GitHub con el token actual
      await this.guardarEnGitHub(nuevaTransaccion, this.tokenActual);
      
      const mensajeTasa = infoTasa ? 
        `Tasa: ${this.formatoNumero.format(infoTasa.tasa)} Bs/$ (${infoTasa.fecha})` : 
        'Tasa no disponible';
      
      feedback.innerHTML = `
        <div class="alert alert-success">
          <strong>✓ Transacción guardada exitosamente</strong><br>
          <small>Monto: ${this.formatoNumero.format(monto)} Bs ${montoDolares ? `(${this.formatearDolares(montoDolares)})` : ''} - ${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</small><br>
          <small>${mensajeTasa}</small><br>
          <small>Puede agregar otra transacción o cerrar el formulario</small>
        </div>
      `;
      
      // Limpiar formulario para nueva transacción
      document.getElementById('descripcion').value = '';
      document.getElementById('monto').value = '';
      document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
      document.getElementById('descripcion').focus();
      
      // Recargar la tabla de transacciones
      this.cargarTransacciones();
      
    } catch (error) {
      console.error('Error guardando transacción:', error);
      feedback.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error al guardar:</strong> ${error.message}<br>
          <small>Verifique la conexión y permisos</small>
        </div>
      `;
    }
  },

  // Función para verificar token
  async verificarToken(githubToken) {
    try {
      const tokenLimpio = githubToken.trim();
      
      if (!tokenLimpio.startsWith('github_pat_')) {
        throw new Error('Formato de token incorrecto');
      }
      
      const response = await fetch(
        `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenLimpio}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      );
      
      return response.ok;
      
    } catch (error) {
      console.error('Error verificando token:', error);
      return false;
    }
  },

  // Función para llamar a la API de GitHub
  async llamarGitHubAPI(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${options.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API Error: ${response.status} - ${errorData.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error en llamarGitHubAPI:', error);
      throw error;
    }
  },

  // Función para guardar en GitHub
  async guardarEnGitHub(nuevaTransaccion, githubToken) {
    try {
      console.log('Iniciando guardado en GitHub...');
      
      const tokenLimpio = githubToken.trim();
      
      // Verificar formato del token
      if (!tokenLimpio.startsWith('github_pat_')) {
        throw new Error('Formato de token incorrecto. Debe ser un Fine-Grained Token que empiece con "github_pat_"');
      }

      // 1. Obtener el archivo actual
      let fileData;
      try {
        fileData = await this.llamarGitHubAPI(
          `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/${this.GITHUB_CONFIG.FILE_PATH}`,
          { token: tokenLimpio }
        );
        console.log('✓ Archivo actual obtenido');
      } catch (error) {
        if (error.message.includes('404')) {
          console.log('Archivo no existe, creando nuevo...');
          return await this.crearNuevoArchivo(nuevaTransaccion, tokenLimpio);
        }
        throw error;
      }
      
      // 2. Actualizar el contenido
      const contenidoActual = JSON.parse(atob(fileData.content));
      
      // Calcular el nuevo saldo
      const saldoAnterior = contenidoActual.transacciones.length > 0 
        ? contenidoActual.transacciones[0].saldo 
        : 0;
      
      nuevaTransaccion.saldo = nuevaTransaccion.ingreso > 0 
        ? saldoAnterior + nuevaTransaccion.ingreso
        : saldoAnterior - nuevaTransaccion.egreso;
      
      // Agregar la nueva transacción al inicio
      contenidoActual.transacciones.unshift(nuevaTransaccion);
      
      // 3. Actualizar el archivo en GitHub
      const datosActualizacion = {
        message: `Agregar transacción: ${nuevaTransaccion.descripcion}`,
        content: btoa(JSON.stringify(contenidoActual, null, 2)),
        sha: fileData.sha,
        branch: this.GITHUB_CONFIG.BRANCH
      };
      
      await this.llamarGitHubAPI(
        `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/${this.GITHUB_CONFIG.FILE_PATH}`,
        {
          token: tokenLimpio,
          method: 'PUT',
          body: JSON.stringify(datosActualizacion)
        }
      );
      
      console.log('✓ Archivo actualizado exitosamente');
      return { success: true };
      
    } catch (error) {
      console.error('Error completo en guardarEnGitHub:', error);
      
      // Mensajes de error más específicos
      if (error.message.includes('401')) {
        throw new Error('Token inválido o expirado. Verifique las credenciales.');
      } else if (error.message.includes('403')) {
        throw new Error('Token sin permisos suficientes. Verifique que tenga permisos de "Contents: Read and write".');
      } else if (error.message.includes('404')) {
        throw new Error('Repositorio no encontrado. Verifique que "suarezfco/nelly" exista.');
      } else if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
        throw new Error('Error de conexión. Verifique su conexión a internet o problemas de CORS.');
      } else {
        throw new Error(`Error al guardar en GitHub: ${error.message}`);
      }
    }
  },

  // Función para crear nuevo archivo si no existe
  async crearNuevoArchivo(nuevaTransaccion, githubToken) {
    try {
      // Calcular saldo inicial
      nuevaTransaccion.saldo = nuevaTransaccion.ingreso > 0 
        ? nuevaTransaccion.ingreso 
        : -nuevaTransaccion.egreso;
      
      const contenidoInicial = {
        transacciones: [nuevaTransaccion]
      };
      
      const datosCreacion = {
        message: `Crear archivo de transacciones: ${nuevaTransaccion.descripcion}`,
        content: btoa(JSON.stringify(contenidoInicial, null, 2)),
        branch: this.GITHUB_CONFIG.BRANCH
      };
      
      await this.llamarGitHubAPI(
        `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/${this.GITHUB_CONFIG.FILE_PATH}`,
        {
          token: githubToken,
          method: 'PUT',
          body: JSON.stringify(datosCreacion)
        }
      );
      
      console.log('✓ Nuevo archivo creado exitosamente');
      return { success: true };
      
    } catch (error) {
      console.error('Error en crearNuevoArchivo:', error);
      throw error;
    }
  },

  // Función para esperar a que termine el commit de GitHub
  async esperarCommit(commitUrl, githubToken, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(commitUrl, {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });
        
        if (response.ok) {
          const commitData = await response.json();
          // Verificar si el commit está completo (status puede variar según el estado)
          if (commitData.status && commitData.status === 'completed') {
            return true;
          }
          
          // Si no hay status, asumimos que está completo después de un breve delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        }
      } catch (error) {
        console.log('Esperando commit...');
      }
      
      // Esperar 1 segundo antes de revisar nuevamente
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Timeout esperando el commit');
  },

  // Función para inicializar eventos
  inicializarEventos() {
    // Botón para mostrar/ocultar formulario
    document.getElementById('mostrarFormTransaccion').addEventListener('click', () => {
      this.toggleFormulario();
    });
    
    // Botón cancelar
    document.getElementById('cancelarTransaccion').addEventListener('click', () => {
      this.toggleFormulario();
    });
    
    // Formulario de envío
    document.getElementById('nuevaTransaccionForm').addEventListener('submit', (e) => {
      this.manejarEnvioFormulario(e);
    });
    
    // Botón para limpiar token (opcional - para debugging)
    const btnLimpiarToken = document.createElement('button');
    btnLimpiarToken.className = 'btn btn-outline-secondary btn-sm ms-2';
    btnLimpiarToken.innerHTML = '<i class="bi bi-x-circle"></i> Limpiar Token';
    btnLimpiarToken.addEventListener('click', () => {
      this.tokenActual = null;
      this.actualizarEstadoBoton();
      this.cargarTransacciones(); // Recargar para quitar el badge de token activo
      alert('Token limpiado. Debe ingresarlo nuevamente para agregar transacciones.');
    });
    
    document.querySelector('#transacciones .mt-3').appendChild(btnLimpiarToken);
  },
// Agregar también un listener para redimensionamiento de ventana
inicializar() {
  // Botón para mostrar/ocultar formulario
  document.getElementById('mostrarFormTransaccion').addEventListener('click', () => {
    this.toggleFormulario();
  });
  
  // Botón cancelar
  document.getElementById('cancelarTransaccion').addEventListener('click', () => {
    this.toggleFormulario();
  });
  
  // Formulario de envío
  document.getElementById('nuevaTransaccionForm').addEventListener('submit', (e) => {
    this.manejarEnvioFormulario(e);
  });
  
  // Redimensionamiento de ventana para cambiar vista automáticamente
  window.addEventListener('resize', () => {
    // Recargar la vista si cambia entre modos
    const nuevaEsAngosta = window.innerWidth < 768;
    const elementoActual = document.querySelector('.badge.bg-light');
    const actualEsAngosta = elementoActual?.textContent.includes('compacta');
    
    if (nuevaEsAngosta !== actualEsAngosta) {
      this.cargarTransacciones();
    }
  });
  
  // Botón para limpiar token (opcional - para debugging)
  const btnLimpiarToken = document.createElement('button');
  btnLimpiarToken.className = 'btn btn-outline-secondary btn-sm ms-2';
  btnLimpiarToken.innerHTML = '<i class="bi bi-x-circle"></i> Limpiar Token';
  btnLimpiarToken.addEventListener('click', () => {
    this.tokenActual = null;
    this.actualizarEstadoBoton();
    this.cargarTransacciones();
    alert('Token limpiado. Debe ingresarlo nuevamente para agregar transacciones.');
  });
  
  document.querySelector('#transacciones .mt-3').appendChild(btnLimpiarToken);
},
};
