import { showNotification, showCustomConfirm } from '../../ui/notifications.js';
import { debouncedSave } from '../../settings/autosave.js';
import { saveSettings } from '../../settings/storage.js';

function getAddedPixKeys() {
  const pixKeys = [];
  const pixListPopup = document.getElementById('pix-list-popup');

  if (pixListPopup && pixListPopup.value) {
    const lines = pixListPopup.value.split('\n');
    let id = 1;

    lines.forEach((line) => {
      const pixKey = line.trim();
      if (pixKey !== '') {
        let tipo = 'Inválida';
        if (typeof PixValidator !== 'undefined') {
          const validator = new PixValidator();
          const identifiedType = validator.identifyPixKeyType(pixKey);
          if (identifiedType) {
            tipo = identifiedType;
          }
        }

        pixKeys.push({
          id: id++,
          tipo,
          chave: pixKey,
        });
      }
    });
  }

  return pixKeys;
}

function updatePixCount() {
  const pixListPopup = document.getElementById('pix-list-popup');
  let totalPixKeys = 0;
  let pixKeys = [];

  if (pixListPopup && pixListPopup.value) {
    const lines = pixListPopup.value.split('\n');
    pixKeys = lines.filter((line) => line.trim() !== '').map((line) => line.trim());
    totalPixKeys = pixKeys.length;
  }

  const pixCounter = document.getElementById('pix-counter-text');
  if (pixCounter) {
    pixCounter.textContent = `${totalPixKeys} chaves PIX disponíveis`;
  }

  updatePixCountsByType(pixKeys);
  console.log('Total de chaves PIX:', totalPixKeys);
}

function updatePixCountsByType(pixKeys) {
  if (typeof PixValidator === 'undefined') {
    console.warn('PixValidator não está disponível');
    return;
  }

  const validator = new PixValidator();
  const counts = {
    CPF: 0,
    CNPJ: 0,
    'E-mail': 0,
    Telefone: 0,
    'Chave Aleatória': 0,
    Inválidas: 0,
  };

  pixKeys.forEach((pixKey) => {
    const type = validator.identifyPixKeyType(pixKey);
    if (type && counts[type] !== undefined) {
      counts[type] += 1;
    } else {
      counts.Invalidas += 1;
    }
  });

  const cpfCount = document.getElementById('cpf-count');
  const cnpjCount = document.getElementById('cnpj-count');
  const emailCount = document.getElementById('email-count');
  const phoneCount = document.getElementById('phone-count');
  const randomCount = document.getElementById('random-count');
  const invalidCount = document.getElementById('invalid-count');

  if (cpfCount) cpfCount.textContent = counts.CPF || 0;
  if (cnpjCount) cnpjCount.textContent = counts.CNPJ || 0;
  if (emailCount) emailCount.textContent = counts['E-mail'] || 0;
  if (phoneCount) phoneCount.textContent = counts.Telefone || 0;
  if (randomCount) randomCount.textContent = counts['Chave Aleatoria'] || 0;
  if (invalidCount) invalidCount.textContent = counts.Invalidas || 0;

  console.log('Contadores por tipo atualizados:', counts);
}

function initializePixManagement() {
  const pixListPopup = document.getElementById('pix-list-popup');
  const clearPixBtn = document.getElementById('clear-pix-btn');

  if (pixListPopup) {
    pixListPopup.addEventListener('input', () => {
      updatePixCount();
      debouncedSave();
    });

    pixListPopup.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const textarea = e.target;
        const cursorPosition = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPosition);
        const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
        const currentLineStart = lastNewlineIndex === -1 ? 0 : lastNewlineIndex + 1;
        const currentLine = textBeforeCursor.substring(currentLineStart);

        if (currentLine.trim() === '') {
          e.preventDefault();
          return false;
        }
      }
    });
  }

  if (clearPixBtn) {
    clearPixBtn.addEventListener('click', async () => {
      const confirmed = await showCustomConfirm('Tem certeza que deseja limpar todas as chaves PIX?');
      if (confirmed) {
        if (pixListPopup) {
          pixListPopup.value = '';
        }
        updatePixCount();
        debouncedSave();
        showNotification('Chaves PIX limpas com sucesso!', 'success');
      }
    });
  }

  updatePixCount();
}

function removeConsumedPixKeys(consumedKeys = []) {
  if (!Array.isArray(consumedKeys) || consumedKeys.length === 0) {
    return;
  }

  const pixListPopup = document.getElementById('pix-list-popup');
  if (!pixListPopup) {
    return;
  }

  const keysToRemove = new Set(
    consumedKeys
      .map((key) => (typeof key === 'object' && key !== null ? key.chave : key))
      .filter((key) => typeof key === 'string' && key.trim() !== ''),
  );

  if (keysToRemove.size === 0) {
    return;
  }

  const remaining = pixListPopup.value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !keysToRemove.has(line));

  pixListPopup.value = remaining.join('\n');
  updatePixCount();
  saveSettings();
}

export {
  getAddedPixKeys,
  updatePixCount,
  updatePixCountsByType,
  initializePixManagement,
  removeConsumedPixKeys,
};
