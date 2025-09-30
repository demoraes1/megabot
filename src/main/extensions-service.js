const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { EXTENSIONS_DIR } = require('../browser-logic/extensions-manager');

function ensureExtensionsDirectory() {
  if (!fs.existsSync(EXTENSIONS_DIR)) {
    fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });
  }
}

function readManifestData(sourceDir) {
  try {
    const manifestPath = path.join(sourceDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    const rawContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(rawContent);
    return {
      name: normalizeManifestValue(manifest.name),
      description: normalizeManifestValue(manifest.description),
    };
  } catch (error) {
    console.warn('[ExtensionsService] Falha ao ler manifest.json:', error.message);
    return null;
  }
}

function normalizeManifestValue(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  if (/^__MSG_.*__$/.test(value)) {
    return null;
  }

  return value.trim() || null;
}

function slugify(value) {
  if (!value || typeof value !== 'string') {
    return 'extension';
  }

  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'extension';
}

function createUniqueFolderName(baseName) {
  const slug = slugify(baseName);
  let candidate = slug;
  let counter = 1;

  while (fs.existsSync(path.join(EXTENSIONS_DIR, candidate))) {
    counter += 1;
    candidate = `${slug}-${counter}`;
  }

  return candidate;
}

async function copyDirectory(sourceDir, targetDir) {
  const entries = await fs.promises.readdir(sourceDir, { withFileTypes: true });
  await fs.promises.mkdir(targetDir, { recursive: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else if (entry.isSymbolicLink()) {
      try {
        const linkTarget = await fs.promises.readlink(sourcePath);
        await fs.promises.symlink(linkTarget, targetPath);
      } catch (error) {
        await fs.promises.copyFile(sourcePath, targetPath);
      }
    } else {
      await fs.promises.copyFile(sourcePath, targetPath);
    }
  }
}

function isInsideExtensionsDir(sourcePath) {
  const normalizedSource = path.resolve(sourcePath);
  return normalizedSource.startsWith(path.resolve(EXTENSIONS_DIR));
}

async function importExtensionFolder(sourcePath) {
  if (!sourcePath || typeof sourcePath !== 'string') {
    throw new Error('Caminho de extensao invalido');
  }

  const resolvedSource = path.resolve(sourcePath);
  if (!fs.existsSync(resolvedSource)) {
    throw new Error('Pasta de extensao nao encontrada');
  }

  const stats = fs.statSync(resolvedSource);
  if (!stats.isDirectory()) {
    throw new Error('Selecione uma pasta de extensao valida');
  }

  ensureExtensionsDirectory();

  if (isInsideExtensionsDir(resolvedSource)) {
    const manifest = readManifestData(resolvedSource);
    return buildExtensionEntry(manifest, path.basename(resolvedSource), null);
  }

  const manifest = readManifestData(resolvedSource);
  const baseName = manifest?.name || path.basename(resolvedSource);
  const folderName = createUniqueFolderName(baseName);
  const targetDir = path.join(EXTENSIONS_DIR, folderName);

  await copyDirectory(resolvedSource, targetDir);

  return buildExtensionEntry(manifest, folderName, folderName);
}

function buildExtensionEntry(manifest, directoryName, pathName) {
  const manifestName = manifest?.name || directoryName;
  const description = manifest?.description || null;

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `extension-${Date.now()}`,
    name: manifestName,
    description,
    directory: directoryName,
    path: pathName || directoryName,
    enabled: true,
  };
}

module.exports = {
  ensureExtensionsDirectory,
  importExtensionFolder,
};
