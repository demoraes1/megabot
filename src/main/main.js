const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { detectarMonitores, calcularCapacidadeMonitor, salvarDadosMonitores, carregarDadosMonitores, configurarListenerMonitores } = require('./monitor-detector');
const { launchInstances, navigateToUrl, navigateAllBrowsers, navigationEvents, launchEvents, browserStateEvents, getActiveBrowsers, getActiveBrowsersWithProfiles, updateActiveBrowserProfile, injectScriptInBrowser, injectScriptInAllBrowsers, saveLastBrowserId } = require('./browser-manager');
const ChromiumDownloader = require('../infrastructure/chromium-downloader');
const scriptInjector = require('../automation/injection');
const { reserveAndAssignPixKeys, normalizePixKeyType, getDefaultLabel } = require('../automation/pix-key-manager');
const { getAllProfiles, getProfileById, removeProfile, generateProfile, addProfile, updateProfile, loadConfig, saveConfig, PROFILES_DIR } = require('../automation/profile-manager');

function broadcastNavigationEvent(channel, payload) {
  BrowserWindow.getAllWindows().forEach(window => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, payload);
    }
  });
}

function broadcastProfilesUpdate(reason, extra = {}) {
  try {
    const profiles = getAllProfiles();
    broadcastNavigationEvent('profiles-updated', {
      reason,
      profiles,
      ...extra,
    });
  } catch (error) {
    console.error('Erro ao emitir atualizacao de perfis:', error);
  }
}

navigationEvents.on('navigation-complete', (payload) => {
  broadcastNavigationEvent('browser-navigation-complete', payload);
});

navigationEvents.on('injection-complete', (payload) => {
  broadcastNavigationEvent('browser-navigation-injection', payload);
});

launchEvents.on('browser-launch-ready', (payload) => {
  broadcastNavigationEvent('browser-launch-ready', payload);
});

launchEvents.on('browser-launch-injection', (payload) => {
  broadcastNavigationEvent('browser-launch-injection', payload);
});

browserStateEvents.on('active-browsers-changed', (payload) => {
  broadcastNavigationEvent('active-browsers-updated', payload);
});

// Configuração de zoom da interface
// Valores sugeridos: 0.8 (menor), 0.9 (pequeno), 1.0 (padrão), 1.1 (grande), 1.2 (maior)
const INTERFACE_ZOOM_FACTOR = 0.1;

// Função para criar a janela principal
function createWindow() {
  // Criar a janela do navegador
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../renderer/assets/icon.png'), // Opcional: adicione um ícone
    show: false, // Não mostrar até estar pronto
    autoHideMenuBar: true // Remove a barra de ferramentas
  });

  // Configurar zoom da interface
  mainWindow.webContents.setZoomFactor(INTERFACE_ZOOM_FACTOR);

  // Carregar o arquivo HTML
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Mostrar a janela quando estiver pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Verificar Chrome após a janela estar pronta
    setTimeout(() => {
      checkChromeOnStartup(mainWindow);
    }, 1000); // Aguardar 1 segundo para garantir que a UI esteja carregada
  });

  // Abrir DevTools em modo de desenvolvimento
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// Função para verificar e atualizar o Chrome na inicialização
async function checkChromeOnStartup(mainWindow) {
  try {
    const downloader = new ChromiumDownloader();
    const updateStatus = await downloader.getUpdateStatus();
    
    // Verificação silenciosa - só mostra janela se precisar fazer download/atualização
    if (!updateStatus.hasChrome || updateStatus.needsUpdate) {
      console.log('[Chrome] Necessário download/atualização - mostrando janela');
      
      // Enviar evento para mostrar o popup de download
      mainWindow.webContents.send('show-chrome-download-modal', {
        isUpdate: updateStatus.hasChrome,
        currentVersion: updateStatus.installedVersion,
        latestVersion: updateStatus.latestVersion
      });
      
      // Iniciar o processo de download/atualização
      await downloader.ensureChromiumAvailable((progress) => {
        // Enviar progresso para o renderer
        mainWindow.webContents.send('chrome-download-progress', progress);
      });
      
      // Notificar conclusão
      mainWindow.webContents.send('chrome-download-complete');
    } else {
      console.log('[Chrome] Chrome já está instalado e atualizado - verificação silenciosa concluída');
    }
  } catch (error) {
    console.error('Erro ao verificar Chrome:', error);
    // Enviar erro para o renderer
    mainWindow.webContents.send('chrome-download-error', error.message);
  }
}

