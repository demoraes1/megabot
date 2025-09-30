
const fs = require('fs');
const path = require('path');

const { getExtensionsRoot, readManifestData } = require('../common/extensions-utils');

const EXTENSIONS_DIR = getExtensionsRoot();
const SETTINGS_PATH = path.join(__dirname, '..', 'config', 'app-settings.json');
const manifestCache = new Map();

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

  const sanitized = value.replace(/[\/]+$/, '');
  const parts = sanitized.split(/[\/]/).filter(Boolean);
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

    const baseValue = rawPath || rawDirectory || folderFallback || nameFallback;
    if (!baseValue) {
      return null;
    }

    const directoryName = extractDirectoryName(rawDirectory || baseValue) || (rawDirectory || baseValue);

    return {
      id: entry.id || baseValue,
      name: entry.name || directoryName,
      directory: directoryName,
      path: rawPath || directoryName,
      enabled: entry.enabled !== false,
      description: entry.description || null,
    };
  }

  return null;
}

function applyManifestMetadata(entry) {
  const absolutePath = resolveEntryAbsolutePath(entry);
  if (!absolutePath) {
    return entry;
  }

  const manifest = getManifestData(absolutePath);
  if (!manifest) {
    return entry;
  }

  const enriched = { ...entry };
  if (manifest.name) {
    enriched.name = manifest.name;
  }
  if (manifest.description) {
    enriched.description = manifest.description;
  }

  return enriched;
}

function getManifestData(absolutePath) {
  if (!absolutePath) {
    return null;
  }

  if (manifestCache.has(absolutePath)) {
    return manifestCache.get(absolutePath);
  }

  const manifest = readManifestData(absolutePath);
  manifestCache.set(absolutePath, manifest);
  return manifest;
}

function listExtensions() {
  const settings = readSettings();
  const entries = Array.isArray(settings.extensions) ? settings.extensions : [];

  return entries
    .map(normalizeEntry)
    .filter(Boolean)
    .map(applyManifestMetadata);
}

function listEnabledExtensions() {
  return listExtensions().filter((extension) => extension.enabled !== false);
}

function listEnabledExtensionPaths() {
  const enabledExtensions = listEnabledExtensions();
  const paths = [];

  enabledExtensions.forEach((extension) => {
    const resolvedPath = resolveEntryAbsolutePath(extension);
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      paths.push(resolvedPath);
    }
  });

  return paths;
}

function buildAbsolutePath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    return null;
  }

  const normalized = path.normalize(relativePath).replace(/[\/]+$/, '');

  if (path.isAbsolute(normalized)) {
    return normalized;
  }

  const resolved = path.resolve(EXTENSIONS_DIR, normalized);
  if (!resolved.startsWith(path.resolve(EXTENSIONS_DIR))) {
    return null;
  }

  return resolved;
}

function resolveEntryAbsolutePath(entry) {
  if (!entry) {
    return null;
  }

  if (entry.path) {
    const resolvedFromPath = buildAbsolutePath(entry.path);
    if (resolvedFromPath) {
      return resolvedFromPath;
    }
  }

  if (entry.directory) {
    const resolvedFromDirectory = buildAbsolutePath(entry.directory);
    if (resolvedFromDirectory) {
      return resolvedFromDirectory;
    }
  }

  return null;
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
          console.warn('[ExtensionsManager] Falha ao inspecionar diretório de extensão:', entryPath, error.message);
          return false;
        }
      });
  } catch (error) {
    console.warn('[ExtensionsManager] Falha ao listar diretório de extensões:', error.message);
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
