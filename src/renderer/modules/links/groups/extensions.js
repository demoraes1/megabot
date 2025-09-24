import { showNotification } from '../../ui/notifications.js';
import { debouncedSave } from '../../settings/autosave.js';

function getAddedExtensions() {
  const extensions = [];
  const extensionsList = document.getElementById('extensions-list');

  if (extensionsList) {
    const extensionElements = extensionsList.querySelectorAll('.font-mono');
    extensionElements.forEach((element) => {
      const extensionPath = element.textContent.trim();
      if (extensionPath !== '') {
        extensions.push(extensionPath);
      }
    });
  }

  return extensions;
}

function handleExtensionUpload(event) {
  const { files } = event.target;
  if (files.length === 0) {
    return;
  }

  const [file] = files;
  console.log('Extensao selecionada:', file.webkitRelativePath);
  showNotification('Extensao carregada com sucesso!', 'success');
  displayExtension(file.webkitRelativePath);
}

function displayExtension(path) {
  const extensionsList = document.getElementById('extensions-list');
  if (!extensionsList) {
    return;
  }

  const extensionElement = document.createElement('div');
  extensionElement.className =
    'flex items-center justify-between p-3 bg-app-gray-800 rounded-lg border border-app-gray-700';
  extensionElement.innerHTML = `
            <span class="text-white text-sm">${path.split('/')[0]}</span>
            <button class="w-6 h-6 bg-app-red-600 hover:bg-app-red-500 rounded text-white text-xs font-bold transition-colors duration-200" onclick="removeExtension(this)" title="Remover Extensao">A</button>
        `;

  extensionsList.appendChild(extensionElement);
  debouncedSave();
}

function removeExtension(button) {
  if (!button || !button.parentElement) {
    return;
  }

  button.parentElement.remove();
  debouncedSave();
}

function updateExtensionCount() {
  const extensionsList = document.getElementById('extensions-list');
  let totalExtensions = 0;

  if (extensionsList) {
    const extensionElements = extensionsList.querySelectorAll('.font-mono');
    totalExtensions = extensionElements.length;
  }

  const extensionCounter = document.getElementById('extension-counter-text');
  if (extensionCounter) {
    extensionCounter.textContent = `${totalExtensions} extensoes carregadas`;
  }

  console.log(`Total de extensoes: ${totalExtensions}`);
}

export {
  getAddedExtensions,
  handleExtensionUpload,
  displayExtension,
  removeExtension,
  updateExtensionCount,
};
