import { clearSaveTimeout, setSaveTimeoutId } from '../state.js';
import { saveSettings } from './storage.js';

const SAVE_DELAY = 100;
const AUTOSAVE_EVENT = 'settings:autosave';
let initialized = false;

export function debouncedSave(options = {}) {
  const { immediate = false } = options;

  clearSaveTimeout();

  if (immediate) {
    saveSettings();
    return;
  }

  const timeoutId = setTimeout(() => {
    saveSettings();
  }, SAVE_DELAY);

  setSaveTimeoutId(timeoutId);
}

function handleAutoSaveEvent(event) {
  const shouldSaveNow = Boolean(event?.detail?.immediate);
  debouncedSave({ immediate: shouldSaveNow });
}

export function initializeAutoSave() {
  if (initialized) {
    return;
  }

  if (typeof document !== 'undefined') {
    document.addEventListener(AUTOSAVE_EVENT, handleAutoSaveEvent);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      saveSettings();
    });
  }

  initialized = true;
}

export function dispatchAutoSave(detail = {}) {
  if (typeof document === 'undefined') {
    return;
  }

  const event = new CustomEvent(AUTOSAVE_EVENT, { detail });
  document.dispatchEvent(event);
}
