const transacciones = {
  // Configuración para GitHub con Fine-Grained Token
  GITHUB_CONFIG: {
    OWNER: 'suarezfco',
    REPO: 'nelly',
    BRANCH: 'main',
    FILE_PATH: 'json/transacciones.json'
  },

    PROXY_URL: '/api/proxy.js', // Ruta relativa al proxy en GitHub Pages

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
      
      // Usar la función real de GitHub
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

  // Función para llamar al proxy
  async llamarProxy(accion, datos = {}, githubToken) {
    try {
      const response = await fetch(this.PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          githubToken: githubToken,
          action: accion,
          data: datos
        })
      });

      if (!response.ok) {
        throw new Error(`Error del proxy: ${response.status}`);
      }

      const resultado = await response.json();
      
      if (!resultado.ok) {
        throw new Error(`Error de GitHub: ${resultado.status} - ${resultado.data.message}`);
      }
      
      return resultado.data;
      
    } catch (error) {
      console.error('Error en llamarProxy:', error);
      throw error;
    }
  },

  // Función actualizada para guardar en GitHub usando proxy
  async guardarEnGitHub(nuevaTransaccion, githubToken) {
    try {
      console.log('Iniciando guardado en GitHub via proxy...');
      
      const tokenLimpio = githubToken.trim();
      
      // 1. Verificar que podemos acceder al repositorio
      await this.llamarProxy('testRepo', {}, tokenLimpio);
      console.log('✓ Acceso al repositorio verificado');

      // 2. Obtener el archivo actual (o crear uno nuevo si no existe)
      let fileData;
      try {
        fileData = await this.llamarProxy('getFile', {}, tokenLimpio);
        console.log('✓ Archivo actual obtenido');
      } catch (error) {
        if (error.message.includes('404')) {
          console.log('Archivo no existe, creando nuevo...');
          return await this.crearNuevoArchivo(nuevaTransaccion, tokenLimpio);
        }
        throw error;
      }
      
      // 3. Actualizar el contenido
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
      
      // 4. Actualizar el archivo en GitHub
      const datosActualizacion = {
        message: `Agregar transacción: ${nuevaTransaccion.descripcion}`,
        content: btoa(JSON.stringify(contenidoActual, null, 2)),
        sha: fileData.sha,
        branch: this.GITHUB_CONFIG.BRANCH
      };
      
      await this.llamarProxy('updateFile', datosActualizacion, tokenLimpio);
      console.log('✓ Archivo actualizado exitosamente');
      
      return { success: true };
      
    } catch (error) {
      console.error('Error completo en guardarEnGitHub:', error);
      throw new Error(`Error al guardar en GitHub: ${error.message}`);
    }
  },

  // Función actualizada para crear nuevo archivo
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
      
      await this.llamarProxy('updateFile', datosCreacion, githubToken);
      console.log('✓ Nuevo archivo creado exitosamente');
      
      return { success: true };
      
    } catch (error) {
      console.error('Error en crearNuevoArchivo:', error);
      throw error;
    }
  },

  // Función de diagnóstico actualizada
  async diagnosticarToken(githubToken) {
    try {
      console.log('🔍 DIAGNÓSTICO COMPLETO DEL TOKEN (via proxy)');
      
      const tokenLimpio = githubToken.trim();
      console.log('📝 Token (primeros 8 chars):', tokenLimpio.substring(0, 8) + '...');
      
      // Verificar formato
      if (!tokenLimpio.startsWith('github_pat_')) {
        console.error('❌ FORMATO INCORRECTO');
        return false;
      }
      
      console.log('✅ Formato del token correcto');
      
      // Probar acceso al repositorio via proxy
      console.log('🔗 Probando acceso al repositorio...');
      const repoData = await this.llamarProxy('testRepo', {}, tokenLimpio);
      console.log('✅ REPOSITORIO ACCESIBLE:', repoData.full_name);
      
      // Probar acceso al archivo
      console.log('📋 Verificando archivo de transacciones...');
      try {
        const fileData = await this.llamarProxy('getFile', {}, tokenLimpio);
        console.log('✅ transacciones.json existe y es accesible');
      } catch (error) {
        if (error.message.includes('404')) {
          console.log('ℹ️ transacciones.json no existe (se creará automáticamente)');
        } else {
          throw error;
        }
      }
      
      console.log('🎉 DIAGNÓSTICO COMPLETADO - Token funciona correctamente');
      return true;
      
    } catch (error) {
      console.error('💥 ERROR EN DIAGNÓSTICO:', error);
      return false;
    }
  },
  
  // Inicializar pestaña de transacciones
  inicializar() {
    this.inicializarEventos();
    this.cargarTransacciones();
    console.log('Pestaña "Transacciones" inicializada');
  }
};
