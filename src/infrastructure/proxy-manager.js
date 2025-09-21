const https = require('https');
const http = require('http');

class ProxyManager {
    constructor() {
        this.currentProxy = null;
        this.isConnected = false;
        this.currentIP = null;
        this.page = null;
        this.browser = null;
        this.popupInjected = false;
        this.monitoringActive = false;
        this.originalIP = null;
    }

    /**
     * Configura proxy no navegador Puppeteer
     * @param {Object} browser - Instância do browser Puppeteer
     * @param {Object} page - Instância da página Puppeteer
     * @param {Object} proxyConfig - Configuração do proxy {host, port, username, password, protocol}
     */
    async setupProxy(browser, page, proxyConfig) {
        this.browser = browser;
        this.page = page;
        this.currentProxy = proxyConfig;

        try {
            console.log('Configurando proxy:', {
                host: proxyConfig.host,
                port: proxyConfig.port,
                hasAuth: !!(proxyConfig.username && proxyConfig.password)
            });

            if (proxyConfig.username && proxyConfig.password) {
                await ProxyManager.setupAuthentication(page, proxyConfig);
            } else {
                console.log('Proxy sem credenciais - tratando como proxy publico/aberto');
            }

            console.log('ProxyManager: Proxy configurado via Chrome args, apenas autenticacao necessaria');

            this.isConnected = true;
            console.log('Proxy configurado com sucesso');
            return true;

        } catch (error) {
            console.error('Erro ao configurar proxy:', error);
            this.isConnected = false;
            return false;
        }
    }


    static async setupAuthentication(page, proxyConfig) {
        if (!proxyConfig || !proxyConfig.username || !proxyConfig.password) {
            console.log('ProxyManager: nenhuma credencial fornecida, pulando autenticacao');
            return false;
        }

        if (!page || typeof page.authenticate !== 'function') {
            throw new Error('ProxyManager: pagina invalida para configurar autenticacao de proxy');
        }

        try {
            const credentials = {
                username: String(proxyConfig.username),
                password: String(proxyConfig.password)
            };

            await page.authenticate(credentials);
            console.log('ProxyManager: autenticacao de proxy configurada');
            return true;
        } catch (error) {
            console.error('ProxyManager: erro ao configurar autenticacao de proxy', error);
            throw error;
        }
    }


    /**
     * Configura proxy via argumentos do Chrome
     * @param {Object} proxyConfig - Configuração do proxy
     * @returns {Array} - Argumentos do Chrome para proxy
     */
    static getProxyChromeArgs(proxyConfig) {
        if (!proxyConfig || !proxyConfig.host || !proxyConfig.port) {
            return [];
        }

        const protocol = proxyConfig.protocol || 'http';
        let proxyServer = `${protocol}://${proxyConfig.host}:${proxyConfig.port}`;

        const args = [
            `--proxy-server=${proxyServer}`,
            '--disable-features=VizDisplayCompositor'
        ];

        console.log('Argumentos de proxy gerados:', args);
        return args;
    }

    /**
     * Constrói URL do proxy com autenticação
     */
    buildProxyUrl(proxyConfig) {
        const protocol = proxyConfig.protocol || 'http';
        let url = `${protocol}://`;
        
        if (proxyConfig.username && proxyConfig.password) {
            url += `${proxyConfig.username}:${proxyConfig.password}@`;
        }
        
        url += `${proxyConfig.host}:${proxyConfig.port}`;
        return url;
    }

    /**
     * Verifica IP atual - REMOVIDO para evitar conflitos
     */
    async checkCurrentIP() {
        // Método desabilitado para evitar conflitos com PopupBlocker
        return null;
    }

    /**
     * Injeta popup de monitoramento - REMOVIDO para evitar conflitos
     */
    async injectMonitoringPopup() {
        // Método desabilitado para evitar conflitos com PopupBlocker
        return;
    }

    /**
     * Atualiza status no popup - REMOVIDO para evitar conflitos
     */
    async updatePopupStatus() {
        // Método desabilitado para evitar conflitos com PopupBlocker
        return;
    }

