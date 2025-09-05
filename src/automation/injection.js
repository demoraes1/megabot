const { getActiveBrowsers, injectScriptInAllBrowsers, injectScriptInAllBrowsersPostNavigation } = require('../main/browser-manager');
const path = require('path');
const fs = require('fs');

// Sistema de logging estruturado
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;

function log(level, message, data = null) {
    if (level <= CURRENT_LOG_LEVEL) {
        const timestamp = new Date().toISOString();
        const levelName = Object.keys(LOG_LEVELS)[level];
        const logEntry = {
            timestamp,
            level: levelName,
            module: 'ScriptInjector',
            message,
            ...(data && { data })
        };
        console.log(`[${timestamp}] [${levelName}] [ScriptInjector] ${message}`, data ? data : '');
    }
}

const logger = {
    error: (message, data) => log(LOG_LEVELS.ERROR, message, data),
    warn: (message, data) => log(LOG_LEVELS.WARN, message, data),
    info: (message, data) => log(LOG_LEVELS.INFO, message, data),
    debug: (message, data) => log(LOG_LEVELS.DEBUG, message, data)
};

// Códigos de erro específicos
const ERROR_CODES = {
    SCRIPT_NOT_FOUND: 'SCRIPT_NOT_FOUND',
    SCRIPT_LOAD_FAILED: 'SCRIPT_LOAD_FAILED',
    INJECTION_FAILED: 'INJECTION_FAILED',
    CONFIG_LOAD_FAILED: 'CONFIG_LOAD_FAILED',
    INVALID_SCRIPT_NAME: 'INVALID_SCRIPT_NAME',
    NO_ACTIVE_BROWSERS: 'NO_ACTIVE_BROWSERS'
};

/**
 * Carrega configurações do app-settings.json
 */
