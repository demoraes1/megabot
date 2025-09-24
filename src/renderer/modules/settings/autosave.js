import { clearSaveTimeout, setSaveTimeoutId } from '../state.js';
import { saveSettings } from './storage.js';

const SAVE_DELAY = 100;

export function debouncedSave() {
  clearSaveTimeout();

  const timeoutId = setTimeout(() => {
    saveSettings();
  }, SAVE_DELAY);

  setSaveTimeoutId(timeoutId);
}

export function initializeAutoSave() {
  const delayCount = document.getElementById('delay-count');
  const openingsCount = document.getElementById('openings-count');
  const linksContainer = document.getElementById('links-container');
  const proxiesContainer = document.getElementById('proxies-container');
  const pixContainer = document.getElementById('pix-container');
  const extensionsContainer = document.getElementById('extensions-container');

  if (delayCount) {
    const observer = new MutationObserver(debouncedSave);
    observer.observe(delayCount, { childList: true, subtree: true });
  }

  if (openingsCount) {
    const observer = new MutationObserver(debouncedSave);
    observer.observe(openingsCount, { childList: true, subtree: true });
  }

  if (linksContainer) {
    const observer = new MutationObserver(debouncedSave);
    observer.observe(linksContainer, { childList: true, subtree: true });
  }

  if (proxiesContainer) {
    const observer = new MutationObserver(debouncedSave);
    observer.observe(proxiesContainer, { childList: true, subtree: true });
  }

  if (pixContainer) {
    const observer = new MutationObserver(debouncedSave);
    observer.observe(pixContainer, { childList: true, subtree: true });
  }

  if (extensionsContainer) {
    const observer = new MutationObserver(debouncedSave);
    observer.observe(extensionsContainer, { childList: true, subtree: true });
  }

  const generateWithdrawToggle = document.getElementById(
    'generate-withdraw-toggle',
  );
  const muteAudioToggle = document.getElementById('mute-audio-toggle');
  const depositMinInput = document.getElementById('deposit-min');
  const depositMaxInput = document.getElementById('deposit-max');
  const delayToggleAutomation = document.getElementById('delay-toggle');
  const categoriaField = document.getElementById('categoria-field');
  const jogoField = document.getElementById('jogo-field');
  const passwordField = document.getElementById('password-field');
  const withdrawPasswordField = document.getElementById(
    'withdraw-password-field',
  );
  const randomPasswordsToggle = document.getElementById(
    'random-passwords-toggle',
  );
  const pixKeyTypeField = document.getElementById('pix-key-type');

  if (generateWithdrawToggle) {
    generateWithdrawToggle.addEventListener('change', debouncedSave);
  }

  if (muteAudioToggle) {
    muteAudioToggle.addEventListener('change', debouncedSave);
  }

  if (depositMinInput) {
    depositMinInput.addEventListener('input', debouncedSave);
    depositMinInput.addEventListener('change', debouncedSave);
  }

  if (depositMaxInput) {
    depositMaxInput.addEventListener('input', debouncedSave);
    depositMaxInput.addEventListener('change', debouncedSave);
  }

  if (delayToggleAutomation) {
    delayToggleAutomation.addEventListener('change', () => {
      const delayControls = document.getElementById('delay-controls');
      if (delayControls) {
        if (delayToggleAutomation.checked) {
          delayControls.classList.remove('hidden');
        } else {
          delayControls.classList.add('hidden');
        }
      }
      debouncedSave();
    });
  }

  if (categoriaField) {
    categoriaField.addEventListener('change', debouncedSave);
  }

  if (jogoField) {
    jogoField.addEventListener('input', debouncedSave);
    jogoField.addEventListener('change', debouncedSave);
  }

  if (pixKeyTypeField) {
    pixKeyTypeField.addEventListener('change', debouncedSave);
  }

  const toggleElements = document.querySelectorAll(
    'input[type="checkbox"], .toggle-switch, input[type="radio"]',
  );
  toggleElements.forEach((toggle) => {
    if (toggle.type === 'checkbox' || toggle.type === 'radio') {
      toggle.addEventListener('change', debouncedSave);
    } else {
      toggle.addEventListener('click', debouncedSave);
    }
  });

  if (passwordField) {
    passwordField.addEventListener('input', debouncedSave);
  }

  if (withdrawPasswordField) {
    withdrawPasswordField.addEventListener('input', debouncedSave);
  }

  if (randomPasswordsToggle) {
    randomPasswordsToggle.addEventListener('change', debouncedSave);
  }

  window.addEventListener('beforeunload', () => {
    saveSettings();
  });

  setInterval(() => {
    saveSettings();
  }, 30000);
}