    /**
     * Inicia monitoramento periódico do IP - REMOVIDO para evitar conflitos
     */
    startMonitoring() {
        // Método desabilitado para evitar conflitos com PopupBlocker
        return;
    }

    /**
     * Para monitoramento - REMOVIDO para evitar conflitos
     */
    stopMonitoring() {
        // Método desabilitado para evitar conflitos com PopupBlocker
        return;
    }

    /**
     * Desconecta proxy
     */
    async disconnect() {
        try {
            this.currentProxy = null;
            this.isConnected = false;
            
            // Não precisamos remover interceptação pois não a habilitamos
            // if (this.page) {
            //     await this.page.setRequestInterception(false);
            // }

            // Popup status removido para evitar conflitos
            console.log('Proxy desconectado');
            return true;

        } catch (error) {
            console.error('Erro ao desconectar proxy:', error);
            return false;
        }
    }

    /**
     * Reconecta proxy
     */
    async reconnect() {
        if (!this.currentProxy) return false;

        console.log('Reconectando proxy...');
        await this.disconnect();
        return await this.setupProxy(this.browser, this.page, this.currentProxy);
    }

    /**
     * Parse string de proxy em objeto configuração
     */
    static parseProxyString(proxyStr) {
        if (!proxyStr || typeof proxyStr !== 'string') {
            throw new Error('String de proxy invalida');
        }

        let protocol = 'http';
        let cleanProxy = proxyStr.trim();

        const protocolMatch = cleanProxy.match(/^(https?|socks[45]?):\/\//i);
        if (protocolMatch) {
            protocol = protocolMatch[1].toLowerCase();
            cleanProxy = cleanProxy.slice(protocolMatch[0].length);
        }

        cleanProxy = cleanProxy.trim();

        const normalize = (value) => value ? value.trim() : '';

        const buildResult = (host, port, username = '', password = '') => {
            const parsedPort = parseInt(port, 10);
            if (!host || Number.isNaN(parsedPort)) {
                throw new Error('Formato de proxy invalido: "' + proxyStr + '"');
            }

            return {
                host: normalize(host),
                port: parsedPort,
                username: normalize(username),
                password: normalize(password),
                protocol
            };
        };

        const hostPortRegex = /^([^:]+):(\d+)$/;
        const credentialsRegex = /^([^:]+):([^:]+)$/;

        const atIndex = cleanProxy.indexOf('@');
        if (atIndex >= 0) {
            const part1 = cleanProxy.slice(0, atIndex);
            const part2 = cleanProxy.slice(atIndex + 1);

            let hostMatch = part2.match(hostPortRegex);
            let credMatch = part1.match(credentialsRegex);
            if (hostMatch && credMatch) {
                return buildResult(hostMatch[1], hostMatch[2], credMatch[1], credMatch[2]);
            }

            hostMatch = part1.match(hostPortRegex);
            credMatch = part2.match(credentialsRegex);
            if (hostMatch && credMatch) {
                return buildResult(hostMatch[1], hostMatch[2], credMatch[1], credMatch[2]);
            }

            throw new Error('Formato de proxy invalido: "' + proxyStr + '"');
        }

        const parts = cleanProxy.split(':');

        if (parts.length === 2) {
            const hostMatch = cleanProxy.match(hostPortRegex);
            if (hostMatch) {
                return buildResult(hostMatch[1], hostMatch[2]);
            }
        }

        if (parts.length === 4) {
            const [p1, p2, p3, p4] = parts;

            if (/^\d+$/.test(p2)) {
                return buildResult(p1, p2, p3, p4);
            }

            if (/^\d+$/.test(p4)) {
                return buildResult(p3, p4, p1, p2);
            }
        }

        throw new Error('Formato de proxy invalido: "' + proxyStr + '"');
    }

    /**
     * Obtém status atual do proxy
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            currentProxy: this.currentProxy,
            currentIP: this.currentIP,
            originalIP: this.originalIP,
            monitoringActive: this.monitoringActive
        };
    }
}

module.exports = ProxyManager; 







