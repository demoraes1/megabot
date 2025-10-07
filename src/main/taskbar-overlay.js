const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { app } = require('electron');
const { windowManager } = require('node-window-manager');

const OVERLAY_ICON_SIZE = 32;
const ICON_VERSION = 'v2';
const DIGIT_HEIGHT = 7;
const DIGIT_WIDTH = 5;
const DIGIT_SPACING = 1;
const ICON_MARGIN = 4;
const APPLY_TIMEOUT_MS = 10000;
const APPLY_POLL_INTERVAL_MS = 200;

const DIGIT_PATTERNS = {
  '0': [
    ' ### ',
    '#   #',
    '#  ##',
    '# # #',
    '##  #',
    '#   #',
    ' ### ',
  ],
  '1': [
    '  #  ',
    ' ##  ',
    '# #  ',
    '  #  ',
    '  #  ',
    '  #  ',
    '#####',
  ],
  '2': [
    ' ### ',
    '#   #',
    '    #',
    '  ## ',
    ' #   ',
    '#    ',
    '#####',
  ],
  '3': [
    ' ### ',
    '#   #',
    '    #',
    ' ### ',
    '    #',
    '#   #',
    ' ### ',
  ],
  '4': [
    '   # ',
    '  ## ',
    ' # # ',
    '#  # ',
    '#####',
    '   # ',
    '   # ',
  ],
  '5': [
    '#####',
    '#    ',
    '#    ',
    '#### ',
    '    #',
    '#   #',
    ' ### ',
  ],
  '6': [
    ' ### ',
    '#   #',
    '#    ',
    '#### ',
    '#   #',
    '#   #',
    ' ### ',
  ],
  '7': [
    '#####',
    '    #',
    '   # ',
    '  #  ',
    ' #   ',
    '#    ',
    '#    ',
  ],
  '8': [
    ' ### ',
    '#   #',
    '#   #',
    ' ### ',
    '#   #',
    '#   #',
    ' ### ',
  ],
  '9': [
    ' ### ',
    '#   #',
    '#   #',
    ' ####',
    '    #',
    '#   #',
    ' ### ',
  ],
  '+': [
    '     ',
    '  #  ',
    '  #  ',
    '#####',
    '  #  ',
    '  #  ',
    '     ',
  ],
  '-': [
    '     ',
    '     ',
    '     ',
    '#####',
    '     ',
    '     ',
    '     ',
  ],
  '?': [
    ' ### ',
    '#   #',
    '   ##',
    '  ## ',
    '  #  ',
    '     ',
    '  #  ',
  ],
};

const overlayCache = new Map(); // navigatorId -> { hwnd, iconPath }
const pendingOperations = new Map();
let overlaysDirPath = null;
let overlayExecutableMissingLogged = false;

function isSupported() {
  return process.platform === 'win32';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getOverlayExecutablePath() {
  return path.join(__dirname, '..', 'resources', 'TaskbarOverlay.exe');
}

function ensureOverlaysDirectory() {
  if (overlaysDirPath) {
    return overlaysDirPath;
  }

  const userData = app.getPath('userData');
  const dir = path.join(userData, 'taskbar-overlays');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  overlaysDirPath = dir;
  return dir;
}

function sanitizeLabel(label) {
  const str = String(label ?? '').trim() || '0';
  const cleaned = str.replace(/[^0-9a-zA-Z\+\-]/g, '_');
  return cleaned.slice(0, 24);
}

function buildVirtualGrid(text) {
  const chars = Array.from(text);
  const patterns = chars.map((char) => DIGIT_PATTERNS[char] || DIGIT_PATTERNS['?']);

  const height = DIGIT_HEIGHT;
  const width =
    patterns.reduce((acc, pattern, index) => {
      const base = acc + DIGIT_WIDTH;
      if (index < patterns.length - 1) {
        return base + DIGIT_SPACING;
      }
      return base;
    }, 0) || DIGIT_WIDTH;

  const grid = Array.from({ length: height }, () => Array(width).fill(false));

  let xOffset = 0;
  for (let glyphIndex = 0; glyphIndex < patterns.length; glyphIndex += 1) {
    const pattern = patterns[glyphIndex];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < DIGIT_WIDTH; x += 1) {
        const row = pattern[y] || '';
        if (row[x] === '#') {
          grid[y][xOffset + x] = true;
        }
      }
    }
    xOffset += DIGIT_WIDTH;
    if (glyphIndex < patterns.length - 1) {
      xOffset += DIGIT_SPACING;
    }
  }

  return { grid, width, height };
}

function createPixelBuffer() {
  return Buffer.alloc(OVERLAY_ICON_SIZE * OVERLAY_ICON_SIZE * 4);
}

function setPixel(buffer, width, x, y, color) {
  if (x < 0 || x >= width || y < 0 || y >= OVERLAY_ICON_SIZE) {
    return;
  }

  const invertedY = (OVERLAY_ICON_SIZE - 1) - y;
  const offset = (invertedY * width + x) * 4;
  buffer[offset] = color.b;
  buffer[offset + 1] = color.g;
  buffer[offset + 2] = color.r;
  buffer[offset + 3] = color.a;
}

