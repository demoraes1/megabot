const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');
const { moverJanelas } = require('../browser-logic/moverjanelas.js');
const { carregarDadosMonitores } = require('./monitor-detector.js');

// Importar o profile-manager
const profileManager = require('../automation/profile-manager.js');

// Sistema de logging com níveis
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;

function log(level, message, ...args) {
    if (level >= CURRENT_LOG_LEVEL) {
        const timestamp = new Date().toISOString();
        const levelName = Object.keys(LOG_LEVELS)[level];
        console.log(`[${timestamp}] [${levelName}] ${message}`, ...args);
    }
}

const logger = {
    debug: (message, ...args) => log(LOG_LEVELS.DEBUG, message, ...args),
    info: (message, ...args) => log(LOG_LEVELS.INFO, message, ...args),
    warn: (message, ...args) => log(LOG_LEVELS.WARN, message, ...args),
    error: (message, ...args) => log(LOG_LEVELS.ERROR, message, ...args)
};

logger.info('Profile Manager carregado com sucesso');

// Sistema de rastreamento de processos de navegadores
const activeBrowsers = new Map(); // Map<navigatorId, childProcess>

// Configurações baseadas no teste.js
const LARGURA_LOGICA = 502;
const ALTURA_LOGICA = 800;
const FATOR_ESCALA = 0.65;
const DELAY_PARA_REGISTRO_JANELAS = 10; // ms - reduzido pois o processamento em lote ajuda

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function launchInstances(options) {
    logger.info('Iniciando lançamento de navegadores com opções:', options);
    
    const scriptPath = path.join(__dirname, '../browser-logic/stealth-instance.js');
    const pids = [];
    
    // 1. Carregar configurações do app para obter tamanho do lote
    let TAMANHO_LOTE = 1; // valor padrão
    try {
        const configPath = path.join(__dirname, '../config/app-settings.json');
        if (fs.existsSync(configPath)) {
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (configData.settings && configData.settings.batchSize) {
                TAMANHO_LOTE = configData.settings.batchSize;
                logger.info(`Tamanho do lote configurado: ${TAMANHO_LOTE}`);
            }
        }
    } catch (error) {
        logger.warn('Erro ao carregar configuração de tamanho de lote, usando valor padrão:', error.message);
    }
    
    logger.info(`\nIniciando ${options.simultaneousOpenings} navegadores...`);
    
    // 2. Carregar dados dos monitores salvos
    let resultadoCarregamento;
    try {
        resultadoCarregamento = await carregarDadosMonitores();
        if (!resultadoCarregamento.success) {
            logger.error('Erro ao carregar dados dos monitores:', resultadoCarregamento.error);
            return [];
        }
        logger.info('Dados dos monitores carregados com sucesso.');
    } catch (error) {
        logger.error('Erro ao carregar dados dos monitores:', error.message);
        return [];
    }
    
    const dadosMonitores = resultadoCarregamento.dados;
    
    // Função auxiliar para processar posições de monitores
    const processarPosicoesMonitor = (monitorData, monitorId = null) => {
        const posicoes = [];
        if (monitorData.posicoes && Array.isArray(monitorData.posicoes)) {
            monitorData.posicoes.forEach(pos => {
                posicoes.push({
                    id: pos.id,
                    x: pos.x,
                    y: pos.y,
                    monitorId: monitorId || monitorData.id
                });
            });
        }
        return posicoes;
    };

    // 3. Determinar posições disponíveis baseado na seleção de monitores
    let posicoesDisponiveis = [];
    if (dadosMonitores && dadosMonitores.posicionamento && Array.isArray(dadosMonitores.posicionamento)) {
        if (options.useAllMonitors) {
            // Usar todos os monitores - procurar pela entrada específica "todos_monitores"
            logger.info('Usando todos os monitores disponíveis');
            const todosMonitoresData = dadosMonitores.posicionamento.find(m => m.id === 'todos_monitores');
            
            if (todosMonitoresData && todosMonitoresData.posicoes && Array.isArray(todosMonitoresData.posicoes)) {
                logger.info(`Encontradas ${todosMonitoresData.posicoes.length} posições para todos os monitores`);
                posicoesDisponiveis = processarPosicoesMonitor(todosMonitoresData, 'todos_monitores');
            } else {
                logger.warn('Dados de posicionamento para "todos_monitores" não encontrados, usando fallback');
                // Fallback: usar posições de todos os monitores individuais
                dadosMonitores.posicionamento.forEach(monitorData => {
                    if (monitorData.id !== 'todos_monitores') {
                        posicoesDisponiveis.push(...processarPosicoesMonitor(monitorData));
                    }
                });
            }
        } else if (options.selectedMonitor) {
            // Usar apenas o monitor selecionado
            const monitorId = `monitor_${options.selectedMonitor.id}`;
            logger.info(`Usando apenas o monitor selecionado: ${options.selectedMonitor.nome} (ID: ${monitorId})`);
            
            const monitorData = dadosMonitores.posicionamento.find(m => m.id === monitorId);
            if (monitorData) {
                posicoesDisponiveis = processarPosicoesMonitor(monitorData);
            } else {
                logger.warn(`Dados de posicionamento não encontrados para o monitor ${monitorId}`);
            }
        } else {
            // Fallback: usar todos os monitores se não houver seleção específica
            logger.info('Nenhum monitor específico selecionado, usando todos disponíveis');
            dadosMonitores.posicionamento.forEach(monitorData => {
                posicoesDisponiveis.push(...processarPosicoesMonitor(monitorData));
            });
        }
    }
    
    logger.info(`Posições disponíveis encontradas: ${posicoesDisponiveis.length}`);
    if (posicoesDisponiveis.length > 0) {
        logger.debug('Primeiras 3 posições:', posicoesDisponiveis.slice(0, 3));
    }
    
    if (posicoesDisponiveis.length === 0) {
        logger.error('Nenhuma posição disponível encontrada nos dados dos monitores.');
        return [];
    }
    
    // 4. Selecionar posições para o número de navegadores solicitado
    const numNavegadores = Math.min(options.simultaneousOpenings, posicoesDisponiveis.length);
    const posicoesParaLancar = posicoesDisponiveis.slice(0, numNavegadores);
    
    // 5. Configuração para movimentação
    const configMovimentacao = {
        LARGURA_LOGICA,
        ALTURA_LOGICA,
        FATOR_ESCALA,
        DELAY_PARA_REGISTRO_JANELAS
    };
    
    let totalJanelasMovidas = 0;
    logger.info(`\nIniciando o processo para ${numNavegadores} navegadores em lotes de ${TAMANHO_LOTE}.\n`);

    // 6. Processar navegadores em lotes
    for (let i = 0; i < posicoesParaLancar.length; i += TAMANHO_LOTE) {
        const lote = posicoesParaLancar.slice(i, i + TAMANHO_LOTE);
        const numeroLote = (i / TAMANHO_LOTE) + 1;
        
        logger.info(`--- Processando Lote ${numeroLote}: ${lote.length} navegadores ---`);

        // FASE 1 (para o lote): Lançamento dos Navegadores em paralelo
        const launchPromises = lote.map(async (posicao, index) => {
            const child = fork(scriptPath);
            
            // Gerar perfil para este navegador
            let profile = null;
            if (profileManager) {
                try {
                    profile = await profileManager.createNewProfile();
                    logger.info(`Perfil gerado para navegador ${posicao.id}:`, {
                        profileId: profile.id,
                        usuario: profile.usuario,
                        nome: profile.nome_completo
                    });
                } catch (error) {
                    logger.error(`Erro ao gerar perfil para navegador ${posicao.id}:`, error.message);
                }
            } else {
                logger.warn(`Profile Manager não disponível para navegador ${posicao.id}`);
            }
            
            const instanceOptions = {
                ...options,
                navigatorId: posicao.id,
                url: options.urls ? options.urls[index % options.urls.length] : 'about:blank',
                position: posicao,
                profile: profile, // Adicionar o perfil às opções
                windowConfig: {
                    LARGURA_LOGICA,
                    ALTURA_LOGICA,
                    FATOR_ESCALA
                }
            };
            
            child.send(instanceOptions);
            
            // Adicionar ao sistema de rastreamento
            activeBrowsers.set(posicao.id, child);
            
            // Adicionar listeners para o processo filho
            child.on('message', (message) => {
                logger.debug(`Navegador ${posicao.id}:`, message);
            });
            
            child.on('error', (error) => {
                logger.error(`Erro no navegador ${posicao.id}:`, error);
            });
            
            child.on('exit', (code) => {
                logger.info(`Navegador ${posicao.id} encerrado com código:`, code);
                // Remover do sistema de rastreamento quando o processo encerrar
                activeBrowsers.delete(posicao.id);
            });
            
            pids.push(child.pid);
            logger.info(`Navegador ID_${posicao.id} lançado.`);
            return child;
        });
        
        await Promise.all(launchPromises);
        logger.info(`Lote ${numeroLote} lançado.`);

        // FASE 2 (para o lote): Mover Janelas do lote atual
        try {
            const janelasMovidasNoLote = await moverJanelas(lote, configMovimentacao);
            totalJanelasMovidas += janelasMovidasNoLote;
            logger.info(`--- Lote ${numeroLote} concluído: ${janelasMovidasNoLote} janelas reposicionadas ---\n`);
        } catch (error) {
            logger.error(`Erro ao mover janelas do lote ${numeroLote}:`, error.message);
        }
    }

    logger.info(`\nOperação concluída. ${totalJanelasMovidas} de ${numNavegadores} janelas foram reposicionadas com sucesso!`);

    return {
        pids,
        janelasMovidas: totalJanelasMovidas,
        totalNavegadores: numNavegadores
    };
}

