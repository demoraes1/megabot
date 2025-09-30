import { showNotification } from '../ui/notifications.js';
import { debouncedSave } from '../settings/autosave.js';

const EXTENSIONS_LIST_ID = 'extensions-list';
const EXTENSIONS_COUNTER_ID = 'extension-counter-text';
const extensionsState = [];
let listElement = null;
let counterElement = null;
let eventsAttached = false;

function ensureElements() {
  if (!listElement) {
    listElement = document.getElementById(EXTENSIONS_LIST_ID);
    if (listElement && !eventsAttached) {
      listElement.addEventListener('change', handleListChange, true);
      listElement.addEventListener('click', handleListClick, true);
      eventsAttached = true;
    }
  }

  if (!counterElement) {
    counterElement = document.getElementById(EXTENSIONS_COUNTER_ID);
  }
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `extension-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function extractDirectoryName(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') {
    return null;
  }

  const sanitized = rawValue.replace(/[\\/]+$/, '');
  const segments = sanitized.split(/[/\\]/).filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  return segments[segments.length - 1];
}

function extractFolderPathFromFile(file) {
  if (!file) {
    return null;
  }

  if (typeof file.path === 'string' && file.path.trim()) {
    const cleaned = file.path.trim().replace(/[\\/]+$/, '');
    const separatorIndex = Math.max(cleaned.lastIndexOf('\\'), cleaned.lastIndexOf('/'));
    if (separatorIndex > 0) {
      return cleaned.slice(0, separatorIndex);
    }
    return cleaned;
  }

  if (typeof file.webkitRelativePath === 'string' && file.webkitRelativePath.trim()) {
    const relative = file.webkitRelativePath.trim().replace(/[\\]+/g, '/');
    const firstSlash = relative.indexOf('/');
    if (firstSlash > 0) {
      return relative.slice(0, firstSlash);
    }
    return relative;
  }

  return null;
}

function normalizeExtension(entry) {
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
    const fallbackSource =
      (typeof entry.directory === 'string' && entry.directory.trim()) ||
      (typeof entry.folder === 'string' && entry.folder.trim()) ||
      (typeof entry.name === 'string' && entry.name.trim()) ||
      null;

    const resolvedPath = rawPath || fallbackSource;
    if (!resolvedPath) {
      return null;
    }

    const directoryReference =
      (typeof entry.directory === 'string' && entry.directory.trim()) || resolvedPath;
    const directoryName = extractDirectoryName(directoryReference) || directoryReference;

    return {
      id: entry.id || resolvedPath || generateId(),
      name: entry.name || directoryName,
      directory: directoryName,
      path: resolvedPath,
      enabled: entry.enabled !== false,
      description: entry.description || null,
    };
  }

  return null;
}

function syncState(newEntries = []) {
  extensionsState.length = 0;
  newEntries.forEach((entry) => {
    const normalized = normalizeExtension(entry);
    if (!normalized) {
      return;
    }

    if (!normalized.id) {
      normalized.id = generateId();
    }

    extensionsState.push(normalized);
  });
}

function setExtensions(extensions = []) {
  ensureElements();
  syncState(extensions);
  renderExtensions();
}

function getExtensions() {
  return extensionsState.map((extension) => ({
    id: extension.id,
    name: extension.name,
    directory: extension.directory,
    path: extension.path,
    enabled: extension.enabled,
    description: extension.description,
  }));
}

function updateExtensionCount() {
  ensureElements();
  if (counterElement) {
    const total = extensionsState.length;
    if (total === 0) {
      counterElement.textContent = 'Nenhuma extensao cadastrada';
    } else if (total === 1) {
      counterElement.textContent = '1 extensao carregada';
    } else {
      counterElement.textContent = `${total} extensoes carregadas`;
    }
  }
}

function renderExtensions() {
  ensureElements();
  if (!listElement) {
    return;
  }

  listElement.innerHTML = '';
  extensionsState.forEach((extension) => {
    listElement.appendChild(createExtensionElement(extension));
  });

  updateExtensionCount();
}

function createExtensionElement(extension) {
  const wrapper = document.createElement('div');
  wrapper.className = 'extension-item flex items-center justify-between gap-4';
  wrapper.dataset.extensionId = extension.id;

  const infoContainer = document.createElement('div');
  infoContainer.className = 'extension-info';

  const nameElement = document.createElement('p');
  nameElement.className = 'extension-name font-medium';
  nameElement.textContent = extension.name || extension.directory;
  infoContainer.appendChild(nameElement);

  const pathElement = document.createElement('p');
  pathElement.className = 'extension-description text-xs text-app-gray-400 break-all';
  pathElement.textContent = extension.path || extension.directory;
  infoContainer.appendChild(pathElement);

  if (extension.description) {
    const descriptionElement = document.createElement('p');
    descriptionElement.className = 'text-xs text-app-gray-500 mt-1';
    descriptionElement.textContent = extension.description;
    infoContainer.appendChild(descriptionElement);
  }

  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'extension-actions items-center flex gap-3';

  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'flex items-center gap-2 cursor-pointer select-none';

  const toggleInput = document.createElement('input');
  toggleInput.type = 'checkbox';
  toggleInput.className = 'extension-toggle-input hidden';
  toggleInput.dataset.extensionId = extension.id;
  toggleInput.checked = extension.enabled;

  const toggleSlider = document.createElement('span');
  toggleSlider.className = 'extension-toggle-slider';

  const toggleStatus = document.createElement('span');
  toggleStatus.className = 'text-xs text-white extension-toggle-status';
  toggleStatus.textContent = extension.enabled ? 'Ativa' : 'Inativa';

  toggleLabel.appendChild(toggleInput);
  toggleLabel.appendChild(toggleSlider);
  toggleLabel.appendChild(toggleStatus);

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'extension-remove text-xs font-medium';
  removeButton.dataset.extensionRemove = extension.id;
  removeButton.textContent = 'Excluir';

  actionsContainer.appendChild(toggleLabel);
  actionsContainer.appendChild(removeButton);

  wrapper.appendChild(infoContainer);
  wrapper.appendChild(actionsContainer);

  return wrapper;
}

function findExtensionIndexById(extensionId) {
  return extensionsState.findIndex((extension) => extension.id === extensionId);
}

function findExtensionIndexByPath(pathOrDirectory) {
  if (!pathOrDirectory) {
    return -1;
  }

  return extensionsState.findIndex((extension) => {
    const currentKey = extension.path || extension.directory;
    return currentKey === pathOrDirectory;
  });
}

function handleListChange(event) {
  const target = event.target;
  if (!target || !target.classList.contains('extension-toggle-input')) {
    return;
  }

  const { extensionId } = target.dataset;
  if (!extensionId) {
    return;
  }

  const extension = extensionsState.find((item) => item.id === extensionId);
  if (!extension) {
    return;
  }

  extension.enabled = target.checked;
  const statusElement = target.parentElement?.querySelector('.extension-toggle-status');
  if (statusElement) {
    statusElement.textContent = extension.enabled ? 'Ativa' : 'Inativa';
  }

  debouncedSave();
}

function handleListClick(event) {
  const targetButton = event.target?.closest('[data-extension-remove]');
  if (!targetButton) {
    return;
  }

  const extensionId = targetButton.dataset.extensionRemove;
  if (!extensionId) {
    return;
  }

  removeExtensionById(extensionId);
}

function removeExtensionById(extensionId) {
  const index = findExtensionIndexById(extensionId);
  if (index === -1) {
    return;
  }

  extensionsState.splice(index, 1);
  renderExtensions();
  debouncedSave();
}

function clearFileInput(input) {
  if (input) {
    input.value = '';
  }
}

function handleExtensionUpload(event) {
  const input = event?.target;
  const files = Array.from(input?.files || []);
  if (files.length === 0) {
    return;
  }

  const firstFile = files[0];
  const inferredDirectory = extractDirectoryName(
    firstFile?.webkitRelativePath || firstFile?.path || firstFile?.name,
  );
  const folderPath = extractFolderPathFromFile(firstFile);

  if (!inferredDirectory) {
    showNotification('Nao foi possivel identificar a pasta da extensao selecionada.', 'error');
    clearFileInput(input);
    return;
  }

  const extensionData = {
    id: generateId(),
    name: inferredDirectory,
    directory: inferredDirectory,
    path: folderPath || inferredDirectory,
    enabled: true,
  };

  const existing = extensionsState.find((extension) => {
    const currentKey = extension.path || extension.directory;
    const newKey = extensionData.path || extensionData.directory;
    return currentKey === newKey;
  });

  if (existing) {
    showNotification('Essa extensao ja foi adicionada.', 'warning');
    clearFileInput(input);
    return;
  }

  extensionsState.push(extensionData);
  renderExtensions();
  debouncedSave();
  showNotification('Extensao adicionada com sucesso!', 'success');
  clearFileInput(input);
}

function displayExtension(entry) {
  const normalized = normalizeExtension(entry);
  if (!normalized) {
    return;
  }

  const key = normalized.path || normalized.directory;
  const existingIndex = key ? findExtensionIndexByPath(key) : -1;

  if (existingIndex >= 0) {
    extensionsState[existingIndex] = {
      ...extensionsState[existingIndex],
      ...normalized,
    };
  } else {
    if (!normalized.id) {
      normalized.id = generateId();
    }
    extensionsState.push(normalized);
  }

  renderExtensions();
  debouncedSave();
}

function removeExtension(reference) {
  if (!reference) {
    return;
  }

  if (typeof reference === 'string') {
    removeExtensionById(reference);
    return;
  }

  const extensionId = reference.dataset?.extensionRemove || reference.dataset?.extensionId;
  if (extensionId) {
    removeExtensionById(extensionId);
  }
}

export {
  setExtensions,
  getExtensions,
  handleExtensionUpload,
  displayExtension,
  removeExtension,
  updateExtensionCount,
};
