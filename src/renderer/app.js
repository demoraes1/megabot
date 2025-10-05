import { initializeNavigationEvents } from './modules/navigation/events.js';
import { initializeTabSystem } from './modules/ui/tabs.js';
import { loadSettingsAsync } from './modules/settings/storage.js';
import { initializeAutoSave } from './modules/settings/autosave.js';
import { initializeLinkManagement } from './modules/links/index.js';
import {
  initializeButtons,
  initializePopups,
  initializeCounters,
  initializeAutomationSettingsControls,
} from './modules/automation/index.js';
import {
  initializeChromeDownloadModal,
  initializeChromeDownloadSystem,
} from './modules/chrome/download.js';
import { inicializarSistemaMonitores } from './modules/monitors/index.js';
import { initializeProfilesTab } from './modules/profiles/index.js';

async function initializeApplication() {
  console.log('Aplicação iniciada');

  try {
    await loadSettingsAsync();
    initializeTabSystem();
    initializeButtons();
    initializePopups();
    initializeCounters();
    initializeAutomationSettingsControls();
    initializeLinkManagement();
    initializeProfilesTab();
    initializeAutoSave();
    initializeChromeDownloadModal();
    initializeChromeDownloadSystem();
    initializeNavigationEvents();

    setTimeout(inicializarSistemaMonitores, 500);

    console.log('Aplicação inicializada com sucesso');
  } catch (error) {
    console.error('Erro durante a inicialização da aplicação:', error);
  }
}

document.addEventListener('DOMContentLoaded', initializeApplication);