/**
 * Navega para uma URL em um navegador específico
 * @param {string} navigatorId - ID do navegador
 * @param {string} url - URL para navegar
 * @returns {Promise<boolean>} - True se a navegação foi enviada com sucesso
 */
function navigateToUrl(navigatorId, url) {
    return new Promise((resolve) => {
        const browserProcess = activeBrowsers.get(navigatorId);
        
        if (!browserProcess) {
            logger.error(`Navegador ${navigatorId} não encontrado nos processos ativos`);
            resolve(false);
            return;
        }
        
        try {
            browserProcess.send({
                action: 'navigate',
                url: url
            });
            
            logger.info(`Comando de navegação enviado para navegador ${navigatorId}: ${url}`);
            resolve(true);
        } catch (error) {
            logger.error(`Erro ao enviar comando de navegação para navegador ${navigatorId}:`, error);
            resolve(false);
        }
    });
}

/**
 * Obtém lista de navegadores ativos
 * @returns {Array<string>} - Array com IDs dos navegadores ativos
 */
function getActiveBrowsers() {
    return Array.from(activeBrowsers.keys());
}

/**
 * Navega para URLs em todos os navegadores ativos
 * @param {string|Array<string>} urls - URL ou array de URLs
 * @returns {Promise<Object>} - Resultado da operação
 */
