const { getActiveBrowsers, injectScriptInAllBrowsers } = require('../main/browser-manager');
const path = require('path');
const fs = require('fs');

/**
 * Carrega configurações do app-settings.json
 */
function loadAppSettings() {
    try {
        const settingsPath = path.join(__dirname, '../config/app-settings.json');
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(settingsData);
    } catch (error) {
        console.warn('Erro ao carregar configurações, usando valores padrão:', error.message);
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
    }

    /**
     * Carrega lista de scripts disponíveis na pasta scripts
     */
    loadAvailableScripts() {
        try {
            if (!fs.existsSync(this.scriptsPath)) {
                console.warn('Pasta de scripts não encontrada:', this.scriptsPath);
                return [];
            }

            const files = fs.readdirSync(this.scriptsPath)
                .filter(file => file.endsWith('.js'))
                .map(file => ({
                    name: file.replace('.js', ''),
                    path: path.join(this.scriptsPath, file),
                    content: null
                }));

            console.log(`Scripts disponíveis carregados: ${files.map(f => f.name).join(', ')}`);
            return files;
        } catch (error) {
            console.error('Erro ao carregar scripts disponíveis:', error);
            return [];
        }
    }

    /**
     * Carrega o conteúdo de um script específico
     */
    loadScriptContent(scriptName) {
        try {
            const script = this.availableScripts.find(s => s.name === scriptName);
            if (!script) {
                throw new Error(`Script '${scriptName}' não encontrado`);
            }

            if (!script.content) {
                script.content = fs.readFileSync(script.path, 'utf8');
            }

            return script.content;
        } catch (error) {
            console.error(`Erro ao carregar script '${scriptName}':`, error);
            throw error;
        }
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
                    results: []
                };
            }

            console.log(`Injetando script '${scriptName}' em todos os navegadores ativos...`);
            
            // Carregar configurações para scripts que precisam de parâmetros
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
            
            // Usar a função do browser-manager para injetar em todos os navegadores
            const result = await injectScriptInAllBrowsers(finalScriptContent);
            
            return result;

        } catch (error) {
            console.error('Erro na injeção de script:', error);
            return {
                success: false,
                message: error.message,
                results: []
            };
        }
    }

    /**
     * Injeta script em um navegador específico
     * Esta função deve ser implementada baseada no método de controle dos navegadores
     */
    async injectScriptInBrowser(navigatorId, scriptContent) {
        // TODO: Implementar injeção específica baseada no método usado
        // Exemplo com puppeteer:
        // const page = await this.getBrowserPage(navigatorId);
        // await page.evaluate(scriptContent);
        
        // Por enquanto, simular injeção
        console.log(`Simulando injeção de script no navegador ${navigatorId}`);
        
        // Simular delay de processamento
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return true;
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
                    results: []
                };
            }

            console.log(`Injetando script customizado em ${activeBrowsers.length} navegador(es)`);

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
            console.error('Erro na injeção de script customizado:', error);
            return {
                success: false,
                message: error.message,
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
        return this.availableScripts;
    }
}

// Criar instância singleton
const scriptInjector = new ScriptInjector();

// Exportar métodos estáticos
module.exports = {
    // Injetar script por nome
    injectScript: (scriptName) => scriptInjector.injectScriptInAllBrowsers(scriptName),
    
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
console.log('Módulo ScriptInjector inicializado');
console.log('Scripts disponíveis:', scriptInjector.getAvailableScripts().map(s => s.name));