function loadAppSettings() {
    try {
        const settingsPath = path.join(__dirname, '../config/app-settings.json');
        if (fs.existsSync(settingsPath)) {
            const settingsData = fs.readFileSync(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            logger.debug('Configurações carregadas com sucesso', { settingsPath });
            return settings;
        } else {
            logger.warn('Arquivo app-settings.json não encontrado, usando configurações padrão', { settingsPath });
            return {
                automation: {
                    depositMin: 10,
                    depositMax: 30
                }
            };
        }
    } catch (error) {
        logger.error('Erro ao carregar configurações', { error: error.message, code: ERROR_CODES.CONFIG_LOAD_FAILED });
        return {
            automation: {
                depositMin: 10,
                depositMax: 30
            }
        };
    }
}

/**
 * Módulo estático para injeção de scripts em navegadores ativos
 */
class ScriptInjector {
    constructor() {
        this.scriptsPath = path.join(__dirname, 'scripts');
        this.availableScripts = this.loadAvailableScripts();
        this.scriptCache = new Map(); // Cache para conteúdo de scripts
        this.cacheTimestamps = new Map(); // Timestamps para invalidação de cache
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos em milliseconds
    }

    // Função auxiliar para injetar configurações específicas do script
    injectScriptConfiguration(scriptName, scriptContent) {
        let finalScriptContent = scriptContent;
        
        if (scriptName === 'deposito') {
            const settings = loadAppSettings();
            const configScript = `
                // Injetar configurações do MegaBot
                window.megabotConfig = {
                    depositMin: ${settings.automation?.depositMin || 10},
                    depositMax: ${settings.automation?.depositMax || 30}
                };
                console.log('Configurações MegaBot injetadas:', window.megabotConfig);
            `;
            finalScriptContent = configScript + '\n' + scriptContent;
        }
        
        if (scriptName === 'play') {
            const settings = loadAppSettings();
            const configScript = `
                // Injetar configurações do MegaBot para o jogo
                window.megabotConfig = {
                    jogo: '${settings.automation?.jogo || 'wild ape'}'
                };
                console.log('Configurações MegaBot injetadas:', window.megabotConfig);
            `;
            finalScriptContent = configScript + '\n' + scriptContent;
        }
        
        return finalScriptContent;
    }

    /**
     * Carrega lista de scripts disponíveis na pasta scripts
     */
    loadAvailableScripts() {
        try {
            if (!fs.existsSync(this.scriptsPath)) {
                logger.warn('Pasta de scripts não encontrada', { scriptsPath: this.scriptsPath });
                return [];
            }

            const files = fs.readdirSync(this.scriptsPath)
                .filter(file => file.endsWith('.js'))
                .map(file => ({
                    name: file.replace('.js', ''),
                    path: path.join(this.scriptsPath, file),
                    content: null
                }));

            logger.info(`Scripts disponíveis carregados: ${files.map(f => f.name).join(', ')}`);
            return files;
        } catch (error) {
            logger.error('Erro ao carregar scripts disponíveis', { error: error.message, code: ERROR_CODES.SCRIPT_LOAD_FAILED });
            return [];
        }
    }

    /**
     * Carrega o conteúdo de um script específico
     */
    loadScriptContent(scriptName) {
        try {
            // Verificar cache primeiro
            const cacheKey = scriptName;
            const cachedContent = this.getFromCache(cacheKey);
            if (cachedContent) {
                logger.debug(`Script '${scriptName}' carregado do cache`, { scriptName });
                return cachedContent;
            }

            const script = this.availableScripts.find(s => s.name === scriptName);
            if (!script) {
                const error = new Error(`Script '${scriptName}' não encontrado`);
                error.code = ERROR_CODES.SCRIPT_NOT_FOUND;
                throw error;
            }

            // Carregar do arquivo se não estiver em cache
            const scriptPath = path.join(__dirname, 'scripts', `${scriptName}.js`);
            if (!fs.existsSync(scriptPath)) {
                const error = new Error(`Arquivo de script '${scriptName}' não encontrado`);
                error.code = ERROR_CODES.SCRIPT_NOT_FOUND;
                throw error;
            }

            const scriptContent = fs.readFileSync(scriptPath, 'utf8');
            
            // Validar conteúdo do script
            if (!this.validateScriptContent(scriptContent, scriptName)) {
                const error = new Error(`Conteúdo do script '${scriptName}' é inválido`);
                error.code = ERROR_CODES.SCRIPT_LOAD_FAILED;
                throw error;
            }

            // Armazenar no cache
            this.setCache(cacheKey, scriptContent);
            
            logger.info(`Script '${scriptName}' carregado com sucesso`, { scriptName, cached: false });
            return scriptContent;
        } catch (error) {
            logger.error(`Erro ao carregar script '${scriptName}'`, { error: error.message, scriptName, code: error.code || ERROR_CODES.SCRIPT_LOAD_FAILED });
            throw error;
        }
    }

    // Função para validar conteúdo do script
    validateScriptContent(content, scriptName) {
        try {
            // Verificações básicas de segurança
            if (!content || typeof content !== 'string') {
                logger.warn(`Script '${scriptName}' tem conteúdo inválido`, { scriptName });
                return false;
            }

            // Verificar se não contém código potencialmente perigoso
            const dangerousPatterns = [
                /eval\s*\(/,
                /Function\s*\(/,
                /document\.write\s*\(/,
                /innerHTML\s*=/
            ];

            for (const pattern of dangerousPatterns) {
                if (pattern.test(content)) {
                    logger.warn(`Script '${scriptName}' contém padrão potencialmente perigoso`, { scriptName, pattern: pattern.toString() });
                    // Não bloquear, apenas avisar
                }
            }

            // Verificar se é JavaScript válido (sintaxe básica)
            if (content.trim().length === 0) {
                logger.warn(`Script '${scriptName}' está vazio`, { scriptName });
                return false;
            }

            return true;
        } catch (error) {
            logger.error(`Erro na validação do script '${scriptName}'`, { error: error.message, scriptName });
            return false;
        }
    }

    // Gerenciamento de cache
    getFromCache(key) {
        const timestamp = this.cacheTimestamps.get(key);
        if (!timestamp) return null;

        const now = Date.now();
        if (now - timestamp > this.cacheTimeout) {
            // Cache expirado
            this.scriptCache.delete(key);
            this.cacheTimestamps.delete(key);
            return null;
        }

        return this.scriptCache.get(key);
    }

    setCache(key, content) {
        this.scriptCache.set(key, content);
        this.cacheTimestamps.set(key, Date.now());
    }

    clearCache() {
        this.scriptCache.clear();
        this.cacheTimestamps.clear();
        logger.info('Cache de scripts limpo');
    }

    /**
     * Injeta um script em todos os navegadores ativos
     * @param {string} scriptName - Nome do script a ser injetado
     * @returns {Promise<Object>} - Resultado da operação
     */
    async injectScriptInAllBrowsers(scriptName) {
        try {
            const scriptContent = this.loadScriptContent(scriptName);
            if (!scriptContent) {
                return {
                    success: false,
                    message: `Script '${scriptName}' não encontrado`,
                    code: ERROR_CODES.SCRIPT_NOT_FOUND,
                    results: []
                };
            }

            logger.info(`Injetando script '${scriptName}' em todos os navegadores ativos`, { scriptName });
            
            // Aplicar configurações específicas do script
            const finalScriptContent = this.injectScriptConfiguration(scriptName, scriptContent);
            
            // Usar a função do browser-manager para injetar em todos os navegadores
            const result = await injectScriptInAllBrowsers(finalScriptContent);
            
            return result;

        } catch (error) {
            logger.error('Erro na injeção de script', { error: error.message, code: error.code || ERROR_CODES.INJECTION_FAILED });
            return {
                success: false,
                message: error.message,
                code: error.code || ERROR_CODES.INJECTION_FAILED,
                results: []
            };
        }
    }

    /**
     * Injeta um script em todos os navegadores ativos após navegação (aguarda carregamento)
     * @param {string} scriptName - Nome do script a ser injetado
     * @returns {Promise<Object>} - Resultado da operação
     */
    async injectScriptPostNavigation(scriptName) {
        try {
            const scriptContent = this.loadScriptContent(scriptName);
            if (!scriptContent) {
                return {
                    success: false,
                    message: `Script '${scriptName}' não encontrado`,
                    code: ERROR_CODES.SCRIPT_NOT_FOUND,
                    results: []
                };
            }

            logger.info(`Injetando script '${scriptName}' em todos os navegadores ativos (pós-navegação)`, { scriptName });
            
            // Aplicar configurações específicas do script
            const finalScriptContent = this.injectScriptConfiguration(scriptName, scriptContent);
            
            // Usar a função do browser-manager para injetar em todos os navegadores com aguardo de carregamento
            const result = await injectScriptInAllBrowsersPostNavigation(finalScriptContent);
            
            return result;

        } catch (error) {
            logger.error('Erro na injeção de script pós-navegação', { error: error.message, code: error.code || ERROR_CODES.INJECTION_FAILED });
            return {
                success: false,
                message: error.message,
                code: error.code || ERROR_CODES.INJECTION_FAILED,
                results: []
            };
        }
    }

    /**
     * Injeta script customizado (código direto) em todos os navegadores
     */
    async injectCustomScript(scriptCode) {
        try {
            const activeBrowsers = getActiveBrowsers();
            
            if (activeBrowsers.length === 0) {
                return {
                    success: false,
                    message: 'Nenhum navegador ativo',
                    code: ERROR_CODES.NO_ACTIVE_BROWSERS,
                    results: []
                };
            }

            logger.info(`Injetando script customizado em ${activeBrowsers.length} navegador(es)`, { browserCount: activeBrowsers.length });

            const results = [];
            
            for (const navigatorId of activeBrowsers) {
                try {
                    await this.injectScriptInBrowser(navigatorId, scriptCode);
                    
                    results.push({
                        navigatorId,
                        success: true,
                        message: 'Script customizado injetado com sucesso'
                    });
                } catch (error) {
                    results.push({
                        navigatorId,
                        success: false,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            
            return {
                success: successCount > 0,
                message: `Script customizado injetado em ${successCount}/${activeBrowsers.length} navegador(es)`,
                results
            };

        } catch (error) {
            logger.error('Erro na injeção de script customizado', { error: error.message, code: ERROR_CODES.INJECTION_FAILED });
            return {
                success: false,
                message: error.message,
                code: ERROR_CODES.INJECTION_FAILED,
                results: []
            };
        }
    }

    /**
     * Lista scripts disponíveis
     */
    getAvailableScripts() {
        return this.availableScripts.map(script => ({
            name: script.name,
            path: script.path
        }));
    }

    /**
     * Recarrega lista de scripts disponíveis
     */
    reloadScripts() {
        this.availableScripts = this.loadAvailableScripts();
        this.clearCache(); // Limpar cache ao recarregar
        logger.info('Scripts recarregados e cache limpo');
        return this.availableScripts;
    }
}

// Criar instância singleton
const scriptInjector = new ScriptInjector();

// Exportar métodos estáticos
module.exports = {
    // Injetar script por nome
    injectScript: (scriptName) => scriptInjector.injectScriptInAllBrowsers(scriptName),
    
    // Injetar script por nome após navegação (aguarda carregamento)
    injectScriptPostNavigation: (scriptName) => scriptInjector.injectScriptPostNavigation(scriptName),
    
    // Injetar script customizado
    injectCustomScript: (scriptCode) => scriptInjector.injectCustomScript(scriptCode),
    
    // Listar scripts disponíveis
    getAvailableScripts: () => scriptInjector.getAvailableScripts(),
    
    // Recarregar scripts
    reloadScripts: () => scriptInjector.reloadScripts(),
    
    // Acesso à instância completa se necessário
    injector: scriptInjector
};

// Log de inicialização
logger.info('Módulo ScriptInjector inicializado');
logger.info('Scripts disponíveis', { scripts: scriptInjector.getAvailableScripts().map(s => s.name) });