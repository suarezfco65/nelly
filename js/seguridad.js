const seguridad = {
  // Configuración
  ALGORITMO: "AES-GCM",
  ITERACIONES_PBKDF2: 100000,

  // Función para derivar clave AES desde una contraseña
  async derivarClave(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: this.ITERACIONES_PBKDF2,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: this.ALGORITMO, length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  // Función para encriptar datos
  async encriptar(datos, password) {
    try {
      const encoder = new TextEncoder();
      const datosBuffer = encoder.encode(JSON.stringify(datos));

      // Generar salt y IV aleatorios
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Derivar clave
      const clave = await this.derivarClave(password, salt);

      // Encriptar
      const datosEncriptados = await window.crypto.subtle.encrypt(
        {
          name: this.ALGORITMO,
          iv: iv,
        },
        clave,
        datosBuffer
      );

      // Combinar salt + IV + datos encriptados
      const resultado = new Uint8Array(
        salt.length + iv.length + datosEncriptados.byteLength
      );
      resultado.set(salt, 0);
      resultado.set(iv, salt.length);
      resultado.set(new Uint8Array(datosEncriptados), salt.length + iv.length);

      return btoa(String.fromCharCode(...resultado));
    } catch (error) {
      console.error("Error encriptando:", error);
      throw new Error("Error al encriptar los datos");
    }
  },

  // Función para desencriptar datos
  async desencriptar(datosEncriptadosBase64, password) {
    try {
      // Decodificar base64
      const datosEncriptados = new Uint8Array(
        atob(datosEncriptadosBase64)
          .split("")
          .map((char) => char.charCodeAt(0))
      );

      // Extraer salt, IV y datos
      const salt = datosEncriptados.slice(0, 16);
      const iv = datosEncriptados.slice(16, 28);
      const datos = datosEncriptados.slice(28);

      // Derivar clave
      const clave = await this.derivarClave(password, salt);

      // Desencriptar
      const datosDesencriptados = await window.crypto.subtle.decrypt(
        {
          name: this.ALGORITMO,
          iv: iv,
        },
        clave,
        datos
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(datosDesencriptados));
    } catch (error) {
      console.error("Error desencriptando:", error);
      throw new Error("Clave incorrecta o datos corruptos");
    }
  },

  // Función para verificar si la clave es correcta
  async verificarClave(datosEncriptadosBase64, password) {
    try {
      await this.desencriptar(datosEncriptadosBase64, password);
      return true;
    } catch (error) {
      return false;
    }
  },
  // Agregar al final de seguridad.js
seguridad.gestionarTokens = {
  guardarToken: function(token) {
    sessionStorage.setItem('githubToken', token);
  },
  
  obtenerToken: function() {
    return sessionStorage.getItem('githubToken');
  },
  
  eliminarToken: function() {
    sessionStorage.removeItem('githubToken');
  },
  
  tokenExiste: function() {
    return !!sessionStorage.getItem('githubToken');
  }
};
};
