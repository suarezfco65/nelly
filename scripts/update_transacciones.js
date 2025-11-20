#!/usr/bin/env node
// scripts/update_transacciones.js
// Uso:
//   GITHUB_TOKEN=ghp_xxx node scripts/update_transacciones.js --file ./transacciones.json --owner suarezfco65 --repo nelly --branch main --path json/transacciones.json --message "Actualizar transacciones"
// Requiere: node + npm install minimist (o instalar globalmente)

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
  const token = process.env.GITHUB_TOKEN;
  if (!token) { console.error('Exporta GITHUB_TOKEN con un PAT classic.'); process.exit(1); }

  const localFile = path.resolve(args.file);
  if (!fs.existsSync(localFile)) { console.error('Archivo local no encontrado:', localFile); process.exit(1); }
  const content = fs.readFileSync(localFile, 'utf8');
  try { JSON.parse(content); } catch(e) { console.error('JSON inválido:', e.message); process.exit(1); }

  const owner = args.owner, repo = args.repo, branch = args.branch, targetPath = args.path, message = args.message;
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath)}`;
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': `${owner}-${repo}-update-script`
  };

  // Obtener sha si existe
  let sha;
  try {
    const url = `${apiBase}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, { method: 'GET', headers });
    if (res.status === 200) {
      const body = await res.json();
      sha = body.sha;
      console.log('Archivo existente. SHA:', sha);
    } else if (res.status === 404) {
      console.log('Archivo no existe en el repo; se creará uno nuevo.');
    } else {
      const txt = await res.text();
      console.error('Error al consultar archivo remoto:', res.status, txt);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error red al consultar archivo remoto:', err.message);
    process.exit(1);
  }

  const b64 = Buffer.from(content, 'utf8').toString('base64');
  const body = { message, content: b64, branch };
  if (sha) body.sha = sha;

  try {
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const putJson = await putRes.json();
    if (putRes.ok) {
      console.log('Archivo creado/actualizado en', `${owner}/${repo}@${branch}:${targetPath}`);
      if (putJson.commit && putJson.commit.html_url) console.log('Commit:', putJson.commit.html_url);
    } else {
      console.error('Error al crear/actualizar:', putRes.status, JSON.stringify(putJson, null, 2));
      process.exit(1);
    }
  } catch (err) {
    console.error('Error en petición PUT:', err.message);
    process.exit(1);
  }
}

main();
