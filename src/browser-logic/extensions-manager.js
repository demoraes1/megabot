const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const EXTENSIONS_DIR = path.join(ROOT_DIR, 'extensions');
const SETTINGS_PATH = path.join(__dirname, '..', 'config', 'app-settings.json');

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return {};
    }

    const fileContent = fs.readFileSync(SETTINGS_PATH, 'utf8');
    if (!fileContent.trim()) {
      return {};
    }

    return JSON.parse(fileContent);
  } catch (error) {
    console.warn('[ExtensionsManager] Falha ao ler app-settings:', error.message);
    return {};
  }
}

function extractDirectoryName(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const sanitized = value.replace(/[\\/]+$/, '');
  const parts = sanitized.split(/[/\\]/).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  return parts[parts.length - 1];
}

function normalizeEntry(entry) {
  if (!entry) {
    return null;
  }

  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    if (!trimmed) {
      return null;
    }

    const directoryName = extractDirectoryName(trimmed) || trimmed;
    return {
      id: trimmed,
      name: directoryName,
      directory: directoryName,
      path: trimmed,
      enabled: true,
      description: null,
    };
  }

  if (typeof entry === 'object') {
    const rawPath = typeof entry.path === 'string' && entry.path.trim() ? entry.path.trim() : null;
    const rawDirectory = typeof entry.directory === 'string' && entry.directory.trim() ? entry.directory.trim() : null;
    const folderFallback = typeof entry.folder === 'string' && entry.folder.trim() ? entry.folder.trim() : null;
    const nameFallback = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : null;

    const baseValue = rawDirectory || folderFallback || nameFallback || rawPath;
    if (!baseValue) {
      return null;
    }

    const directoryName = extractDirectoryName(rawDirectory || baseValue) || (rawDirectory || baseValue);

    return {
      id: entry.id || rawPath || baseValue,
      name: entry.name || directoryName,
      directory: directoryName,
      path: rawPath || baseValue,
      enabled: entry.enabled !== false,
      description: entry.description || null,
    };
  }

  return null;
}

function listExtensions() {
  const settings = readSettings();
  const entries = Array.isArray(settings.extensions) ? settings.extensions : [];
  return entries
    .map(normalizeEntry)
    .filter(Boolean);
}

function buildAbsolutePath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    return null;
  }

  const normalized = path.normalize(relativePath).replace(/[\\/]+$/, '');

  if (path.isAbsolute(normalized)) {
    return normalized;
  }

  const resolved = path.resolve(EXTENSIONS_DIR, normalized);
  if (!resolved.startsWith(EXTENSIONS_DIR)) {
    return null;
  }

  return resolved;
}

function resolveEntryPath(entry) {
  if (!entry) {
    return null;
  }

  if (entry.path) {
    if (path.isAbsolute(entry.path)) {
      return entry.path;
    }

    const resolved = buildAbsolutePath(entry.path);
    if (resolved) {
      return resolved;
    }
  }

  if (entry.directory) {
    if (path.isAbsolute(entry.directory)) {
      return entry.directory;
    }

    const resolved = buildAbsolutePath(entry.directory);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function listEnabledExtensions() {
  return listExtensions().filter((extension) => extension.enabled !== false);
}

function listEnabledExtensionPaths() {
  const enabledExtensions = listEnabledExtensions();
  const paths = [];

  enabledExtensions.forEach((extension) => {
    const resolvedPath = resolveEntryPath(extension);
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      paths.push(resolvedPath);
    }
  });

  return paths;
}

function listLocalExtensionDirectories() {
  if (!fs.existsSync(EXTENSIONS_DIR)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(EXTENSIONS_DIR);
    return entries
      .map((entryName) => path.join(EXTENSIONS_DIR, entryName))
      .filter((entryPath) => {
        try {
          const stats = fs.statSync(entryPath);
          if (!stats.isDirectory()) {
            return false;
          }
          return fs.existsSync(path.join(entryPath, 'manifest.json'));
        } catch (error) {
          console.warn('[ExtensionsManager] Falha ao inspecionar diretorio de extensao:', entryPath, error.message);
          return false;
        }
      });
  } catch (error) {
    console.warn('[ExtensionsManager] Falha ao listar diretorio de extensoes:', error.message);
    return [];
  }
}

module.exports = {
  EXTENSIONS_DIR,
  SETTINGS_PATH,
  listExtensions,
  listEnabledExtensions,
  listEnabledExtensionPaths,
  listLocalExtensionDirectories,
};
