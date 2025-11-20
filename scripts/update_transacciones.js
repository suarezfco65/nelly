#!/usr/bin/env node
/**
 * scripts/update_transacciones.js
 *
 * Uso:
 *   GITHUB_TOKEN=ghp_xxx node scripts/update_transacciones.js --file ./transacciones.json --owner suarezfco65 --repo nelly --branch main --path json/transacciones.json --message "Update transacciones"
 *
 * Requisitos: Node.js 18+ (o cualquier Node con fetch disponible). El script toma el token desde la variable de entorno GITHUB_TOKEN.
 *
 * Comportamiento:
 * - Si json/transacciones.json existe en la rama indicada obtiene su sha y actualiza el archivo (PUT con sha).
 * - Si no existe lo crea (PUT sin sha).
 *
 * Seguridad: No pongas el token en el código. Usa variables de entorno o un secret manager.
 */

const fs = require('fs');
const path = require('path');
const process = require('process');

const args = require('minimist')(process.argv.slice(2), {
  string: ['file', 'owner', 'repo', 'branch', 'path', 'message'],
  alias: { f: 'file', o: 'owner', r: 'repo', b: 'branch', p: 'path', m: 'message' },
  default: {
    file: './transacciones.json',
    owner: 'suarezfco65',
    repo: 'nelly',
    branch: 'main',
    path: 'json/transacciones.json',
    message: 'Actualizar transacciones.json'
  }
});

async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    console.error('Error: Debes exportar tu token en GITHUB_TOKEN. Ejemplo: export GITHUB_TOKEN=ghp_xxx');
    process.exit(1);
  }

  const localFile = path.resolve(args.file);
  if (!fs.existsSync(localFile)) {
    console.error('Error: archivo local no encontrado:', localFile);
    process.exit(1);
  }
  const content = fs.readFileSync(localFile, 'utf8');
  // Validar JSON
  try { JSON.parse(content); } catch (e) {
    console.error('Error: el archivo local no es JSON válido:', e.message);
    process.exit(1);
  }

  const owner = args.owner;
  const repo = args.repo;
  const branch = args.branch;
  const targetPath = args.path;
  const message = args.message;

  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath)}`;

  // Headers
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': `${owner}-${repo}-update-script`
  };

  // Comprueba si el archivo existe (obtener sha)
  let sha;
  try {
    const url = `${apiBase}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, { method: 'GET', headers });
    if (res.status === 200) {
      const body = await res.json();
      sha = body.sha;
      console.log('Archivo existente encontrado en repo. SHA:', sha);
    } else if (res.status === 404) {
      console.log('Archivo no encontrado en repo; se creará nuevo archivo.');
    } else {
      const txt = await res.text();
      console.error('Error al consultar archivo remoto:', res.status, txt);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error de red al consultar el archivo remoto:', err.message);
    process.exit(1);
  }

  const b64 = Buffer.from(content, 'utf8').toString('base64');
  const body = {
    message,
    content: b64,
    branch
  };
  if (sha) body.sha = sha;

  // PUT para crear/actualizar
  try {
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const putJson = await putRes.json();
    if (putRes.ok) {
      console.log('Archivo creado/actualizado correctamente en', `${owner}/${repo}@${branch}:${targetPath}`);
      console.log('Commit:', putJson.commit && putJson.commit.html_url ? putJson.commit.html_url : putJson.commit);
    } else {
      console.error('Error al crear/actualizar el archivo:', putRes.status, JSON.stringify(putJson, null, 2));
      process.exit(1);
    }
  } catch (err) {
    console.error('Error en la petición PUT:', err.message);
    process.exit(1);
  }
}

main();
