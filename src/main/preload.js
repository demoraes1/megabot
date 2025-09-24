const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Função para salvar configurações
  saveSettings: async (settings, formatPixKeys = false) => {
    try {
      const result = await ipcRenderer.invoke('save-settings', settings, formatPixKeys);
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
  navigateAllBrowsers: async (url, syncStates = null, options = {}) => {
    try {
      const result = await ipcRenderer.invoke('navigate-all-browsers', url, syncStates, options);
      return result;
    } catch (error) {
      console.error('Erro ao navegar todos os navegadores via IPC:', error);
      throw error;
    }
  },

  // Função para obter lista de navegadores ativos
  getActiveBrowsers: async (syncStates = null) => {
    try {
      const result = await ipcRenderer.invoke('get-active-browsers', syncStates);
      return result;
    } catch (error) {
      console.error('Erro ao obter navegadores ativos via IPC:', error);
      throw error;
    }
  },

  // Função para obter lista de navegadores ativos com perfis
  getActiveBrowsersWithProfiles: async (syncStates = null) => {
    try {
      const result = await ipcRenderer.invoke('get-active-browsers-with-profiles', syncStates);
      return result;
    } catch (error) {
      console.error('Erro ao obter navegadores ativos com perfis via IPC:', error);
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

  onBrowserNavigationComplete: (callback) => {
    ipcRenderer.on('browser-navigation-complete', (event, payload) => callback(payload));
  },

  onBrowserNavigationInjection: (callback) => {
    ipcRenderer.on('browser-navigation-injection', (event, payload) => callback(payload));
  },

  onBrowserLaunchReady: (callback) => {
    ipcRenderer.on('browser-launch-ready', (event, payload) => callback(payload));
  },

  onBrowserLaunchInjection: (callback) => {
    ipcRenderer.on('browser-launch-injection', (event, payload) => callback(payload));
  },

  // Função para injetar script por nome em todos os navegadores
  injectScript: async (scriptName, syncStates = null) => {
    try {
      const result = await ipcRenderer.invoke('inject-script', scriptName, syncStates);
      return result;
    } catch (error) {
      console.error('Erro ao injetar script via IPC:', error);
      throw error;
    }
  },

  // Função para injetar script por nome em todos os navegadores após navegação
  injectScriptPostNavigation: async (scriptName, syncStates = null) => {
    try {
      const result = await ipcRenderer.invoke('inject-script-post-navigation', scriptName, syncStates);
      return result;
    } catch (error) {
      console.error('Erro ao injetar script pós-navegação via IPC:', error);
      throw error;
    }
  },

  // Funcao para reservar chaves PIX para saque
  reservePixKeysForWithdraw: async (pixType, syncStates = null) => {
    try {
      const result = await ipcRenderer.invoke('reserve-pix-keys-for-withdraw', pixType, syncStates);
      return result;
    } catch (error) {
      console.error('Erro ao reservar chaves PIX via IPC:', error);
      throw error;
    }
  },

  checkPixAssignments: async (pixType, syncStates = null) => {
    try {
      const result = await ipcRenderer.invoke('check-pix-assignments', pixType, syncStates);
      return result;
    } catch (error) {
      console.error('Erro ao validar chaves PIX via IPC:', error);
      throw error;
    }
  },

  // Função para injetar script customizado em todos os navegadores
  injectCustomScript: async (scriptCode, syncStates = null) => {
    try {
      const result = await ipcRenderer.invoke('inject-custom-script', scriptCode, syncStates);
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
  },

  // Funções para gerenciamento de perfis
  getAllProfiles: async () => {
    try {
      const result = await ipcRenderer.invoke('get-all-profiles');
      return result;
    } catch (error) {
      console.error('Erro ao obter perfis via IPC:', error);
      throw error;
    }
  },

  getProfileById: async (profileId) => {
    try {
      const result = await ipcRenderer.invoke('get-profile-by-id', profileId);
      return result;
    } catch (error) {
      console.error('Erro ao obter perfil por ID via IPC:', error);
      throw error;
    }
  },

  removeProfile: async (profileId) => {
    try {
      const result = await ipcRenderer.invoke('remove-profile', profileId);
      return result;
    } catch (error) {
      console.error('Erro ao remover perfil via IPC:', error);
      throw error;
    }
  },

  createNewProfile: async () => {
    try {
      const result = await ipcRenderer.invoke('create-new-profile');
      return result;
    } catch (error) {
      console.error('Erro ao criar novo perfil via IPC:', error);
      throw error;
    }
  },

  updateProfile: async (profileId, updates) => {
    try {
      const result = await ipcRenderer.invoke('update-profile', profileId, updates);
      return result;
    } catch (error) {
      console.error('Erro ao atualizar perfil via IPC:', error);
      throw error;
    }
  },

  // Função para excluir todos os perfis
  deleteAllProfiles: async () => {
    try {
      const result = await ipcRenderer.invoke('delete-all-profiles');
      return result;
    } catch (error) {
      console.error('Erro ao excluir todos os perfis via IPC:', error);
      throw error;
    }
  },

  // Listener para progresso de exclusão
  onDeleteProgress: (callback) => {
    ipcRenderer.on('delete-progress', (event, data) => callback(data));
  },

  removeDeleteProgressListener: () => {
    ipcRenderer.removeAllListeners('delete-progress');
  },

  // Função para iniciar navegador com perfil específico
  startBrowserWithProfile: async (profileId) => {
    try {
      const result = await ipcRenderer.invoke('start-browser-with-profile', profileId);
      return result;
    } catch (error) {
      console.error('Erro ao iniciar navegador com perfil via IPC:', error);
      throw error;
    }
  },

  // Função para injetar script em perfil específico
  injectScriptInProfile: async (profileId, scriptName) => {
    try {
      const result = await ipcRenderer.invoke('inject-script-in-profile', profileId, scriptName);
      return result;
    } catch (error) {
      console.error('Erro ao injetar script em perfil via IPC:', error);
      throw error;
    }
  },

  // Função para excluir perfil específico
   deleteProfile: async (profileId) => {
     try {
       const result = await ipcRenderer.invoke('delete-profile', profileId);
       return result;
     } catch (error) {
       console.error('Erro ao excluir perfil via IPC:', error);
       throw error;
     }
   },

  // Função para salvar URL em perfis específicos ou todos
  saveUrlToProfiles: async (url, profileIds = null) => {
    try {
      const result = await ipcRenderer.invoke('save-url-to-profiles', url, profileIds);
      return result;
    } catch (error) {
      console.error('Erro ao salvar URL nos perfis via IPC:', error);
      throw error;
    }
  }
});

// Log para confirmar que o preload foi carregado
console.log('Preload script carregado - electronAPI disponível');