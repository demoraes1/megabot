const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { detectarMonitores, calcularCapacidadeMonitor, salvarDadosMonitores, carregarDadosMonitores } = require('./monitor-detector');
const { launchInstances, navigateToUrl, navigateAllBrowsers, getActiveBrowsers } = require('./browser-manager');
const ChromiumDownloader = require('../infrastructure/chromium-downloader');

// Função para criar a janela principal
function createWindow() {
  // Criar a janela do navegador
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../renderer/assets/icon.png'), // Opcional: adicione um ícone
    show: false // Não mostrar até estar pronto
  });

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
app.whenReady().then(() => {
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
ipcMain.handle('save-settings', async (event, settings) => {
  try {
    // Garantir que a pasta config existe
    const configDir = path.dirname(settingsPath);
    await fs.mkdir(configDir, { recursive: true });
    
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
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
    
    const result = calcularCapacidadeMonitor(monitor, larguraLogica, alturaLogica, fatorEscala);
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
ipcMain.handle('save-monitor-data', async (event, monitoresData, posicionamentoData) => {
  try {
    const result = salvarDadosMonitores(monitoresData, posicionamentoData);
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
ipcMain.handle('navigate-all-browsers', async (event, url) => {
  try {
    console.log(`Navegando todos os navegadores para: ${url}`);
    const result = await navigateAllBrowsers(url);
    return {
      success: result.success,
      navigatedBrowsers: result.navigatedBrowsers || 0,
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
ipcMain.handle('get-active-browsers', async () => {
  try {
    const activeBrowsers = getActiveBrowsers();
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

// Neste arquivo você pode incluir o resto do código específico do processo principal da sua aplicação.
// Você também pode colocá-los em arquivos separados e importá-los aqui.