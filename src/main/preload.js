const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Função para salvar configurações
  saveSettings: async (settings) => {
    try {
      const result = await ipcRenderer.invoke('save-settings', settings);
      return result;
    } catch (error) {
      console.error('Erro ao salvar configurações via IPC:', error);
      throw error;
    }
  },

  // Função para carregar configurações
  loadSettings: async () => {
    try {
      const settings = await ipcRenderer.invoke('load-settings');
      return settings;
    } catch (error) {
      console.error('Erro ao carregar configurações via IPC:', error);
      throw error;
    }
  },

  // Função para detectar monitores
  detectMonitors: async () => {
    try {
      const result = await ipcRenderer.invoke('detect-monitors');
      return result;
    } catch (error) {
      console.error('Erro ao detectar monitores via IPC:', error);
      throw error;
    }
  },

  // Função para calcular capacidade do monitor
  calculateMonitorCapacity: async (monitor, config) => {
    try {
      const result = await ipcRenderer.invoke('calculate-monitor-capacity', monitor, config);
      return result;
    } catch (error) {
      console.error('Erro ao calcular capacidade do monitor via IPC:', error);
      throw error;
    }
  },

  // Função para salvar dados dos monitores
  saveMonitorData: async (monitoresData, posicionamentoData) => {
    try {
      const result = await ipcRenderer.invoke('save-monitor-data', monitoresData, posicionamentoData);
      return result;
    } catch (error) {
      console.error('Erro ao salvar dados dos monitores via IPC:', error);
      throw error;
    }
  },

  // Função para carregar dados dos monitores
  loadMonitorData: async () => {
    try {
      const result = await ipcRenderer.invoke('load-monitor-data');
      return result;
    } catch (error) {
      console.error('Erro ao carregar dados dos monitores via IPC:', error);
      throw error;
    }
  },

  // Função para abrir navegadores
  openBrowsers: async (options) => {
    try {
      const result = await ipcRenderer.invoke('open-browsers', options);
      return result;
    } catch (error) {
      console.error('Erro ao abrir navegadores via IPC:', error);
      throw error;
    }
  },

  // Função para navegar URL em navegador específico
  navigateBrowser: async (navigatorId, url) => {
    try {
      const result = await ipcRenderer.invoke('navigate-browser', navigatorId, url);
      return result;
    } catch (error) {
      console.error('Erro ao navegar navegador via IPC:', error);
      throw error;
    }
  },

  // Função para navegar URL em todos os navegadores ativos
  navigateAllBrowsers: async (url) => {
    try {
      const result = await ipcRenderer.invoke('navigate-all-browsers', url);
      return result;
    } catch (error) {
      console.error('Erro ao navegar todos os navegadores via IPC:', error);
      throw error;
    }
  },

  // Função para obter lista de navegadores ativos
  getActiveBrowsers: async () => {
    try {
      const result = await ipcRenderer.invoke('get-active-browsers');
      return result;
    } catch (error) {
      console.error('Erro ao obter navegadores ativos via IPC:', error);
      throw error;
    }
  },

  // Listeners para eventos do Chrome download
  onShowChromeDownloadModal: (callback) => {
    ipcRenderer.on('show-chrome-download-modal', (event, data) => callback(data));
  },

  onChromeDownloadProgress: (callback) => {
    ipcRenderer.on('chrome-download-progress', (event, progress) => callback(progress));
  },

  onChromeDownloadComplete: (callback) => {
    ipcRenderer.on('chrome-download-complete', () => callback());
  },

  onChromeDownloadError: (callback) => {
    ipcRenderer.on('chrome-download-error', (event, error) => callback(error));
  },

  // Função para injetar script por nome em todos os navegadores
  injectScript: async (scriptName) => {
    try {
      const result = await ipcRenderer.invoke('inject-script', scriptName);
      return result;
    } catch (error) {
      console.error('Erro ao injetar script via IPC:', error);
      throw error;
    }
  },

  // Função para injetar script customizado em todos os navegadores
  injectCustomScript: async (scriptCode) => {
    try {
      const result = await ipcRenderer.invoke('inject-custom-script', scriptCode);
      return result;
    } catch (error) {
      console.error('Erro ao injetar script customizado via IPC:', error);
      throw error;
    }
  },

  // Função para obter scripts disponíveis
  getAvailableScripts: async () => {
    try {
      const result = await ipcRenderer.invoke('get-available-scripts');
      return result;
    } catch (error) {
      console.error('Erro ao obter scripts disponíveis via IPC:', error);
      throw error;
    }
  },

  // Função para recarregar lista de scripts
  reloadScripts: async () => {
    try {
      const result = await ipcRenderer.invoke('reload-scripts');
      return result;
    } catch (error) {
      console.error('Erro ao recarregar scripts via IPC:', error);
      throw error;
    }
  },

  // Função para remover listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Log para confirmar que o preload foi carregado
console.log('Preload script carregado - electronAPI disponível');