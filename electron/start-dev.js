const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);

    socket.once('connect', () => {
      socket.destroy();
      resolve(true); // Port is active and listening
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, 'localhost');
  });
}

function waitForPort(port, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      const active = await isPortInUse(port);
      if (active) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Timed out waiting for port ${port}`));
      }
    }, 400);
  });
}

async function start() {
  const spawnedProcesses = [];

  const cleanup = () => {
    spawnedProcesses.forEach((proc) => {
      try {
        proc.kill('SIGTERM');
      } catch (e) {
        // Ignore
      }
    });
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  // 1. Check or start Server (Port 3001)
  const isServerRunning = await isPortInUse(3001);
  if (isServerRunning) {
    console.log('[Electron Dev Launcher] Storage backend already running on port 3001.');
  } else {
    console.log('[Electron Dev Launcher] Starting storage backend on port 3001...');
    const serverProc = spawn(process.execPath, [path.join(__dirname, '../server/server.js')], {
      stdio: 'inherit',
      shell: true,
    });
    spawnedProcesses.push(serverProc);
  }

  // 2. Check or start Vite Frontend (Port 5173)
  const isViteRunning = await isPortInUse(5173);
  if (isViteRunning) {
    console.log('[Electron Dev Launcher] Vite dev server already running on port 5173.');
  } else {
    console.log('[Electron Dev Launcher] Starting Vite dev server...');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const viteProc = spawn(npxCmd, ['vite'], {
      stdio: 'inherit',
      shell: true,
    });
    spawnedProcesses.push(viteProc);
    console.log('[Electron Dev Launcher] Waiting for Vite to initialize on port 5173...');
    await waitForPort(5173);
  }

  // 3. Launch Electron Desktop Window
  console.log('[Electron Dev Launcher] Launching Electron window...');
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const electronProc = spawn(npxCmd, ['electron', '.'], {
    stdio: 'inherit',
    shell: true,
  });

  electronProc.on('close', (code) => {
    console.log(`[Electron Dev Launcher] Electron window closed (code ${code}).`);
    cleanup();
    process.exit(code || 0);
  });
}

start().catch((err) => {
  console.error('[Electron Dev Launcher Error]:', err);
  process.exit(1);
});