async function navigateAllBrowsers(urls) {
    const activeBrowserIds = getActiveBrowsers();
    
    if (activeBrowserIds.length === 0) {
        return {
            success: false,
            error: 'Nenhum navegador ativo encontrado'
        };
    }
    
    const urlArray = Array.isArray(urls) ? urls : [urls];
    const results = [];
    
    // Aguardar todas as navegações
    for (let i = 0; i < activeBrowserIds.length; i++) {
        const browserId = activeBrowserIds[i];
        const url = urlArray[i % urlArray.length]; // Rotacionar URLs se houver mais navegadores que URLs
        const success = await navigateToUrl(browserId, url);
        results.push({ browserId, url, success });
    }
    
    return {
        success: true,
        navigatedBrowsers: results.length,
        results: results
    };
}

/**
 * Injeta script em um navegador específico
 * @param {string} navigatorId - ID do navegador
 * @param {string} scriptContent - Conteúdo do script a ser injetado
 * @param {boolean} waitForLoad - Se deve aguardar o carregamento da página
 * @returns {Promise<boolean>} - Sucesso da operação
 */
function injectScriptInBrowser(navigatorId, scriptContent, waitForLoad = false) {
    return new Promise((resolve) => {
        const browserProcess = activeBrowsers.get(navigatorId);
        
        if (!browserProcess) {
            logger.error(`Navegador ${navigatorId} não encontrado nos processos ativos`);
            resolve(false);
            return;
        }
        
        try {
            browserProcess.send({
                action: 'inject-script',
                script: scriptContent,
                waitForLoad: waitForLoad
            });
            
            logger.info(`Script injetado no navegador ${navigatorId}`);
            resolve(true);
        } catch (error) {
            logger.error(`Erro ao injetar script no navegador ${navigatorId}:`, error);
            resolve(false);
        }
    });
}

