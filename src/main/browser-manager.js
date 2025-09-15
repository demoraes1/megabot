const path = require('path');
const fs = require('fs');
const { moverJanelas } = require('../browser-logic/moverjanelas.js');
const { carregarDadosMonitores } = require('./monitor-detector.js');
const stealth = require('../browser-logic/stealth-instance.js');

// Importar o profile-manager
const profileManager = require('../automation/profile-manager.js');

// Caminho para o arquivo de configuração principal
const CONFIG_FILE = path.join(profileManager.PROFILES_DIR, 'config.json');

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
// Valores padrão de resolução (serão sobrescritos pelas opções se fornecidas)
let LARGURA_LOGICA = 502;
let ALTURA_LOGICA = 800;
let FATOR_ESCALA = 0.65;
const DELAY_PARA_REGISTRO_JANELAS = 0; // ms - delay para registro de janelas (processamento em lotes removido)

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Carrega o último ID usado do arquivo de configuração
 * @returns {number} Último ID usado ou 0 se não existir
 */
function loadLastBrowserId() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
            const config = JSON.parse(configData);
            // Se lastBrowserId não existir, adicionar automaticamente com valor 0
            if (config.lastBrowserId === undefined) {
                config.lastBrowserId = 0;
                fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
                logger.info('lastBrowserId adicionado automaticamente ao config.json com valor 0');
            }
            return config.lastBrowserId || 0;
        }
    } catch (error) {
        logger.warn('Erro ao carregar último ID do navegador, iniciando do 0:', error.message);
    }
    return 0;
}

/**
 * Salva o último ID usado no arquivo de configuração
 * @param {number} lastId - Último ID usado
 */
function saveLastBrowserId(lastId) {
    try {
        // Garantir que o diretório existe
        profileManager.ensureProfilesDirectory();
        
        // Carregar configuração existente
        let config = { profiles: [] };
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
            config = JSON.parse(configData);
        }
        
        // Atualizar apenas o lastBrowserId
        config.lastBrowserId = lastId;
        
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        logger.info(`Último ID do navegador salvo: ${lastId}`);
    } catch (error) {
        logger.error('Erro ao salvar último ID do navegador:', error.message);
    }
}

// Variável para controle sequencial de IDs
let idSequencial = 0;