// Este método será chamado quando o Electron terminar de inicializar
// e estiver pronto para criar janelas do navegador.
app.whenReady().then(async () => {
  // Inicializar configuração de monitores
  try {
    // Removido criarConfiguracaoInicial() para evitar sobrescrever configurações
    // A configuração será criada quando o usuário detectar monitores pela primeira vez
    configurarListenerMonitores();
    console.log('Sistema de monitores inicializado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar sistema de monitores:', error);
  }

  createWindow();

  app.on('activate', () => {
    // No macOS, é comum recriar uma janela quando o ícone do dock é clicado
    // e não há outras janelas abertas.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Sair quando todas as janelas estiverem fechadas, exceto no macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Caminho para o arquivo de configurações
const settingsPath = path.join(__dirname, '../config/app-settings.json');

// IPC Handlers para salvamento e carregamento de configurações
ipcMain.handle('save-settings', async (event, settings, formatPixKeys = false) => {
  try {
    // Garantir que a pasta config existe
    const configDir = path.dirname(settingsPath);
    await fs.mkdir(configDir, { recursive: true });
    
    let jsonString;
    if (formatPixKeys && settings.pixKeys && Array.isArray(settings.pixKeys)) {
      // Formatação especial para pixKeys - uma por linha
      jsonString = JSON.stringify(settings, null, 2);
      
      // Encontrar e substituir a formatação do array pixKeys
      const pixKeysMatch = jsonString.match(/"pixKeys": \[([\s\S]*?)\]/);
      if (pixKeysMatch) {
        const pixKeysArray = settings.pixKeys;
        let compactPixKeys = '[\n';
        pixKeysArray.forEach((key, index) => {
          const compactKey = `    { "id": ${key.id}, "tipo": "${key.tipo}", "chave": "${key.chave}" }`;
          compactPixKeys += compactKey;
          if (index < pixKeysArray.length - 1) {
            compactPixKeys += ',';
          }
          compactPixKeys += '\n';
        });
        compactPixKeys += '  ]';
        
        jsonString = jsonString.replace(/"pixKeys": \[([\s\S]*?)\]/, `"pixKeys": ${compactPixKeys}`);
      }
    } else {
      jsonString = JSON.stringify(settings, null, 2);
    }
    
    await fs.writeFile(settingsPath, jsonString, 'utf8');
    console.log('Configurações salvas em:', settingsPath);
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-settings', async () => {
  try {
    const data = await fs.readFile(settingsPath, 'utf8');
    const settings = JSON.parse(data);
    console.log('Configurações carregadas de:', settingsPath);
    return settings;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Arquivo de configurações não encontrado, criando novo...');
      // Criar arquivo com configurações padrão
      const defaultSettings = {
        links: [],
        proxies: [],
        pixKeys: [],
        extensions: [],
        settings: {
          delay: 5,
          openings: 1,
          toggles: {},
          lastSaved: null
        }
      };
      await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8');
      return defaultSettings;
    }
    console.error('Erro ao carregar configurações:', error);
    return null;
  }
});

// Handler para detectar monitores
ipcMain.handle('detect-monitors', async () => {
  try {
    const result = await detectarMonitores();
    return result;
  } catch (error) {
    console.error('Erro ao detectar monitores:', error);
    return {
      success: false,
      error: error.message,
      monitores: []
    };
  }
});

// Handler para calcular capacidade de um monitor
ipcMain.handle('calculate-monitor-capacity', async (event, monitor, config = {}) => {
  try {
    const {
      larguraLogica = 502,
      alturaLogica = 800,
      fatorEscala = 0.65
    } = config;
    
    const result = calcularCapacidadeMonitor(monitor.bounds, larguraLogica, alturaLogica, fatorEscala);
    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error('Erro ao calcular capacidade do monitor:', error);
    return {
      success: false,
      error: error.message,
      capacidade: 0,
      posicoes: []
    };
  }
});

// Handler para salvar dados dos monitores
ipcMain.handle('save-monitor-data', async (event, monitoresData, posicionamentoData, config = {}) => {
  try {
    const result = salvarDadosMonitores(monitoresData, posicionamentoData, config);
    return result;
  } catch (error) {
    console.error('Erro ao salvar dados dos monitores:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Handler para carregar dados dos monitores
ipcMain.handle('load-monitor-data', async () => {
  try {
    const result = carregarDadosMonitores();
    return result;
  } catch (error) {
    console.error('Erro ao carregar dados dos monitores:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Handler para abrir navegadores
ipcMain.handle('open-browsers', async (event, options) => {
  try {
    console.log('Iniciando abertura de navegadores com opções:', options);
    const result = await launchInstances(options);
    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error('Erro ao abrir navegadores:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Handler para navegar URL em navegador específico
ipcMain.handle('navigate-browser', async (event, navigatorId, url) => {
  try {
    console.log(`Navegando navegador ${navigatorId} para: ${url}`);
    const result = await navigateToUrl(navigatorId, url);
    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error('Erro ao navegar navegador:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Handler para navegar URL em todos os navegadores ativos
ipcMain.handle('navigate-all-browsers', async (event, url, syncStates = null, options = {}) => {
  try {
    console.log(`Navegando todos os navegadores para: ${url}`);
    const result = await navigateAllBrowsers(url, syncStates, options);
    return {
      success: result.success,
      navigatedBrowsers: result.navigatedBrowsers || 0,
      results: result.results || [],
      error: result.error || null
    };
  } catch (error) {
    console.error('Erro ao navegar todos os navegadores:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Handler para obter lista de navegadores ativos
ipcMain.handle('get-active-browsers', async (event, syncStates = null) => {
  try {
    const activeBrowsers = getActiveBrowsers(syncStates);
    return {
      success: true,
      browsers: activeBrowsers
    };
  } catch (error) {
    console.error('Erro ao obter navegadores ativos:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Handler para obter navegadores ativos com dados de perfil
ipcMain.handle('get-active-browsers-with-profiles', async (event, syncStates = null) => {
  try {
    const activeBrowsersWithProfiles = getActiveBrowsersWithProfiles(syncStates);
    return {
      success: true,
      browsers: activeBrowsersWithProfiles
    };
  } catch (error) {
    console.error('Erro ao obter navegadores ativos com perfis:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('check-pix-assignments', async (event, pixType, syncStates = null) => {
  try {
    const normalizedType = normalizePixKeyType(pixType);
    if (!normalizedType) {
      return { success: false, error: 'Tipo de chave PIX invalido.' };
    }

    const activeBrowsers = getActiveBrowsersWithProfiles(syncStates);
    if (!Array.isArray(activeBrowsers) || activeBrowsers.length === 0) {
      return { success: true, allProfilesHavePix: true, profilesWithoutPix: [], normalizedType };
    }

    const profilesWithoutPix = [];

    activeBrowsers.forEach(browser => {
      const profileFromConfig = getProfileById(browser.profileId) || {};
      const currentPix = profileFromConfig.pix || (browser.profile ? browser.profile.pix : null);

      if (!(currentPix && typeof currentPix === 'object' && currentPix.chave)) {
        profilesWithoutPix.push({
          profileId: browser.profileId,
          navigatorId: browser.navigatorId,
          hasPix: false
        });
        return;
      }

      const currentType = normalizePixKeyType(currentPix.type || currentPix.tipo);
      if (currentType !== normalizedType) {
        profilesWithoutPix.push({
          profileId: browser.profileId,
          navigatorId: browser.navigatorId,
          hasPix: true,
          currentPixType: currentType
        });
      }
    });

    return {
      success: true,
      allProfilesHavePix: profilesWithoutPix.length === 0,
      profilesWithoutPix,
      normalizedType
    };
  } catch (error) {
    console.error('Erro ao validar chaves PIX para saque:', error);
    return {
      success: false,
      error: 'Erro inesperado ao validar chaves PIX.'
    };
  }
});

ipcMain.handle('reserve-pix-keys-for-withdraw', async (event, pixType, syncStates = null) => {
  try {
    const normalizedType = normalizePixKeyType(pixType);
    if (!normalizedType) {
      return { success: false, error: 'Tipo de chave PIX invalido.' };
    }
    const activeBrowsers = getActiveBrowsersWithProfiles(syncStates);
    if (!Array.isArray(activeBrowsers) || activeBrowsers.length === 0) {
      return { success: false, error: 'Nenhum navegador ativo encontrado para executar o saque.' };
    }
    const browsersWithoutProfile = activeBrowsers.filter(browser => !browser.profileId);
    if (browsersWithoutProfile.length > 0) {
      return { success: false, error: 'Existe navegador ativo sem perfil salvo. Abra apenas navegadores com perfis registrados antes de iniciar o saque.' };
    }
    const profilesNeedingKey = []
    const alreadyConfigured = []
    activeBrowsers.forEach(browser => {
      const profileFromConfig = getProfileById(browser.profileId) || {};
      const currentPix = profileFromConfig.pix || (browser.profile ? browser.profile.pix : null);

      if (currentPix && typeof currentPix === 'object' && currentPix.chave) {
        const currentType = normalizePixKeyType(currentPix.type || currentPix.tipo);
        if (currentType === normalizedType) {
          const normalizedPix = {
            id: currentPix.id,
            type: currentType,
            tipo: currentPix.tipo || getDefaultLabel(currentType),
            chave: currentPix.chave
          };
          alreadyConfigured.push({
            profileId: browser.profileId,
            navigatorId: browser.navigatorId,
            assignedKey: normalizedPix
          });
          updateActiveBrowserProfile(browser.navigatorId, { pix: normalizedPix });
          return;
        }
      }

      profilesNeedingKey.push({
        profileId: browser.profileId,
        navigatorId: browser.navigatorId,
        previousPix: currentPix
      });
    });

    let reservationResult = { success: true, assignments: [], consumedKeys: [] };
    if (profilesNeedingKey.length > 0) {
      reservationResult = await reserveAndAssignPixKeys(normalizedType, profilesNeedingKey);
      if (!reservationResult.success) {
        return reservationResult;
      }
      reservationResult.assignments.forEach(assignment => {
        updateActiveBrowserProfile(assignment.navigatorId, { pix: assignment.assignedKey });
      });
    }
    const combinedAssignments = [
      ...alreadyConfigured,
      ...(reservationResult.assignments || [])
    ];
    return {
      success: true,
      assignments: combinedAssignments,
      consumedKeys: reservationResult.consumedKeys || [],
      normalizedType
    };
  } catch (error) {
    console.error('Erro ao reservar chaves PIX para saque:', error);
    return {
      success: false,
      error: 'Erro inesperado ao reservar chaves PIX.'
    };
  }
});

// Handler para injetar script por nome em todos os navegadores
ipcMain.handle('inject-script', async (event, scriptName, syncStates = null) => {
  try {
    console.log(`Injetando script '${scriptName}' em todos os navegadores`);
    console.log('[main.js] syncStates recebido no IPC:', syncStates);
    const result = await scriptInjector.injectScript(scriptName, syncStates);
    return result;
  } catch (error) {
    console.error('Erro ao injetar script:', error);
    return {
      success: false,
      message: error.message,
      results: []
    };
  }
});

// Handler para injetar script por nome em todos os navegadores após navegação
ipcMain.handle('inject-script-post-navigation', async (event, scriptName, syncStates = null) => {
  try {
    console.log(`Injetando script '${scriptName}' em todos os navegadores (pós-navegação)`);
    const result = await scriptInjector.injectScriptPostNavigation(scriptName, syncStates);
    return result;
  } catch (error) {
    console.error('Erro ao injetar script pós-navegação:', error);
    return {
      success: false,
      message: error.message,
      results: []
    };
  }
});

// Handler para injetar script customizado em todos os navegadores
ipcMain.handle('inject-custom-script', async (event, scriptCode, syncStates = null) => {
  try {
    console.log('Injetando script customizado em todos os navegadores');
    const result = await scriptInjector.injectCustomScript(scriptCode, syncStates);
    return result;
  } catch (error) {
    console.error('Erro ao injetar script customizado:', error);
    return {
      success: false,
      message: error.message,
      results: []
    };
  }
});

// Handler para listar scripts disponíveis
ipcMain.handle('get-available-scripts', async () => {
  try {
    const scripts = scriptInjector.getAvailableScripts();
    return {
      success: true,
      scripts
    };
  } catch (error) {
    console.error('Erro ao obter scripts disponíveis:', error);
    return {
      success: false,
      error: error.message,
      scripts: []
    };
  }
});

// Handler para recarregar lista de scripts
ipcMain.handle('reload-scripts', async () => {
  try {
    const scripts = scriptInjector.reloadScripts();
    return {
      success: true,
      scripts
    };
  } catch (error) {
    console.error('Erro ao recarregar scripts:', error);
    return {
      success: false,
      error: error.message,
      scripts: []
    };
  }
});

// Handlers para gerenciamento de perfis
ipcMain.handle('get-all-profiles', async () => {
  try {
    console.log('Obtendo todos os perfis...');
    const profiles = await getAllProfiles();
    return { success: true, profiles };
  } catch (error) {
    console.error('Erro ao obter perfis:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-profile-by-id', async (event, profileId) => {
  try {
    console.log(`Obtendo perfil com ID: ${profileId}`);
    const profile = await getProfileById(profileId);
    return { success: true, profile };
  } catch (error) {
    console.error('Erro ao obter perfil por ID:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-profile', async (event, profileId) => {
  try {
    console.log(`Removendo perfil com ID: ${profileId}`);
    const result = await removeProfile(profileId);
    broadcastProfilesUpdate('removed', { profileId });
    return { success: true, result };
  } catch (error) {
    console.error('Erro ao remover perfil:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-new-profile', async () => {
  try {
    console.log('Criando novo perfil...');
    const newProfile = await generateProfile();
    const result = await addProfile(newProfile);
    broadcastProfilesUpdate('created', { profileId: newProfile?.profile });
    return { success: true, profile: newProfile, result };
  } catch (error) {
    console.error('Erro ao criar novo perfil:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-profile', async (event, profileId, updates) => {
  try {
    console.log(`Atualizando perfil com ID: ${profileId}`);
    const result = await updateProfile(profileId, updates);
    broadcastProfilesUpdate('updated', { profileId });
    return { success: true, result };
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return { success: false, error: error.message };
  }
});

// Handler para excluir todos os perfis
ipcMain.handle('delete-all-profiles', async (event) => {
  try {
    console.log('Excluindo todos os perfis...');
    // Usando imports globais já disponíveis
    
    // Obter todos os perfis
    const profiles = getAllProfiles();
    const totalProfiles = profiles.length;
    
    if (totalProfiles === 0) {
      broadcastProfilesUpdate('deleted-all', { profiles: [] });
      return { success: true, message: 'Nenhum perfil para excluir' };
    }
    
    // Enviar progresso inicial
    event.sender.send('delete-progress', {
      current: 0,
      total: totalProfiles,
      currentItem: 'Iniciando exclusão...'
    });
    
    // Remover todas as pastas de perfis
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const profilePath = path.join(PROFILES_DIR, profile.profile);
      
      // Enviar progresso atual
      event.sender.send('delete-progress', {
        current: i,
        total: totalProfiles,
        currentItem: `Excluindo perfil: ${profile.name || profile.profile}`
      });
      
      try {
        await fs.rmdir(profilePath, { recursive: true });
        console.log(`Pasta do perfil ${profile.profile} removida`);
      } catch (error) {
        console.warn(`Erro ao remover pasta do perfil ${profile.profile}:`, error.message);
      }
      
      // Pequeno delay para permitir atualização da UI
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Limpar config.json
    const config = { profiles: [], lastBrowserId: 1 };
    saveConfig(config);
    
    // Resetar lastBrowserId no sistema para 1
    await saveLastBrowserId(1);
    
    // Enviar progresso final
    event.sender.send('delete-progress', {
      current: totalProfiles,
      total: totalProfiles,
      currentItem: 'Exclusão concluída!'
    });
    
    broadcastProfilesUpdate('deleted-all', {});
    return { success: true, message: 'Todos os perfis foram excluídos' };
  } catch (error) {
    console.error('Erro ao excluir todos os perfis:', error);
    return { success: false, error: error.message };
  }
});

// Handler para iniciar navegador com perfil específico
ipcMain.handle('start-browser-with-profile', async (event, profileId) => {
  try {
    console.log(`Iniciando navegador para perfil: ${profileId}`);
    // Usando imports globais já disponíveis
    
    const profile = getProfileById(profileId);
    if (!profile) {
      return { success: false, error: 'Perfil não encontrado' };
    }
    
    // Configurar opções para lançar o navegador
    const options = {
      simultaneousOpenings: 1,
      useAllMonitors: false,
      selectedMonitors: [],
      profileId: profileId,
      proxy: profile.proxy || null,
      urls: profile.url ? [profile.url] : ['about:blank'], // Usar URL salva no perfil
      disableMoverJanelas: true // Desabilitar moverJanelas para navegadores iniciados pelo botão play
    };
    
    console.log(`Iniciando navegador com URL: ${profile.url || 'about:blank'}`);
    const browsers = await launchInstances(options);
    
    // Se há URL salva, navegar para ela após inicialização
    if (profile.url && browsers && browsers.length > 0) {
      try {
        // Aguardar um pouco para o navegador estar pronto
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Navegar para a URL do perfil
        const navigationResult = await navigateToUrl(profile.navigatorId || '1', profile.url); // Usar navigatorId do perfil ou ID '1' como fallback
        console.log(`Navegação para ${profile.url}:`, navigationResult);
      } catch (navError) {
        console.warn('Erro na navegação automática:', navError.message);
      }
    }
    
    return { success: true, browsers, message: `Navegador iniciado para perfil ${profileId}` };
  } catch (error) {
    console.error('Erro ao iniciar navegador:', error);
    return { success: false, error: error.message };
  }
});

// Handler para injetar script específico em perfil
ipcMain.handle('inject-script-in-profile', async (event, profileId, scriptName) => {
  try {
    console.log(`Injetando script ${scriptName} no perfil: ${profileId}`);
    // Usando imports globais já disponíveis
    
    // Encontrar o navegador ativo para este perfil
    const activeBrowsersWithProfiles = getActiveBrowsersWithProfiles();
    const browserData = activeBrowsersWithProfiles.find(browser => {
      return browser.profileId === profileId;
    });
    
    if (!browserData) {
      return { success: false, error: 'Navegador não encontrado para este perfil' };
    }
    
    const navigatorId = browserData.navigatorId;
    
    // Carregar e injetar o script
    const scriptContent = await scriptInjector.loadScript(scriptName);
    if (!scriptContent) {
      return { success: false, error: `Script ${scriptName} não encontrado` };
    }
    
    await injectScriptInBrowser(navigatorId, scriptContent, true);
    return { success: true, message: `Script ${scriptName} injetado no perfil ${profileId}` };
  } catch (error) {
    console.error('Erro ao injetar script:', error);
    return { success: false, error: error.message };
  }
});

// Handler para excluir perfil específico
ipcMain.handle('delete-profile', async (event, profileId) => {
  try {
    console.log(`Excluindo perfil: ${profileId}`);
    // Usando imports globais já disponíveis
    
    // Remover pasta do perfil
    const profilePath = path.join(PROFILES_DIR, profileId);
    try {
      await fs.rmdir(profilePath, { recursive: true });
      console.log(`Pasta do perfil ${profileId} removida`);
    } catch (error) {
      console.warn(`Erro ao remover pasta do perfil ${profileId}:`, error.message);
    }
    
    // Remover do config.json
    const result = removeProfile(profileId);
    
    return { success: true, result, message: `Perfil ${profileId} excluído` };
  } catch (error) {
    console.error('Erro ao excluir perfil:', error);
    return { success: false, error: error.message };
  }
});

// Handler para salvar URL em perfis específicos ou todos
ipcMain.handle('save-url-to-profiles', async (event, url, profileIds = null) => {
  try {
    console.log(`Salvando URL: ${url}`);
    
    const config = loadConfig();
    if (!config.profiles || config.profiles.length === 0) {
      return { success: false, error: 'Nenhum perfil encontrado' };
    }
    
    let updatedCount = 0;
    
    if (profileIds && Array.isArray(profileIds) && profileIds.length > 0) {
      // Atualizar apenas perfis específicos
      console.log(`Atualizando URL apenas nos perfis: ${profileIds.join(', ')}`);
      config.profiles.forEach(profile => {
        if (profileIds.includes(profile.profile)) {
          profile.url = url;
          updatedCount++;
        }
      });
    } else {
      // Atualizar todos os perfis (comportamento antigo)
      console.log('Atualizando URL em todos os perfis');
      config.profiles.forEach(profile => {
        profile.url = url;
        updatedCount++;
      });
    }
    
    saveConfig(config);
    
    return { success: true, message: `URL salva em ${updatedCount} perfil(s)`, updatedProfiles: updatedCount };
  } catch (error) {
    console.error('Erro ao salvar URL nos perfis:', error);
    return { success: false, error: error.message };
  }
});

// Neste arquivo você pode incluir o resto do código específico do processo principal da sua aplicação.
// Você também pode colocá-los em arquivos separados e importá-los aqui.