/**
 * Injeta script em um navegador específico após navegação (aguarda carregamento)
 * @param {string} navigatorId - ID do navegador
 * @param {string} scriptContent - Conteúdo do script a ser injetado
 * @returns {Promise<boolean>} - Sucesso da operação
 */
/**
 * Injeta script em todos os navegadores ativos
 * @param {string} scriptContent - Conteúdo do script a ser injetado
 * @param {boolean} waitForLoad - Se deve aguardar o carregamento da página
 * @returns {Promise<Object>} - Resultado da operação
 */
async function injectScriptInAllBrowsers(scriptContent, waitForLoad = false) {
    const activeBrowserIds = getActiveBrowsers();
    
    if (activeBrowserIds.length === 0) {
        return {
            success: false,
            message: 'Nenhum navegador ativo encontrado',
            results: []
        };
    }
    
    const results = [];
    
    for (const browserId of activeBrowserIds) {
        const success = await injectScriptInBrowser(browserId, scriptContent, waitForLoad);
        results.push({ browserId, success });
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return {
        success: successCount > 0,
        message: `Script injetado em ${successCount}/${activeBrowserIds.length} navegador(es)`,
        results: results
    };
}

/**
 * Injeta script em todos os navegadores ativos após navegação (aguarda carregamento)
 * @param {string} scriptContent - Conteúdo do script a ser injetado
 * @returns {Promise<Object>} - Resultado da operação
 */
async function injectScriptInAllBrowsersPostNavigation(scriptContent) {
    return injectScriptInAllBrowsers(scriptContent, true);
}

/**
 * Inicializa o sistema de perfis
 * @returns {Object} Resultado da inicialização
 */
function initializeProfileSystem() {
    try {
        const result = profileManager.initializeProfileSystem();
        logger.info('Sistema de perfis inicializado pelo browser-manager');
        return { success: true, data: result };
    } catch (error) {
        logger.error('Erro ao inicializar sistema de perfis:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Obtém todos os perfis salvos
 * @returns {Array} Lista de perfis
 */
function getAllProfiles() {
    try {
        return profileManager.getAllProfiles();
    } catch (error) {
        logger.error('Erro ao obter perfis:', error.message);
        return [];
    }
}

module.exports = { 
    launchInstances, 
    navigateToUrl, 
    getActiveBrowsers, 
    navigateAllBrowsers,
    injectScriptInBrowser,
    injectScriptInAllBrowsers,
    injectScriptInAllBrowsersPostNavigation,
    initializeProfileSystem,
    getAllProfiles
};