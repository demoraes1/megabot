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

            // Configurar autenticação APENAS se credenciais foram fornecidas no formato original
            if (proxyConfig.username && proxyConfig.password) {
                await page.authenticate({
                    username: proxyConfig.username,
                    password: proxyConfig.password
                });
                console.log('Autenticação de proxy configurada');
            } else {
                console.log('Proxy sem credenciais - tratando como proxy público/aberto');
            }

            // Proxy já está configurado via Chrome args, apenas configuramos autenticação
            console.log('ProxyManager: Proxy configurado via Chrome args, apenas autenticação necessária');

            this.isConnected = true;
            console.log('Proxy configurado com sucesso');
            return true;

        } catch (error) {
            console.error('Erro ao configurar proxy:', error);
            this.isConnected = false;
            return false;
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
            throw new Error('String de proxy inválida');
        }

        // Remove protocolos comuns se presentes
        let cleanProxy = proxyStr.replace(/^(https?|socks[45]?):\/\//, '');
        
        // Extrair protocolo se presente
        const protocolMatch = proxyStr.match(/^(https?|socks[45]?):/);
        const protocol = protocolMatch ? protocolMatch[1] : 'http';
        
        // Formato com autenticação: usuario:senha@host:porta
        let match = cleanProxy.match(/^([^:@]+):([^@]+)@([^:]+):(\d+)$/);
        
        if (match) {
            const [, username, password, host, port] = match;
            return {
                host: host.trim(),
                port: parseInt(port),
                username: username.trim(),
                password: password.trim(),
                protocol: protocol
            };
        }
        
        // Formato simples: host:porta
        match = cleanProxy.match(/^([^:]+):(\d+)$/);
        
        if (match) {
            const [, host, port] = match;
            return {
                host: host.trim(),
                port: parseInt(port),
                username: '',
                password: '',
                protocol: protocol
            };
        }
        
        throw new Error(`Formato de proxy inválido: "${proxyStr}"`);
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