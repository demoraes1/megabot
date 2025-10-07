import { showNotification } from '../ui/notifications.js';

const MIRROR_BUTTON_ID = 'mirror-mode-btn';
let currentStatus = { enabled: false };
let removeStatusListener = null;

function readSyncStates() {
  try {
    const raw = localStorage.getItem('syncPopupCheckboxStates');
    if (!raw || raw === 'null') {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Falha ao ler estados de sincronizacao do modo espelho:', error);
    return null;
  }
}

function applyButtonState(button, status) {
  if (!button) {
    return;
  }

  const isActive = Boolean(status && status.enabled);
  button.dataset.mirrorActive = isActive ? 'true' : 'false';
  button.setAttribute('aria-pressed', isActive ? 'true' : 'false');

  button.classList.toggle('ring-2', isActive);
  button.classList.toggle('ring-offset-2', isActive);
  button.classList.toggle('ring-green-400', isActive);
  button.classList.toggle('opacity-80', !isActive);
}

async function toggleMirrorMode(button) {
  if (!window.electronAPI || !window.electronAPI.mirrorMode) {
    showNotification('Modo espelho indisponivel.', 'error');
    return;
  }

  const desiredState = currentStatus.enabled ? 'disable' : 'enable';
  const syncStates = desiredState === 'enable' ? readSyncStates() : null;

  button.disabled = true;
  button.classList.add('cursor-wait');

  try {
    const payload = desiredState === 'enable'
      ? { desiredState, syncStates }
      : { desiredState };

    const result = await window.electronAPI.mirrorMode.toggle(payload);

    if (!result || result.success !== true) {
      const message = result?.message || result?.error || 'Nao foi possivel alternar o modo espelho.';
      showNotification(message, 'error');
      return;
    }

    if (desiredState === 'enable') {
      const controller = result.controllerId ? `Controlador: navegador ${result.controllerId}.` : '';
      showNotification(`Modo espelho ativado. ${controller}`.trim(), 'success');
    } else {
      showNotification('Modo espelho desativado.', 'success');
    }
  } catch (error) {
    console.error('Erro ao alternar modo espelho:', error);
    showNotification('Erro ao alternar modo espelho.', 'error');
  } finally {
    button.disabled = false;
    button.classList.remove('cursor-wait');
  }
}

async function loadInitialStatus(button) {
  if (!window.electronAPI || !window.electronAPI.mirrorMode) {
    return;
  }

  try {
    const status = await window.electronAPI.mirrorMode.getStatus();
    currentStatus = status || { enabled: false };
    applyButtonState(button, currentStatus);
  } catch (error) {
    console.warn('Nao foi possivel obter status inicial do modo espelho:', error);
  }
}

function subscribeToStatusChanges(button) {
  if (!window.electronAPI || !window.electronAPI.mirrorMode) {
    return;
  }

  if (removeStatusListener) {
    removeStatusListener();
    removeStatusListener = null;
  }

  removeStatusListener = window.electronAPI.mirrorMode.onStatusChange((status) => {
    currentStatus = status || { enabled: false };
    applyButtonState(button, currentStatus);
  });
}

function initializeMirrorMode() {
  const button = document.getElementById(MIRROR_BUTTON_ID);
  if (!button) {
    return;
  }

  button.addEventListener('click', async () => {
    await toggleMirrorMode(button);
  });

  subscribeToStatusChanges(button);
  loadInitialStatus(button);
}

export { initializeMirrorMode };
