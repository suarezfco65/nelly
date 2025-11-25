// api/proxy.js - VERSIÓN CORREGIDA
export default async function handler(request) {
  // Configuración CORS completa
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-GitHub-Api-Version, User-Agent, Accept",
    "Access-Control-Max-Age": "86400",
  };

  // Manejar preflight OPTIONS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Solo permitir POST
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Método no permitido",
        details: "Solo se permite POST",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: "Cuerpo de solicitud inválido",
          details: "No se pudo parsear el JSON",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const { githubToken, action, filePath, data = {} } = body;

    // Validaciones
    if (!githubToken) {
      return new Response(
        JSON.stringify({ error: "Token de GitHub requerido" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    if (!action) {
      return new Response(JSON.stringify({ error: "Acción requerida" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Configurar URL base de GitHub
    const GITHUB_API_BASE = "https://api.github.com/repos/suarezfco65/nelly";
    let url;
    let options = {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Nelly-App",
      },
    };

    switch (action) {
      case "getFile":
        if (!filePath) {
          return new Response(
            JSON.stringify({ error: "filePath requerido para getFile" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
        url = `${GITHUB_API_BASE}/contents/${filePath}`;
        options.method = "GET";
        break;

      case "listDir":
        if (!filePath) {
          return new Response(
            JSON.stringify({ error: "filePath requerido para listDir" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
        const branch = data.branch || "main";
        url = `${GITHUB_API_BASE}/contents/${filePath}?ref=${branch}`;
        options.method = "GET";
        break;

      case "updateFile":
        if (!filePath) {
          return new Response(
            JSON.stringify({ error: "filePath requerido para updateFile" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
        url = `${GITHUB_API_BASE}/contents/${filePath}`;
        options.method = "PUT";
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
        break;

      case "deleteFile":
        if (!filePath) {
          return new Response(
            JSON.stringify({ error: "filePath requerido para deleteFile" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
        url = `${GITHUB_API_BASE}/contents/${filePath}`;
        options.method = "DELETE";
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
        break;

      case "testRepo":
        url = GITHUB_API_BASE;
        options.method = "GET";
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Acción no válida", action }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
    }

    console.log(`Proxy: ${action} -> ${url}`);

    // Realizar la solicitud a GitHub
    const response = await fetch(url, options);
    const responseData = await response.json();

    // Devolver respuesta al cliente
    return new Response(
      JSON.stringify({
        status: response.status,
        ok: response.ok,
        data: responseData,
      }),
      {
        status: response.ok ? 200 : response.status,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error en proxy:", error);
    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
}
