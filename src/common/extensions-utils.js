const fs = require('fs');
const path = require('path');

let cachedExtensionsDir = null;
const localeCache = new Map();

function getExtensionsRoot() {
  if (cachedExtensionsDir) {
    return cachedExtensionsDir;
  }

  try {
    const { app } = require('electron');
    if (app && typeof app.getPath === 'function') {
      const userData = app.getPath('userData');
      if (userData) {
        cachedExtensionsDir = path.join(userData, 'extensions');
        return cachedExtensionsDir;
      }
    }
  } catch (error) {
    // Ignorar - fallback tratado abaixo
  }

  cachedExtensionsDir = path.join(__dirname, '..', '..', 'extensions');
  return cachedExtensionsDir;
}

function readManifestData(manifestDir) {
  try {
    const manifestPath = path.join(manifestDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    const defaultLocale = manifest.default_locale;

    const name =
      resolveManifestValue(manifest.name, manifestDir, defaultLocale) ||
      resolveManifestValue(manifest.short_name, manifestDir, defaultLocale) ||
      null;

    const description =
      resolveManifestValue(manifest.description, manifestDir, defaultLocale) || null;

    return { name, description };
  } catch (error) {
    console.warn('[ExtensionsUtils] Falha ao ler manifest.json:', error.message);
    return null;
  }
}

function resolveManifestValue(value, manifestDir, defaultLocale) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const match = trimmedValue.match(/^__MSG_([A-Za-z0-9_@.\-]+)__$/);
  if (!match) {
    return trimmedValue;
  }

  const key = match[1];
  const localesToTry = buildLocalesPriority(manifestDir, defaultLocale);

  for (const locale of localesToTry) {
    const message = loadLocaleMessage(manifestDir, locale, key);
    if (message) {
      return message;
    }
  }

  return null;
}

function buildLocalesPriority(manifestDir, defaultLocale) {
  const locales = [];
  const seen = new Set();

  function pushLocale(locale) {
    if (!locale) {
      return;
    }
    if (!seen.has(locale)) {
      locales.push(locale);
      seen.add(locale);
    }
  }

  const normalizeVariants = (locale) => {
    if (!locale) {
      return [];
    }
    const variants = new Set([locale]);
    variants.add(locale.replace('-', '_'));
    variants.add(locale.replace('_', '-'));
    variants.add(locale.toLowerCase());
    variants.add(locale.toUpperCase());
    return Array.from(variants).filter(Boolean);
  };

  if (defaultLocale) {
    normalizeVariants(defaultLocale).forEach(pushLocale);
  }

  const localesDir = path.join(manifestDir, '_locales');
  if (fs.existsSync(localesDir)) {
    try {
      const available = fs.readdirSync(localesDir, { withFileTypes: true });
      available
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .forEach((localeName) => {
          normalizeVariants(localeName).forEach(pushLocale);
        });
    } catch (error) {
      console.warn('[ExtensionsUtils] Falha ao listar diretórios de _locales:', error.message);
    }
  }

  ['pt_BR', 'pt-BR', 'pt', 'en_US', 'en-US', 'en', 'es'].forEach(pushLocale);

  return locales;
}

function loadLocaleMessage(manifestDir, locale, key) {
  const safeLocale = locale.replace(/\./g, '-');
  const messagesPath = path.join(manifestDir, '_locales', safeLocale, 'messages.json');
  if (!fs.existsSync(messagesPath)) {
    return null;
  }

  const cacheKey = `${messagesPath}`;
  let localeMessages = localeCache.get(cacheKey);
  if (!localeMessages) {
    try {
      const rawContent = fs.readFileSync(messagesPath, 'utf8');
      localeMessages = JSON.parse(rawContent);
      localeCache.set(cacheKey, localeMessages);
    } catch (error) {
      console.warn('[ExtensionsUtils] Falha ao analisar mensagens de locale:', error.message);
      return null;
    }
  }

  const variants = [key, key.toLowerCase(), key.toUpperCase()];
  for (const variant of variants) {
    const messageEntry = localeMessages?.[variant];
    const message = typeof messageEntry === 'object' ? messageEntry?.message : messageEntry;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  return null;
}

module.exports = {
  getExtensionsRoot,
  readManifestData,
};
