const path = require('path');
const fs = require('fs');
const { moverJanelas } = require('../browser-logic/moverjanelas.js');
const { carregarDadosMonitores } = require('./monitor-detector.js');
const stealth = require('../browser-logic/stealth-instance.js');

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

// Sistema de rastreamento de navegadores
const activeBrowsers = new Map(); // Map<navigatorId, { browser, page }>

// Configurações baseadas no teste.js
const LARGURA_LOGICA = 502;
const ALTURA_LOGICA = 800;
const FATOR_ESCALA = 0.65;
const DELAY_PARA_REGISTRO_JANELAS = 0; // ms - delay para registro de janelas (processamento em lotes removido)

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function launchInstances(options) {
    logger.info('Iniciando lançamento de navegadores com opções:', options);
    
    const launchedBrowsers = [];
    
    // 1. Configuração removida - processamento em lotes desabilitado para melhor performance
    // Todos os navegadores serão lançados em paralelo, similar ao sistema antigo
    
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
    if (dadosMonitores && dadosMonitores.posicionamento && typeof dadosMonitores.posicionamento === 'object') {
        if (options.useAllMonitors) {
            // Usar todos os monitores disponíveis
            logger.info('Usando todos os monitores disponíveis');
            
            // Iterar sobre todos os monitores no objeto posicionamento
            Object.keys(dadosMonitores.posicionamento).forEach(monitorId => {
                const monitorData = dadosMonitores.posicionamento[monitorId];
                if (monitorData && monitorData.posicoes && Array.isArray(monitorData.posicoes)) {
                    logger.info(`Encontradas ${monitorData.posicoes.length} posições para monitor ${monitorId}`);
                    posicoesDisponiveis.push(...processarPosicoesMonitor(monitorData, monitorId));
                }
            });
        } else if (options.selectedMonitor) {
            // Usar apenas o monitor selecionado
            const monitorId = options.selectedMonitor.id.toString();
            logger.info(`Usando apenas o monitor selecionado: ${options.selectedMonitor.nome} (ID: ${monitorId})`);
            
            const monitorData = dadosMonitores.posicionamento[monitorId];
            if (monitorData && monitorData.posicoes && Array.isArray(monitorData.posicoes)) {
                posicoesDisponiveis = processarPosicoesMonitor(monitorData, monitorId);
            } else {
                logger.warn(`Dados de posicionamento não encontrados para o monitor ${monitorId}`);
            }
        } else {
            // Fallback: usar todos os monitores se não houver seleção específica
            logger.info('Nenhum monitor específico selecionado, usando todos disponíveis');
            Object.keys(dadosMonitores.posicionamento).forEach(monitorId => {
                const monitorData = dadosMonitores.posicionamento[monitorId];
                if (monitorData && monitorData.posicoes && Array.isArray(monitorData.posicoes)) {
                    posicoesDisponiveis.push(...processarPosicoesMonitor(monitorData, monitorId));
                }
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
    logger.info(`\nIniciando o processo para ${numNavegadores} navegadores em paralelo.\n`);

    // 6. Lançar todos os navegadores em paralelo
    const launchPromises = posicoesParaLancar.map(async (posicao, index) => {
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
        
        try {
            const { browser, page } = await stealth.startBrowser(instanceOptions);
            activeBrowsers.set(posicao.id, { browser, page, profile: profile });
            
            browser.on('disconnected', () => {
                console.log(`Navegador ${posicao.id} foi fechado.`);
                activeBrowsers.delete(posicao.id);
            });
            
            logger.info(`Navegador ID_${posicao.id} lançado com sucesso em single-process.`);
            launchedBrowsers.push({ browser, page });
            return { browser, page };
        } catch (error) {
            logger.error(`Falha ao lançar o navegador ID_${posicao.id}:`, error.message);
            return null;
        }
    });
        
    // Aguardar o lançamento de todos os navegadores
    await Promise.all(launchPromises);
    logger.info('Todos os navegadores foram lançados.');

    // Mover todas as janelas
    try {
        totalJanelasMovidas = await moverJanelas(posicoesParaLancar, configMovimentacao);
        logger.info(`Todas as janelas foram reposicionadas: ${totalJanelasMovidas} janelas movidas.`);
    } catch (error) {
        logger.error('Erro ao mover janelas:', error.message);
    }

    logger.info(`\nOperação concluída. ${totalJanelasMovidas} de ${numNavegadores} janelas foram reposicionadas com sucesso!`);

    return {
        launchedBrowsers: launchedBrowsers.length,
        janelasMovidas: totalJanelasMovidas,
        totalNavegadores: numNavegadores
    };
}

/**
 * Navega para uma URL em um navegador específico
 * @param {string} navigatorId - ID do navegador
 * @param {string} url - URL para navegar
 * @returns {Promise<boolean>} - True se a navegação foi bem-sucedida
 */
async function navigateToUrl(navigatorId, url) {
    const browserInstance = activeBrowsers.get(navigatorId);
    
    if (!browserInstance || !browserInstance.page) {
        logger.error(`Navegador ${navigatorId} não encontrado nos navegadores ativos`);
        return false;
    }
    
    try {
        // Normalizar URL antes da navegação
        const normalizedUrl = stealth.normalizeUrl(url);
        logger.debug(`URL original: ${url}, URL normalizada: ${normalizedUrl}`);
        
        await browserInstance.page.goto(normalizedUrl);
        logger.info(`Navegação bem-sucedida para navegador ${navigatorId}: ${normalizedUrl}`);
        return true;
    } catch (error) {
        logger.error(`Erro ao navegar para ${url} no navegador ${navigatorId}:`, error.message);
        return false;
    }
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
    
    // Criar todas as promessas de navegação em paralelo
    const navigationPromises = activeBrowserIds.map(async (browserId, i) => {
        const url = urlArray[i % urlArray.length]; // Rotacionar URLs se houver mais navegadores que URLs
        const success = await navigateToUrl(browserId, url);
        return { browserId, url, success };
    });
    
    // Aguardar todas as navegações em paralelo
    const results = await Promise.all(navigationPromises);
    
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
async function injectScriptInBrowser(navigatorId, scriptContent, waitForLoad = false) {
    const browserInstance = activeBrowsers.get(navigatorId);
    
    if (!browserInstance || !browserInstance.page) {
        logger.error(`Navegador ${navigatorId} não encontrado nos navegadores ativos`);
        return false;
    }
    
    try {
        if (waitForLoad) {
            // Aguardar que a página esteja completamente carregada
            await browserInstance.page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
            // Aguardar um pouco mais para garantir que todos os recursos foram carregados
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Injetar dados do perfil se disponível
        if (browserInstance.profile) {
            const profileData = {
                usuario: browserInstance.profile.usuario,
                senha: browserInstance.profile.senha,
                telefone: browserInstance.profile.telefone,
                nome_completo: browserInstance.profile.nome_completo,
                cpf: browserInstance.profile.cpf
            };
            
            await browserInstance.page.evaluate((data) => {
                window.profileData = data;
                console.log('[ProfileData] Dados do perfil injetados:', data);
            }, profileData);
            
            logger.info(`Dados do perfil ${browserInstance.profile.id} injetados no navegador ${navigatorId}`);
        }
        
        await browserInstance.page.evaluate(scriptContent);
        logger.info(`Script injetado com sucesso no navegador ${navigatorId}`);
        return true;
    } catch (error) {
        logger.error(`Erro ao injetar script no navegador ${navigatorId}:`, error.message);
        return false;
    }
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