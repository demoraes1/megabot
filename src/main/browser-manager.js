const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
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
const navigationEvents = new EventEmitter();
navigationEvents.setMaxListeners(100);
const launchEvents = new EventEmitter();
launchEvents.setMaxListeners(100);
const browserStateEvents = new EventEmitter();
browserStateEvents.setMaxListeners(100);

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
            // Se lastBrowserId não existir, adicionar automaticamente com valor 1
            if (config.lastBrowserId === undefined) {
                config.lastBrowserId = 1;
                fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
                logger.info('lastBrowserId adicionado automaticamente ao config.json com valor 1');
            }
            return config.lastBrowserId || 1;
        }
    } catch (error) {
        logger.warn('Erro ao carregar último ID do navegador, iniciando do 1:', error.message);
    }
    return 1;
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
let idSequencial = 1;

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
    
    const detalhesMonitores = (() => {
        if (!dadosMonitores) {
            return [];
        }

        if (Array.isArray(dadosMonitores.monitores) && dadosMonitores.monitores.length > 0) {
            return dadosMonitores.monitores;
        }

        if (dadosMonitores.monitores && Array.isArray(dadosMonitores.monitores.detalhes)) {
            return dadosMonitores.monitores.detalhes;
        }

        if (dadosMonitores.posicionamento) {
            const posicionamentoArray = Array.isArray(dadosMonitores.posicionamento)
                ? dadosMonitores.posicionamento
                : Object.values(dadosMonitores.posicionamento);

            return posicionamentoArray
                .map(item => item && item.monitor)
                .filter(Boolean);
        }

        return [];
    })();

    if (options.selectedMonitor && typeof options.selectedMonitor === 'string') {
        options.selectedMonitor = options.selectedMonitor.trim();
    }

    if (options.selectedMonitor === 'todos') {
        options.useAllMonitors = true;
        options.selectedMonitor = null;
    } else if (options.selectedMonitor && !options.useAllMonitors) {
        let monitorResolve = null;

        if (typeof options.selectedMonitor === 'number' || (typeof options.selectedMonitor === 'string' && options.selectedMonitor !== '')) {
            const monitorIndex = parseInt(options.selectedMonitor, 10);

            if (!Number.isNaN(monitorIndex) && detalhesMonitores[monitorIndex]) {
                const detalhes = detalhesMonitores[monitorIndex];
                monitorResolve = {
                    id: detalhes.id,
                    nome: detalhes.nome,
                    bounds: detalhes.bounds || null,
                    index: monitorIndex
                };
            } else {
                logger.warn('Indice de monitor invalido recebido: ' + options.selectedMonitor + '. Usando todos os monitores.');
            }
        } else if (typeof options.selectedMonitor === 'object') {
            const monitorId = options.selectedMonitor.id || (typeof options.selectedMonitor.index === 'number' && detalhesMonitores[options.selectedMonitor.index] ? detalhesMonitores[options.selectedMonitor.index].id : null);

            if (monitorId) {
                const detalhes = detalhesMonitores.find(det => det.id === monitorId) || null;

                if (detalhes) {
                    const resolvedIndex = typeof options.selectedMonitor.index === 'number' && options.selectedMonitor.index >= 0
                        ? options.selectedMonitor.index
                        : detalhesMonitores.findIndex(det => det.id === monitorId);

                    monitorResolve = {
                        id: detalhes.id,
                        nome: detalhes.nome,
                        bounds: detalhes.bounds || null,
                        index: resolvedIndex
                    };
                } else {
                    logger.warn('Monitor com ID ' + monitorId + ' nao encontrado. Usando todos os monitores.');
                }
            } else {
                logger.warn('Selecao de monitor invalida (sem ID). Usando todos os monitores.');
            }
        }

        if (monitorResolve) {
            options.selectedMonitor = monitorResolve;
            options.useAllMonitors = false;
        } else {
            options.useAllMonitors = true;
            options.selectedMonitor = null;
        }
    }

    const defaultPostLaunchScripts = ['popup', 'ipview'];
    const postLaunchScripts = [];
    let scriptInjectorInstance = null;

    try {
        const scriptInjectorModule = require('../automation/injection');
        scriptInjectorInstance = scriptInjectorModule.injector || null;

        if (scriptInjectorInstance) {
            defaultPostLaunchScripts.forEach((scriptName) => {
                try {
                    const baseContent = scriptInjectorInstance.loadScriptContent(scriptName);
                    if (baseContent) {
                        postLaunchScripts.push({ name: scriptName, content: baseContent });
                        logger.debug(`Script ${scriptName} preparado para injeção pós-lançamento`);
                    }
                } catch (error) {
                    logger.error(`Erro ao carregar script '${scriptName}' para injeção pós-lançamento:`, error.message);
                }
            });
        } else {
            logger.warn('Instância do ScriptInjector não encontrada para injeção pós-lançamento');
        }
    } catch (error) {
        logger.error('Erro ao preparar scripts pós-lançamento:', error.message);
    }

    const postLaunchInjectionDelay = typeof options.postLaunchInjectionDelay === 'number'
        ? options.postLaunchInjectionDelay
        : 2000;

    async function runPostLaunchScripts(navigatorId, browserIndex, profileRef = null) {
        launchEvents.emit('browser-launch-ready', {
            navigatorId,
            browserIndex,
            profileId: profileRef && profileRef.profile ? profileRef.profile : null
        });

        if (!scriptInjectorInstance || postLaunchScripts.length === 0) {
            return;
        }

        if (postLaunchInjectionDelay > 0) {
            await sleep(postLaunchInjectionDelay);
        }

        for (const script of postLaunchScripts) {
            try {
                let finalContent = script.content;
                if (typeof scriptInjectorInstance.injectScriptConfiguration === 'function') {
                    finalContent = scriptInjectorInstance.injectScriptConfiguration(script.name, script.content, browserIndex);
                }

                const injectionSuccess = await injectScriptInBrowser(navigatorId, finalContent, false);
                launchEvents.emit('browser-launch-injection', {
                    navigatorId,
                    browserIndex,
                    script: script.name,
                    success: injectionSuccess
                });

                if (injectionSuccess) {
                    logger.info(`Script ${script.name} injetado com sucesso no navegador ${navigatorId} durante o pós-lançamento`);
                } else {
                    logger.warn(`Falha ao injetar script ${script.name} no navegador ${navigatorId} durante o pós-lançamento`);
                }
            } catch (error) {
                launchEvents.emit('browser-launch-injection', {
                    navigatorId,
                    browserIndex,
                    script: script.name,
                    success: false,
                    error: error.message
                });
                logger.error(`Erro ao injetar script ${script.name} no navegador ${navigatorId} durante o pós-lançamento:`, error.message);
            }
        }
    }

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
        } else if (options.selectedMonitor && options.selectedMonitor.id) {
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
    
    // Mapear posições baseado no lastBrowserId atual
    const posicoesParaLancar = [];
    for (let i = 0; i < numNavegadores; i++) {
        const posicaoOriginal = posicoesDisponiveis[i];
        const navegadorId = idSequencial + i;
        
        posicoesParaLancar.push({
            id: navegadorId, // Usar ID do navegador ao invés do ID fixo da posição
            x: posicaoOriginal.x,
            y: posicaoOriginal.y,
            largura: posicaoOriginal.largura,
            altura: posicaoOriginal.altura,
            monitorId: posicaoOriginal.monitorId,
            originalPositionId: posicaoOriginal.id // Manter referência da posição original
        });
    }
    
    logger.info(`Posições mapeadas: IDs ${idSequencial} a ${idSequencial + numNavegadores - 1}`);
    
    // 5. Configuração para movimentação
    const configMovimentacao = {
        LARGURA_LOGICA,
        ALTURA_LOGICA,
        FATOR_ESCALA,
        DELAY_PARA_REGISTRO_JANELAS
    };
    
    let totalJanelasMovidas = 0;
    logger.info(`\nIniciando o processo para ${numNavegadores} navegadores em paralelo.\n`);

    // Variável para controlar se algum navegador usou perfil específico
    let hasSpecificProfile = false;

    // 6. Lançar todos os navegadores em paralelo com movimento assíncrono
    const launchPromises = posicoesParaLancar.map(async (posicao) => {
        let navegadorId;
        let shouldUpdateLastBrowserId = true;

        // Usar perfil existente se fornecido, caso contrário gerar novo
        let profile = null;
        if (options.profileId && profileManager) {
            try {
                // Usar perfil específico passado nas opções
                profile = profileManager.getProfileById(options.profileId);
                if (profile) {
                    // Usar o navigatorId do perfil existente, não gerar novo
                    navegadorId = profile.navigatorId;
                    shouldUpdateLastBrowserId = false; // Não alterar lastBrowserId quando usar perfil específico
                    hasSpecificProfile = true; // Marcar que um perfil específico foi usado

                    logger.info(`Usando perfil existente com navigatorId ${navegadorId}:`, {
                        profileId: profile.profile,
                        navigatorId: profile.navigatorId,
                        usuario: profile.usuario,
                        nome: profile.nome_completo
                    });
                } else {
                    // Se perfil não encontrado, usar ID sequencial
                    navegadorId = idSequencial++;
                    logger.warn(`Perfil ${options.profileId} não encontrado, usando ID sequencial ${navegadorId}`);
                }
            } catch (error) {
                // Em caso de erro, usar ID sequencial
                navegadorId = idSequencial++;
                logger.error(`Erro ao buscar perfil ${options.profileId}, usando ID sequencial ${navegadorId}:`, error.message);
            }
        } else {
            // Quando não há perfil específico, usar ID sequencial
            navegadorId = idSequencial++;
        }

        const urlIndex = navegadorId % (options.urls ? options.urls.length : 1); // Índice para URL baseado no ID

        // Gerar novo perfil se ainda não foi definido
        if (!profile && profileManager) {
            try {
                profile = await profileManager.createNewProfile();
                // Definir o navigatorId baseado no ID gerado
                profile.navigatorId = navegadorId;
                await profileManager.updateProfile(profile.profile, { navigatorId: navegadorId });

                logger.info(`Novo perfil criado para navegador ${navegadorId}:`, {
                    profileId: profile.profile,
                    navigatorId: profile.navigatorId,
                    usuario: profile.usuario,
                    nome: profile.nome_completo
                });
            } catch (error) {
                logger.error(`Erro ao criar novo perfil para navegador ${navegadorId}:`, error.message);
                // Continuar sem perfil se houver erro
                profile = null;
            }
        }

        // Se ainda não há perfil, gerar um básico
        if (!profile) {
            profile = {
                navigatorId: navegadorId,
                profile: `temp_profile_${navegadorId}`,
                usuario: `user_${navegadorId}`,
                nome_completo: `Usuário ${navegadorId}`
            };
            logger.info(`Perfil temporário criado para navegador ${navegadorId}`);
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
            activeBrowsers.set(String(navegadorId), { browser, page, profile: profile });
            browserStateEvents.emit('active-browsers-changed', getActiveBrowsersWithProfiles());

            browser.on('disconnected', () => {
                console.log(`Navegador ${navegadorId} foi fechado.`);
                activeBrowsers.delete(String(navegadorId));
                browserStateEvents.emit('active-browsers-changed', getActiveBrowsersWithProfiles());
            });

            logger.info(`Navegador ID_${navegadorId} lançado com sucesso em single-process.`);
            launchedBrowsers.push({ browser, page });

            // Mover a janela deste navegador assim que for lançado (assíncrono)
            // Verificar se moverJanelas está desabilitado
            if (!options.disableMoverJanelas) {
                moverJanelas([posicao], configMovimentacao).then((janelasMovidas) => {
                    if (janelasMovidas > 0) {
                        totalJanelasMovidas += janelasMovidas;
                        const movidasReportadas = Math.min(totalJanelasMovidas, numNavegadores);
                        logger.info(`Janela do navegador ${navegadorId} reposicionada com sucesso (${movidasReportadas}/${numNavegadores})`);
                    } else {
                        logger.warn(`Falha ao reposicionar janela do navegador ${navegadorId}`);
                    }
                }).catch((error) => {
                    logger.error(`Erro ao mover janela do navegador ${navegadorId}:`, error.message);
                });
            } else {
                logger.info(`Movimento de janela desabilitado para navegador ${navegadorId}`);
            }

            runPostLaunchScripts(navegadorId, index, profile).catch((error) => {
                logger.error(`Erro durante processamento pós-lançamento do navegador ${navegadorId}:`, error.message);
            });

            return { browser, page };
        } catch (error) {
            logger.error(`Falha ao lançar o navegador ID_${navegadorId}:`, error.message);
            return null;
        }
    });

    // Aguardar o lançamento de todos os navegadores (reposicionamento contínuo)
    await Promise.all(launchPromises);
    logger.info('Todos os navegadores foram lançados. Scripts pós-lançamento serão processados de forma assíncrona.');

    const movidasReportadas = Math.min(totalJanelasMovidas, numNavegadores);
    logger.info(`
Operação concluída. ${movidasReportadas} de ${numNavegadores} janelas foram reposicionadas com sucesso!`);

    // Aguardar o lanÃ§amento de todos os navegadores
    await Promise.all(launchPromises);
    logger.info('Todos os navegadores foram lanÃ§ados. Movimento das janelas em andamento...');

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

    // Salvar o último ID usado para persistência apenas se não usou perfil específico
    if (posicoesDisponiveis.length > 0 && !hasSpecificProfile) {
        saveLastBrowserId(idSequencial);
        logger.info(`Sistema de IDs persistentes: último ID salvo = ${idSequencial}`);
    } else if (hasSpecificProfile) {
        logger.info('Perfil específico usado - lastBrowserId não foi alterado');
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
    const browserInstance = activeBrowsers.get(String(navigatorId));
    
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
 * @param {Object} syncStates - Estados do localStorage syncPopupCheckboxStates (opcional)
 * @returns {Array<string>} - Array com IDs dos navegadores ativos
 */
function getActiveBrowsers(syncStates = null) {
    // Obter todos os IDs ordenados numericamente
    const allIds = Array.from(activeBrowsers.keys()).sort((a, b) => Number(a) - Number(b));
    
    console.log('[getActiveBrowsers] Todos os IDs:', allIds);
    console.log('[getActiveBrowsers] syncStates recebido:', syncStates);
    
    // Se não há estados de sincronização ou selectAll é true, retornar todos
    if (!syncStates || syncStates.selectAll === true) {
        console.log('[getActiveBrowsers] Retornando todos os navegadores (syncStates null ou selectAll=true)');
        return allIds;
    }
    
    // Se selectAll é false, filtrar apenas os navegadores marcados como true
    const filteredIds = allIds.filter(id => syncStates[id] === true);
    console.log('[getActiveBrowsers] IDs filtrados:', filteredIds);
    console.log('[getActiveBrowsers] Estados individuais:', Object.keys(syncStates).filter(key => key !== 'selectAll').map(key => `${key}: ${syncStates[key]}`));
    
    return filteredIds;
}

/**
 * Obtém dados completos dos navegadores ativos incluindo perfis
 * @param {Object} syncStates - Estados do localStorage syncPopupCheckboxStates (opcional)
 * @returns {Array<Object>} - Array com dados dos navegadores ativos
 */
function getActiveBrowsersWithProfiles(syncStates = null) {
    // Obter IDs filtrados baseado nos estados de sincronização
    const filteredIds = getActiveBrowsers(syncStates);
    
    const result = [];
    for (const navigatorId of filteredIds) {
        const browserData = activeBrowsers.get(String(navigatorId));
        result.push({
            navigatorId,
            profileId: browserData.profile ? browserData.profile.profile : null,
            profile: browserData.profile
        });
    }
    return result;
}

/**
 * Atualiza dados do perfil armazenados para um navegador ativo
 * @param {string|number} navigatorId - ID do navegador
 * @param {Object} updates - Campos a serem mesclados no perfil em memoria
 * @returns {boolean} - true se o navegador foi atualizado
 */
function updateActiveBrowserProfile(navigatorId, updates = {}) {
    const browserId = String(navigatorId);
    const browserData = activeBrowsers.get(browserId);

    if (!browserData) {
        return false;
    }

    const existingProfile = browserData.profile || {};
    browserData.profile = { ...existingProfile, ...updates };
    activeBrowsers.set(browserId, browserData);
    return true;
}

/**
 * Navega para URLs em todos os navegadores ativos
 * @param {string|Array<string>} urls - URL ou array de URLs
 * @param {Object|null} syncStates - Estados de sincronizacao opcionais
 * @param {Object} options - Configuracoes adicionais (scriptName, scriptContent, waitForLoad, emitEvents)
 * @returns {Promise<Object>} - Resultado da operacao
 */
async function navigateAllBrowsers(urls, syncStates = null, options = {}) {
    const activeBrowserIds = getActiveBrowsers(syncStates);

    if (activeBrowserIds.length === 0) {
        return {
            success: false,
            error: 'Nenhum navegador ativo encontrado'
        };
    }

    const urlArray = Array.isArray(urls) ? urls : [urls];
    const {
        scriptName = null,
        scriptContent: providedScriptContent = null,
        waitForLoad = true,
        emitEvents = true
    } = options;

    let baseScriptContent = providedScriptContent;
    let injectorInstance = null;

    if (!baseScriptContent && scriptName) {
        try {
            const { injector } = require('../automation/injection.js');
            injectorInstance = injector;
            baseScriptContent = injector.loadScriptContent(scriptName);
            if (!baseScriptContent) {
                return {
                    success: false,
                    error: `Script '${scriptName}' nao encontrado`
                };
            }
        } catch (error) {
            logger.error(`Erro ao carregar script '${scriptName}' para injecao pos-navegacao:`, error.message);
            return {
                success: false,
                error: `Falha ao preparar script '${scriptName}'`
            };
        }
    } else if (scriptName) {
        const { injector } = require('../automation/injection.js');
        injectorInstance = injector;
    }

    const navigationPromises = activeBrowserIds.map((browserId, index) => (async () => {
        const url = urlArray[index % urlArray.length];
        const success = await navigateToUrl(browserId, url);

        const navigationResult = {
            browserId,
            browserIndex: index,
            url,
            success
        };

        if (emitEvents) {
            navigationEvents.emit('navigation-complete', navigationResult);
        }

        if (!success) {
            navigationResult.injection = { success: false, skipped: true };
            return navigationResult;
        }

        if (!baseScriptContent) {
            return navigationResult;
        }

        try {
            let scriptToInject = baseScriptContent;
            if (injectorInstance && scriptName) {
                scriptToInject = injectorInstance.injectScriptConfiguration(scriptName, baseScriptContent, index);
            }

            const injectionSuccess = await injectScriptInBrowser(browserId, scriptToInject, waitForLoad);
            navigationResult.injection = {
                success: injectionSuccess
            };

            if (emitEvents) {
                navigationEvents.emit('injection-complete', {
                    browserId,
                    browserIndex: index,
                    url,
                    success: injectionSuccess
                });
            }
        } catch (error) {
            navigationResult.injection = {
                success: false,
                error: error.message
            };

            logger.error(`Erro ao injetar script no navegador ${browserId} apos navegacao:`, error.message);

            if (emitEvents) {
                navigationEvents.emit('injection-complete', {
                    browserId,
                    browserIndex: index,
                    url,
                    success: false,
                    error: error.message
                });
            }
        }

        return navigationResult;
    })());

    const results = await Promise.all(navigationPromises);

    return {
        success: true,
        navigatedBrowsers: results.length,
        results
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
    const browserInstance = activeBrowsers.get(String(navigatorId));
    
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
                senha_saque: browserInstance.profile.senha_saque,
                telefone: browserInstance.profile.telefone,
                nome_completo: browserInstance.profile.nome_completo,
                cpf: browserInstance.profile.cpf,
                pix: browserInstance.profile.pix
            };
            
            await browserInstance.page.evaluate((data) => {
                window.profileData = data;
                console.log('[ProfileData] Dados do perfil injetados:', data);
            }, profileData);
            
            logger.info(`Dados do perfil ${browserInstance.profile.profile} injetados no navegador ${navigatorId}`);
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
async function injectScriptInAllBrowsers(scriptContent, waitForLoad = false, scriptName = null, syncStates = null) {
    console.log('[injectScriptInAllBrowsers] syncStates recebido:', syncStates);
    const activeBrowserIds = getActiveBrowsers(syncStates);
    
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
    const injectionPromises = activeBrowserIds.map(async (browserId, browserIndex) => {
        try {
            // Se for o script de registro, aplicar configurações com índice do navegador
            let finalScriptContent = scriptContent;
            if (scriptName === 'registro') {
                const { injector } = require('../automation/injection.js');
                finalScriptContent = injector.injectScriptConfiguration(scriptName, scriptContent, browserIndex);
            }
            
            const success = await injectScriptInBrowser(browserId, finalScriptContent, waitForLoad);
            const result = { browserId, success, browserIndex };
            results.push(result);
            if (success) {
                successCount++;
                logger.info(`Script injetado com sucesso no navegador ${browserId} (índice ${browserIndex}) (${successCount}/${activeBrowserIds.length})`);
            }
            return result;
        } catch (error) {
            const result = { browserId, success: false, error: error.message, browserIndex };
            results.push(result);
            logger.error(`Erro ao injetar script no navegador ${browserId} (índice ${browserIndex}):`, error.message);
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
 * @param {string} scriptName - Nome do script (opcional, para configurações específicas)
 * @returns {Promise<Object>} - Resultado da operação
 */
async function injectScriptInAllBrowsersPostNavigation(scriptContent, scriptName = null, syncStates = null) {
    return injectScriptInAllBrowsers(scriptContent, true, scriptName, syncStates);
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
    updateActiveBrowserProfile, 
    navigateAllBrowsers,
    navigationEvents,
    launchEvents,
    browserStateEvents,
    injectScriptInBrowser,
    injectScriptInAllBrowsers,
    injectScriptInAllBrowsersPostNavigation,
    initializeProfileSystem,
    getAllProfiles,
    loadLastBrowserId,
    saveLastBrowserId
};