async function launchInstances(options) {
    // Recarregar idSequencial do arquivo para garantir valor atualizado
    idSequencial = loadLastBrowserId();
    logger.info('Iniciando lançamento de navegadores com opções:', options);
    logger.info(`ID sequencial carregado: ${idSequencial}`);
    
    // Aplicar configuração de resolução das opções se fornecida
    // IMPORTANTE: A escala sempre será 0.65, apenas as dimensões lógicas mudam
    FATOR_ESCALA = 0.65; // Escala fixa
    
    if (options.resolution) {
        LARGURA_LOGICA = options.resolution.larguraLogica || 502;
        ALTURA_LOGICA = options.resolution.alturaLogica || 800;
        logger.info(`Usando resolução personalizada: ${LARGURA_LOGICA}x${ALTURA_LOGICA} (escala fixa: ${FATOR_ESCALA})`);
        
        // REMOVIDO: atualizarPosicoesConfig - estava resetando as posições salvas
        // As posições já estão corretas no arquivo monitores-config.json
        logger.info('Mantendo posições salvas do arquivo de configuração');
    } else {
        // Usar valores padrão
        LARGURA_LOGICA = 502;
        ALTURA_LOGICA = 800;
        logger.info(`Usando resolução padrão: ${LARGURA_LOGICA}x${ALTURA_LOGICA} (escala: ${FATOR_ESCALA})`);
    }
    
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
            // Usar dimensões físicas salvas no config, ou calcular como fallback
            const larguraFisica = monitorData.dimensoesFisicas?.largura || Math.round(LARGURA_LOGICA * FATOR_ESCALA);
            const alturaFisica = monitorData.dimensoesFisicas?.altura || Math.round(ALTURA_LOGICA * FATOR_ESCALA);
            
            monitorData.posicoes.forEach(pos => {
                posicoes.push({
                    id: pos.id,
                    x: pos.x,
                    y: pos.y,
                    largura: larguraFisica,
                    altura: alturaFisica,
                    monitorId: monitorId || monitorData.id || monitorData.monitor?.id
                });
            });
        }
        return posicoes;
    };

    // 3. Determinar posições disponíveis baseado na seleção de monitores
    let posicoesDisponiveis = [];
    if (dadosMonitores && dadosMonitores.posicionamento) {
        if (options.useAllMonitors) {
            // Usar todos os monitores disponíveis
            logger.info('Usando todos os monitores disponíveis');
            
            // Verificar se existe configuração todosMonitores
            if (dadosMonitores.todosMonitores && dadosMonitores.todosMonitores.posicoes && Array.isArray(dadosMonitores.todosMonitores.posicoes)) {
                logger.info(`Usando configuração todosMonitores com ${dadosMonitores.todosMonitores.posicoes.length} posições`);
                posicoesDisponiveis = dadosMonitores.todosMonitores.posicoes.map(pos => ({
                    id: pos.id,
                    x: pos.x,
                    y: pos.y,
                    largura: dadosMonitores.todosMonitores.dimensoesFisicas?.largura || Math.round(LARGURA_LOGICA * FATOR_ESCALA),
                    altura: dadosMonitores.todosMonitores.dimensoesFisicas?.altura || Math.round(ALTURA_LOGICA * FATOR_ESCALA),
                    monitorId: 'todos'
                }));
            } else {
                // Gerar configuração todosMonitores dinamicamente
                logger.info('Configuração todosMonitores não encontrada, gerando dinamicamente');
                
                // Verificar se posicionamento é array ou objeto
                const posicionamentoArray = Array.isArray(dadosMonitores.posicionamento) 
                    ? dadosMonitores.posicionamento 
                    : Object.values(dadosMonitores.posicionamento);
                
                posicionamentoArray.forEach(monitorData => {
                    if (monitorData && monitorData.posicoes && Array.isArray(monitorData.posicoes)) {
                        logger.info(`Processando ${monitorData.posicoes.length} posições do monitor ${monitorData.id || monitorData.monitor?.id}`);
                        monitorData.posicoes.forEach(pos => {
                            posicoesDisponiveis.push({
                                id: posicoesDisponiveis.length, // ID baseado no índice da posição
                                x: pos.x,
                                y: pos.y,
                                largura: monitorData.dimensoesFisicas?.largura || Math.round(LARGURA_LOGICA * FATOR_ESCALA),
                                altura: monitorData.dimensoesFisicas?.altura || Math.round(ALTURA_LOGICA * FATOR_ESCALA),
                                monitorId: monitorData.id || monitorData.monitor?.id || 'unknown',
                                originalId: pos.id // Manter ID original para referência
                            });
                        });
                    }
                });
                
                logger.info(`Geradas ${posicoesDisponiveis.length} posições sequenciais para todos os monitores`);
            }
        } else if (options.selectedMonitor) {
            // Usar apenas o monitor selecionado
            const monitorId = options.selectedMonitor.id.toString();
            logger.info(`Usando apenas o monitor selecionado: ${options.selectedMonitor.nome} (ID: ${monitorId})`);
            
            // Verificar se posicionamento é array ou objeto
            let monitorData = null;
            if (Array.isArray(dadosMonitores.posicionamento)) {
                monitorData = dadosMonitores.posicionamento.find(m => 
                    m.id === `monitor_${monitorId}` || 
                    m.monitor?.id?.toString() === monitorId
                );
            } else {
                monitorData = dadosMonitores.posicionamento[monitorId] || 
                             dadosMonitores.posicionamento[`monitor_${monitorId}`];
            }
            
            if (monitorData && monitorData.posicoes && Array.isArray(monitorData.posicoes)) {
                posicoesDisponiveis = processarPosicoesMonitor(monitorData, monitorId);
            } else {
                logger.warn(`Dados de posicionamento não encontrados para o monitor ${monitorId}`);
            }
        } else {
            // Fallback: usar todos os monitores se não houver seleção específica
            logger.info('Nenhum monitor específico selecionado, usando todos disponíveis');
            
            // Verificar se posicionamento é array ou objeto
            const posicionamentoArray = Array.isArray(dadosMonitores.posicionamento) 
                ? dadosMonitores.posicionamento 
                : Object.values(dadosMonitores.posicionamento);
            
            posicionamentoArray.forEach(monitorData => {
                if (monitorData && monitorData.posicoes && Array.isArray(monitorData.posicoes)) {
                    posicoesDisponiveis.push(...processarPosicoesMonitor(monitorData, monitorData.id || monitorData.monitor?.id));
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

    // 6. Lançar todos os navegadores em paralelo com movimento assíncrono
    const launchPromises = posicoesParaLancar.map(async (posicao) => {
        const navegadorId = idSequencial++; // ID sequencial para o navegador
        const urlIndex = navegadorId % (options.urls ? options.urls.length : 1); // Índice para URL baseado no ID
        // Usar perfil existente se fornecido, caso contrário gerar novo
        let profile = null;
        if (options.profileId && profileManager) {
            try {
                // Usar perfil específico passado nas opções
                profile = profileManager.getProfileById(options.profileId);
                if (profile) {
                    logger.info(`Usando perfil existente para navegador ${navegadorId}:`, {
                        profileId: profile.id,
                        usuario: profile.usuario,
                        nome: profile.nome_completo
                    });
                } else {
                    logger.warn(`Perfil ${options.profileId} não encontrado, gerando novo`);
                    profile = await profileManager.createNewProfile();
                }
            } catch (error) {
                logger.error(`Erro ao buscar perfil ${options.profileId}:`, error.message);
                profile = await profileManager.createNewProfile();
            }
        } else if (profileManager) {
            try {
                // Gerar novo perfil apenas se não foi especificado um
                profile = await profileManager.createNewProfile();
                logger.info(`Perfil gerado para navegador ${navegadorId}:`, {
                    profileId: profile.id,
                    usuario: profile.usuario,
                    nome: profile.nome_completo
                });
            } catch (error) {
                logger.error(`Erro ao gerar perfil para navegador ${navegadorId}:`, error.message);
            }
        } else {
            logger.warn(`Profile Manager não disponível para navegador ${navegadorId}`);
        }
        
        const instanceOptions = {
            ...options,
            navigatorId: navegadorId,
            url: options.urls ? options.urls[urlIndex] : 'about:blank',
            position: posicao,
            profile: profile, // Adicionar o perfil às opções
            windowConfig: {
                LARGURA_LOGICA,
                ALTURA_LOGICA,
                FATOR_ESCALA
            }
        };
        
        try {
            console.log(`[DEBUG] Iniciando stealth.startBrowser para navegador ${navegadorId}`);
            const { browser, page } = await stealth.startBrowser(instanceOptions);
            console.log(`[DEBUG] stealth.startBrowser concluído para navegador ${navegadorId}`);
            activeBrowsers.set(navegadorId, { browser, page, profile: profile });
            
            browser.on('disconnected', () => {
                console.log(`Navegador ${navegadorId} foi fechado.`);
                activeBrowsers.delete(navegadorId);
            });
            
            logger.info(`Navegador ID_${navegadorId} lançado com sucesso em single-process.`);
            launchedBrowsers.push({ browser, page });
            
            // Mover a janela deste navegador assim que for lançado (assíncrono)
            moverJanelas([posicao], configMovimentacao).then((janelasMovidas) => {
                if (janelasMovidas > 0) {
                    totalJanelasMovidas++;
                    logger.info(`Janela do navegador ${navegadorId} reposicionada com sucesso (${totalJanelasMovidas}/${numNavegadores})`);
                } else {
                    logger.warn(`Falha ao reposicionar janela do navegador ${navegadorId}`);
                }
            }).catch((error) => {
                logger.error(`Erro ao mover janela do navegador ${navegadorId}:`, error.message);
            });
            
            return { browser, page };
        } catch (error) {
            logger.error(`Falha ao lançar o navegador ID_${navegadorId}:`, error.message);
            return null;
        }
    });
        
    // Aguardar o lançamento de todos os navegadores
    await Promise.all(launchPromises);
    logger.info('Todos os navegadores foram lançados. Movimento das janelas em andamento...');

    logger.info(`\nOperação concluída. ${totalJanelasMovidas} de ${numNavegadores} janelas foram reposicionadas com sucesso!`);

    // Aguardar 2 segundos antes de injetar scripts pós-reposicionamento
    logger.info('Aguardando 2 segundos antes de injetar scripts pós-reposicionamento...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Injetar scripts essenciais após reposicionamento
    try {
        const scriptInjector = require('../automation/injection');
        
        // Injetar popup.js em todos os navegadores
        logger.info('Injetando script popup.js em todos os navegadores...');
        const popupResult = await scriptInjector.injectScript('popup');
        if (popupResult.success) {
            logger.info('Script popup.js injetado com sucesso em todos os navegadores');
        } else {
            logger.warn('Falha na injeção do script popup.js:', popupResult.message);
        }

        // Injetar ipview.js em todos os navegadores
        logger.info('Injetando script ipview.js em todos os navegadores...');
        const ipviewResult = await scriptInjector.injectScript('ipview');
        if (ipviewResult.success) {
            logger.info('Script ipview.js injetado com sucesso em todos os navegadores');
        } else {
            logger.warn('Falha na injeção do script ipview.js:', ipviewResult.message);
        }

        logger.info('Injeção de scripts pós-reposicionamento concluída');
    } catch (error) {
        logger.error('Erro durante injeção de scripts pós-reposicionamento:', error.message);
    }

    // Salvar o último ID usado para persistência
    if (posicoesDisponiveis.length > 0) {
        saveLastBrowserId(idSequencial);
        logger.info(`Sistema de IDs persistentes: último ID salvo = ${idSequencial}`);
    }

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
    // Retornar IDs ordenados numericamente para garantir ordem consistente
    return Array.from(activeBrowsers.keys()).sort((a, b) => a - b);
}

/**
 * Obtém dados completos dos navegadores ativos incluindo perfis
 * @returns {Array<Object>} - Array com dados dos navegadores ativos
 */
function getActiveBrowsersWithProfiles() {
    const result = [];
    // Obter IDs ordenados para garantir ordem consistente
    const sortedIds = Array.from(activeBrowsers.keys()).sort((a, b) => a - b);
    
    for (const navigatorId of sortedIds) {
        const browserData = activeBrowsers.get(navigatorId);
        result.push({
            navigatorId,
            profileId: browserData.profile ? browserData.profile.id : null,
            profile: browserData.profile
        });
    }
    return result;
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
            // Aguardar que a página esteja completamente carregada (sem timeout)
            await browserInstance.page.waitForFunction(() => document.readyState === 'complete');
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
    let successCount = 0;
    
    // Injetar script em todos os navegadores de forma verdadeiramente assíncrona
    // Cada navegador é injetado assim que estiver carregado, sem aguardar os outros
    const injectionPromises = activeBrowserIds.map(async (browserId) => {
        try {
            const success = await injectScriptInBrowser(browserId, scriptContent, waitForLoad);
            const result = { browserId, success };
            results.push(result);
            if (success) {
                successCount++;
                logger.info(`Script injetado com sucesso no navegador ${browserId} (${successCount}/${activeBrowserIds.length})`);
            }
            return result;
        } catch (error) {
            const result = { browserId, success: false, error: error.message };
            results.push(result);
            logger.error(`Erro ao injetar script no navegador ${browserId}:`, error.message);
            return result;
        }
    });
    
    // Não aguardar todos terminarem - retornar imediatamente
    // As injeções continuarão em background
    Promise.allSettled(injectionPromises).then(() => {
        logger.info(`Injeção de scripts finalizada: ${successCount}/${activeBrowserIds.length} navegadores`);
    });
    
    return {
        success: true,
        message: `Injeção de script iniciada em ${activeBrowserIds.length} navegador(es) - processamento assíncrono`,
        results: [],
        totalBrowsers: activeBrowserIds.length
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
    getActiveBrowsersWithProfiles, 
    navigateAllBrowsers,
    injectScriptInBrowser,
    injectScriptInAllBrowsers,
    injectScriptInAllBrowsersPostNavigation,
    initializeProfileSystem,
    getAllProfiles,
    loadLastBrowserId,
    saveLastBrowserId
};