function paintRectangle(buffer, width, xStart, yStart, xEndExclusive, yEndExclusive, color) {
  for (let y = yStart; y < yEndExclusive; y += 1) {
    for (let x = xStart; x < xEndExclusive; x += 1) {
      setPixel(buffer, width, x, y, color);
    }
  }
}

function createDigitIcon(label) {
  const text = String(label ?? '').trim() || '0';
  const { grid, width, height } = buildVirtualGrid(text);

  const availableWidth = OVERLAY_ICON_SIZE - (ICON_MARGIN * 2);
  const availableHeight = OVERLAY_ICON_SIZE - (ICON_MARGIN * 2);

  const scaleX = availableWidth / width;
  const scaleY = availableHeight / height;
  const scale = Math.max(Math.min(scaleX, scaleY), 1);

  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  const offsetX = Math.round((OVERLAY_ICON_SIZE - scaledWidth) / 2);
  const offsetY = Math.round((OVERLAY_ICON_SIZE - scaledHeight) / 2);

  const buffer = createPixelBuffer();

  const textColor = { r: 255, g: 255, b: 255, a: 255 };
  const shadowColor = { r: 15, g: 23, b: 42, a: 180 };
  const circleColor = { r: 59, g: 130, b: 246, a: 255 };
  const ringColor = { r: 29, g: 78, b: 216, a: 255 };

  const center = (OVERLAY_ICON_SIZE - 1) / 2;
  const radius = (OVERLAY_ICON_SIZE / 2) - 2;
  const innerRadius = radius - 1.5;

  for (let y = 0; y < OVERLAY_ICON_SIZE; y += 1) {
    for (let x = 0; x < OVERLAY_ICON_SIZE; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt((dx * dx) + (dy * dy));

      if (distance <= radius) {
        const color = distance >= innerRadius ? ringColor : circleColor;
        setPixel(buffer, OVERLAY_ICON_SIZE, x, y, color);
      }
    }
  }

  const paintGlyph = (color, dx = 0, dy = 0) => {
    for (let gy = 0; gy < height; gy += 1) {
      for (let gx = 0; gx < width; gx += 1) {
        if (!grid[gy][gx]) {
          continue;
        }

        const startX = Math.max(Math.round(offsetX + gx * scale + dx), 0);
        const endX = Math.max(Math.round(offsetX + ((gx + 1) * scale) + dx), startX + 1);
        const startY = Math.max(Math.round(offsetY + gy * scale + dy), 0);
        const endY = Math.max(Math.round(offsetY + ((gy + 1) * scale) + dy), startY + 1);

        paintRectangle(buffer, OVERLAY_ICON_SIZE, startX, startY, endX, endY, color);
      }
    }
  };

  paintGlyph(shadowColor, 1, 1);
  paintGlyph(textColor, 0, 0);

  return buffer;
}

function buildIconFile(buffer) {
  const width = OVERLAY_ICON_SIZE;
  const height = OVERLAY_ICON_SIZE;
  const xorSize = width * height * 4;
  const andRowSize = Math.ceil(width / 32) * 4;
  const andSize = andRowSize * height;
  const bitmapHeaderSize = 40;
  const imageSize = bitmapHeaderSize + xorSize + andSize;
  const offset = 6 + 16;

  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0);
  iconDir.writeUInt16LE(1, 2);
  iconDir.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = width === 256 ? 0 : width;
  entry[1] = height === 256 ? 0 : height;
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(imageSize, 8);
  entry.writeUInt32LE(offset, 12);

  const bitmapInfoHeader = Buffer.alloc(bitmapHeaderSize);
  bitmapInfoHeader.writeUInt32LE(bitmapHeaderSize, 0);
  bitmapInfoHeader.writeInt32LE(width, 4);
  bitmapInfoHeader.writeInt32LE(height * 2, 8);
  bitmapInfoHeader.writeUInt16LE(1, 12);
  bitmapInfoHeader.writeUInt16LE(32, 14);
  bitmapInfoHeader.writeUInt32LE(0, 16);
  bitmapInfoHeader.writeUInt32LE(xorSize, 20);
  bitmapInfoHeader.writeInt32LE(0, 24);
  bitmapInfoHeader.writeInt32LE(0, 28);
  bitmapInfoHeader.writeUInt32LE(0, 32);
  bitmapInfoHeader.writeUInt32LE(0, 36);

  const andMask = Buffer.alloc(andSize);

  return Buffer.concat([iconDir, entry, bitmapInfoHeader, buffer, andMask]);
}

function ensureIconFile(label) {
  const dir = ensureOverlaysDirectory();
  const sanitized = sanitizeLabel(label);
  const iconPath = path.join(dir, `overlay-${ICON_VERSION}-${sanitized}.ico`);

  if (fs.existsSync(iconPath)) {
    return iconPath;
  }

  const bitmap = createDigitIcon(label);
  const icoBuffer = buildIconFile(bitmap);
  fs.writeFileSync(iconPath, icoBuffer);
  return iconPath;
}

