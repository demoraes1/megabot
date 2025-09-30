
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { getExtensionsRoot, readManifestData } = require('../common/extensions-utils');

const EXTENSIONS_DIR = getExtensionsRoot();

function ensureExtensionsDirectory() {
  if (!fs.existsSync(EXTENSIONS_DIR)) {
    fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });
  }
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

  const manifestFromSource = readManifestData(resolvedSource);
  const baseName = manifestFromSource?.name || path.basename(resolvedSource);
  const folderName = createUniqueFolderName(baseName);
  const targetDir = path.join(EXTENSIONS_DIR, folderName);

  await copyDirectory(resolvedSource, targetDir);

  const manifest = readManifestData(targetDir) || manifestFromSource;

  return buildExtensionEntry(manifest, folderName, folderName);
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

function buildExtensionEntry(manifest, directoryName, pathName) {
  const displayName = manifest?.name || directoryName;
  const description = manifest?.description || null;

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `extension-${Date.now()}`,
    name: displayName,
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
