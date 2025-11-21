const transacciones = {
  // Configuración para GitHub con Fine-Grained Token
  GITHUB_CONFIG: {
    OWNER: 'suarezfco',
    REPO: 'nelly',
    BRANCH: 'main',
    FILE_PATH: 'json/transacciones.json'
  },

  // Función para cargar transacciones desde JSON
  async cargarTransacciones() {
    try {
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
            ${ultimasTransacciones.map(trans => `
              <tr>
                <td>${this.formatearFecha(trans.fecha)}</td>
                <td>${trans.descripcion}</td>
                <td class="text-end text-success">${trans.ingreso > 0 ? trans.ingreso.toFixed(2) : '-'}</td>
                <td class="text-end text-danger">${trans.egreso > 0 ? trans.egreso.toFixed(2) : '-'}</td>
                <td class="text-end fw-bold ${trans.saldo >= 0 ? 'text-success' : 'text-danger'}">
                  ${trans.saldo.toFixed(2)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="mt-2 text-muted">
        Mostrando las últimas ${ultimasTransacciones.length} transacciones
      </div>
    `;

    document.getElementById('transaccionesContent').innerHTML = contenido;
  },

  // Función para formatear fecha
  formatearFecha(fechaString) {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES');
  },

  // Función para mostrar error
  mostrarError(mensaje) {
    document.getElementById('transaccionesContent').innerHTML = `
      <div class="alert alert-danger">
        <strong>Error:</strong> ${mensaje}
      </div>
    `;
  },

  // Función para mostrar/ocultar formulario
  toggleFormulario() {
    const form = document.getElementById('formTransaccion');
    const boton = document.getElementById('mostrarFormTransaccion');
    
    if (form.style.display === 'none') {
      form.style.display = 'block';
      boton.textContent = 'Ocultar Formulario';
      // Establecer fecha actual por defecto
      document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
    } else {
      form.style.display = 'none';
      boton.textContent = 'Agregar Nueva Transacción';
      this.limpiarFormulario();
    }
  },

  // Función para limpiar formulario
  limpiarFormulario() {
    document.getElementById('nuevaTransaccionForm').reset();
    document.getElementById('feedbackTransaccion').innerHTML = '';
  },

  // Función para manejar envío del formulario
  async manejarEnvioFormulario(event) {
    event.preventDefault();
    
    const fecha = document.getElementById('fecha').value;
    const descripcion = document.getElementById('descripcion').value;
    const tipo = document.getElementById('tipo').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const clave = document.getElementById('claveTransaccion').value;
    
    const feedback = document.getElementById('feedbackTransaccion');
    
    // Validar clave
    if (clave !== CONFIG.KEY) {
      feedback.innerHTML = '<div class="alert alert-danger">Clave incorrecta</div>';
      return;
    }
    
    // Solicitar token de GitHub
    const githubToken = prompt('Ingrese su Fine-Grained Token de GitHub:');
    if (!githubToken) {
      feedback.innerHTML = '<div class="alert alert-warning">Token requerido para guardar</div>';
      return;
    }
    
    // Crear nueva transacción
    const nuevaTransaccion = {
      fecha: fecha,
      descripcion: descripcion,
      ingreso: tipo === 'ingreso' ? monto : 0,
      egreso: tipo === 'egreso' ? monto : 0,
      saldo: 0 // Se calculará en guardarEnGitHub
    };
    
    try {
      feedback.innerHTML = '<div class="alert alert-info">Guardando transacción en GitHub...</div>';
      
      // Usar la función de GitHub
      await this.guardarEnGitHub(nuevaTransaccion, githubToken);
      
      feedback.innerHTML = `
        <div class="alert alert-success">
          <strong>✓ Transacción guardada exitosamente</strong><br>
          <small>La página se recargará en 3 segundos...</small>
        </div>
      `;
      
      // Recargar después de 3 segundos
      setTimeout(() => {
        location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('Error guardando transacción:', error);
      feedback.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error al guardar:</strong> ${error.message}<br>
          <small>Verifique el token y los permisos</small>
        </div>
      `;
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

  // Función para guardar en GitHub (versión simplificada)
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

  // Función de diagnóstico mejorada
  async diagnosticarToken(githubToken) {
    try {
      console.log('🔍 DIAGNÓSTICO COMPLETO DEL TOKEN');
      
      const tokenLimpio = githubToken.trim();
      console.log('📝 Token (primeros 8 chars):', tokenLimpio.substring(0, 8) + '...');
      console.log('📝 Longitud del token:', tokenLimpio.length);
      
      // Verificar formato del token (debe empezar con github_pat_)
      if (!tokenLimpio.startsWith('github_pat_')) {
        console.error('❌ FORMATO INCORRECTO: Los Fine-Grained Tokens deben empezar con "github_pat_"');
        console.log('💡 El token proporcionado:', tokenLimpio.substring(0, 20) + '...');
        return {
          success: false,
          error: 'Formato de token incorrecto. Debe empezar con "github_pat_"'
        };
      }
      
      console.log('✅ Formato del token correcto');
      
      // Probar acceso al repositorio
      console.log('🔗 Probando acceso al repositorio...');
      const repoResponse = await this.llamarGitHubAPI(
        `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}`,
        { token: tokenLimpio }
      );
      
      console.log('✅ REPOSITORIO ACCESIBLE:', repoResponse.full_name);
      console.log('📁 Visibilidad:', repoResponse.visibility);
      console.log('🔒 Privado:', repoResponse.private);
      
      // Probar acceso al archivo
      console.log('📋 Verificando archivo de transacciones...');
      try {
        const fileData = await this.llamarGitHubAPI(
          `https://api.github.com/repos/${this.GITHUB_CONFIG.OWNER}/${this.GITHUB_CONFIG.REPO}/contents/${this.GITHUB_CONFIG.FILE_PATH}`,
          { token: tokenLimpio }
        );
        console.log('✅ transacciones.json existe y es accesible');
        console.log('📊 Número de transacciones:', fileData.transacciones ? fileData.transacciones.length : 'N/A');
      } catch (error) {
        if (error.message.includes('404')) {
          console.log('ℹ️ transacciones.json no existe (se creará automáticamente)');
        } else {
          console.error('❌ Error accediendo al archivo:', error.message);
          return {
            success: false,
            error: `Error accediendo al archivo: ${error.message}`
          };
        }
      }
      
      console.log('🎉 DIAGNÓSTICO COMPLETADO - Token funciona correctamente');
      return {
        success: true,
        message: 'Token funciona correctamente'
      };
      
    } catch (error) {
      console.error('💥 ERROR EN DIAGNÓSTICO:', error);
      
      let mensajeError = 'Error desconocido';
      if (error.message.includes('401')) {
        mensajeError = 'Token inválido o expirado. Verifique las credenciales.';
      } else if (error.message.includes('403')) {
        mensajeError = 'Token sin permisos suficientes. Verifique que tenga permisos de "Contents: Read and write".';
      } else if (error.message.includes('404')) {
        mensajeError = 'Repositorio no encontrado. Verifique que "suarezfco/nelly" exista.';
      } else if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
        mensajeError = 'Error de conexión o CORS. Verifique su conexión a internet.';
      } else {
        mensajeError = error.message;
      }
      
      return {
        success: false,
        error: mensajeError
      };
    }
  },

  // Función simple para probar token desde consola
  async probarTokenSimple(githubToken) {
    const resultado = await this.diagnosticarToken(githubToken);
    if (resultado.success) {
      alert('✅ Token funciona correctamente');
    } else {
      alert('❌ ' + resultado.error);
    }
    return resultado.success;
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
  },

  // Inicializar pestaña de transacciones
  inicializar() {
    this.inicializarEventos();
    this.cargarTransacciones();
    console.log('Pestaña "Transacciones" inicializada');
    
    // Exponer funciones para debugging
    window.transaccionesDebug = {
      diagnosticarToken: (token) => this.diagnosticarToken(token),
      probarTokenSimple: (token) => this.probarTokenSimple(token),
      guardarEnGitHub: (transaccion, token) => this.guardarEnGitHub(transaccion, token)
    };
  }
};