function findWindowHandle(navigatorId, browserPid) {
  const targetTitle = `Navegador_ID_${navigatorId}`;
  const windows = windowManager.getWindows();

  let pidMatchHandle = null;

  for (const win of windows) {
    let title = '';
    try {
      title = win.getTitle() || '';
    } catch (error) {
      continue;
    }

    if (title.includes(targetTitle)) {
      return win.id;
    }

    if (browserPid && typeof win.getProcessId === 'function') {
      const pid = win.getProcessId();
      if (pid === browserPid) {
      pidMatchHandle = win.id;
      }
    }
  }

  return pidMatchHandle;
}

async function waitForWindowHandle(navigatorId, browserPid, timeoutMs, pollInterval) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const handle = findWindowHandle(navigatorId, browserPid);
    if (handle) {
      return handle;
    }
    await delay(pollInterval);
  }
  return null;
}

function normalizeHandleForProcess(handle) {
  if (handle == null) {
    return null;
  }

  if (typeof handle === 'string') {
    return handle;
  }

  if (typeof handle === 'number') {
    return handle.toString();
  }

  if (typeof handle === 'bigint') {
    return handle.toString();
  }

  return String(handle);
}

function runTaskbarOverlayExecutable(hwnd, argument) {
  const executablePath = getOverlayExecutablePath();

  if (!fs.existsSync(executablePath)) {
    if (!overlayExecutableMissingLogged) {
      overlayExecutableMissingLogged = true;
      console.warn('[TaskbarOverlay] Executável TaskbarOverlay.exe não encontrado:', executablePath);
    }
    return Promise.reject(new Error('TaskbarOverlay.exe não encontrado'));
  }

  return new Promise((resolve, reject) => {
    const child = spawn(executablePath, [String(hwnd), argument], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `TaskbarOverlay.exe finalizou com código ${code}`));
      }
    });
  });
}

function enqueueOperation(navigatorId, operation) {
  if (pendingOperations.has(navigatorId)) {
    return pendingOperations.get(navigatorId);
  }

  const promise = (async () => {
    try {
      return await operation();
    } finally {
      pendingOperations.delete(navigatorId);
    }
  })();

  pendingOperations.set(navigatorId, promise);
  return promise;
}

async function applyOverlayForNavigator({ navigatorId, browserPid = null, hwnd = null, label = null } = {}) {
  if (!isSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  if (navigatorId === undefined || navigatorId === null) {
    throw new Error('navigatorId é obrigatório para aplicar overlay na taskbar');
  }

  return enqueueOperation(navigatorId, async () => {
    const iconLabel = label ?? navigatorId;
    const iconPath = ensureIconFile(iconLabel);

    const normalizedHandle = normalizeHandleForProcess(
      hwnd ?? await waitForWindowHandle(navigatorId, browserPid, APPLY_TIMEOUT_MS, APPLY_POLL_INTERVAL_MS),
    );

    if (!normalizedHandle) {
      throw new Error('Janela do navegador não encontrada para aplicar overlay');
    }

    await runTaskbarOverlayExecutable(normalizedHandle, iconPath);
    const result = { success: true, hwnd: normalizedHandle, iconPath };
    console.info(`[TaskbarOverlay] Overlay aplicado (navigatorId=${navigatorId}, hwnd=${normalizedHandle}, icon=${iconPath})`);
    overlayCache.set(navigatorId, result);
    return result;
  });
}

async function clearOverlayByHandle(hwnd) {
  if (!isSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  if (!hwnd) {
    return { success: false, reason: 'invalid-hwnd' };
  }

  const normalizedHandle = normalizeHandleForProcess(hwnd);
  await runTaskbarOverlayExecutable(normalizedHandle, 'clear');
  console.info(`[TaskbarOverlay] Overlay limpo (hwnd=${normalizedHandle})`);
  return { success: true };
}

async function clearOverlayForNavigator(navigatorId, browserPid = null) {
  if (!isSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  if (navigatorId === undefined || navigatorId === null) {
    return { success: false, reason: 'invalid-navigator' };
  }

  const cached = overlayCache.get(navigatorId);
  let hwnd = cached?.hwnd;

  if (!hwnd) {
    hwnd = normalizeHandleForProcess(
      await waitForWindowHandle(navigatorId, browserPid, APPLY_TIMEOUT_MS / 2, APPLY_POLL_INTERVAL_MS),
    );
  }

  if (!hwnd) {
    overlayCache.delete(navigatorId);
    return { success: false, reason: 'window-not-found' };
  }

  try {
    await runTaskbarOverlayExecutable(hwnd, 'clear');
    console.info(`[TaskbarOverlay] Overlay limpo (navigatorId=${navigatorId}, hwnd=${hwnd})`);
  } finally {
    overlayCache.delete(navigatorId);
  }

  return { success: true };
}

function forgetNavigatorOverlay(navigatorId) {
  overlayCache.delete(navigatorId);
}

module.exports = {
  isSupported,
  applyOverlayForNavigator,
  clearOverlayByHandle,
  clearOverlayForNavigator,
  forgetNavigatorOverlay,
};
