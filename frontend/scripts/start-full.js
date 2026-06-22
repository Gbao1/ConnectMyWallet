/**
 * Starts the full local web stack:
 * - React (:3000)
 * - ConnectMyTask backend (:4000) when found — auth, tasks, contact, fraud admin, etc.
 *
 * Set BACKEND_SERVER_PATH to the backend server folder if auto-detect fails.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const webRoot = path.join(__dirname, '..');

const backendCandidates = [
  process.env.BACKEND_SERVER_PATH,
  path.join(webRoot, '..', 'backend', 'server'),
  path.join(webRoot, '..', 'ConnectMyTask', 'server'),
].filter(Boolean);

const backendPath = backendCandidates.find((p) =>
  fs.existsSync(path.join(p, 'package.json'))
);

function startProcess(label, command, cwd) {
  const child = spawn(command, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[start:full] ${label} exited with code ${code}`);
    }
  });
  return child;
}

const children = [startProcess('WEB', 'npm start', webRoot)];

if (backendPath) {
  children.push(startProcess('API', 'npm start', backendPath));
  console.log(`[start:full] Backend API: ${backendPath} → http://localhost:4000`);
} else {
  console.warn(
    '[start:full] Backend not found (auth/tasks need :4000).\n' +
      '  Clone ConnectMyTask next to this repo, or set BACKEND_SERVER_PATH to backend/server.\n' +
      '  Example: BACKEND_SERVER_PATH=../backend/server npm run start:full'
  );
}

console.log('[start:full] Web → http://localhost:3000 | API → http://localhost:4000 (when backend found)');

function shutdown() {
  children.forEach((c) => {
    try {
      c.kill();
    } catch {
      /* ignore */
    }
  });
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
