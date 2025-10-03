const puppeteer = require('rebrowser-puppeteer');
const path = require('path');
const fs = require('fs');
const extensionsManager = require('./extensions-manager');

const { getRandomDevice } = require('./mobile-devices');
const ProxyManager = require('../infrastructure/proxy-manager');
const ChromiumDownloader = require('../infrastructure/chromium-downloader');
const profileManager = require('../automation/profile-manager');

// Sistema de logging com níveis
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO; // Configurável

function log(level, navigatorId, message, ...args) {
    if (LOG_LEVELS[level] >= CURRENT_LOG_LEVEL) {
        const timestamp = new Date().toISOString().substr(11, 12);
        const prefix = navigatorId ? `[${timestamp}] [${level}] [Navegador ${navigatorId}]` : `[${timestamp}] [${level}]`;
        console.log(prefix, message, ...args);
    }
}

const logger = {
    debug: (navigatorId, message, ...args) => log('DEBUG', navigatorId, message, ...args),
    info: (navigatorId, message, ...args) => log('INFO', navigatorId, message, ...args),
    warn: (navigatorId, message, ...args) => log('WARN', navigatorId, message, ...args),
    error: (navigatorId, message, ...args) => log('ERROR', navigatorId, message, ...args)
};

// --- CONFIGURAÇÕES ---
const LARGURA_LOGICA = 502;
const ALTURA_LOGICA = 800;
const FATOR_ESCALA = 0.65;
const DELAY_PARA_REGISTRO_JANELAS = 10; // ms
// --- FIM DAS CONFIGURAÇÕES ---

function carregarExtensoes() {
    try {
        const configuredExtensions = extensionsManager.listExtensions() || [];
        const enabledExtensions = extensionsManager.listEnabledExtensionPaths();

        if (configuredExtensions.length > 0) {
            return enabledExtensions;
        }

        const fallbackExtensions = extensionsManager.listLocalExtensionDirectories();
        if (fallbackExtensions.length > 0) {
            console.warn('[Extensions] Nenhuma extensão explicitamente habilitada. Usando fallback com diretório local.');
        }
        return fallbackExtensions;
    } catch (error) {
        console.error('Erro ao carregar extensões:', error);
        return [];
    }
}

async function detectChromePath() {
    try {
        const chromiumDownloader = new ChromiumDownloader();
        
        // Usar apenas o Chrome local - verificações de atualização são feitas na inicialização do app
        if (await chromiumDownloader.checkBrowserExists()) {
            const chromePath = chromiumDownloader.getChromePath();
            console.log(`[Chrome] Usando Chrome local: ${chromePath}`);
            return chromePath;
        }
        
        // Se não existir, retornar erro - o download deve ser feito na inicialização
        console.error('[Chrome] Chrome não encontrado! Execute a verificação de atualizações na inicialização do app.');
        throw new Error('Chrome não encontrado. Reinicie a aplicação para fazer o download.');
    } catch (error) {
        console.error('[Chrome] Erro ao obter Chrome:', error.message);
        return null;
    }
}


async function injectAutomationScript(page, navigatorId, scriptFileName, options = {}) {
    const { configData = null, logLabel = scriptFileName, successMessage = null } = options;
    const scriptsDir = path.join(__dirname, '..', 'automation', 'scripts');
    const scriptPath = path.join(scriptsDir, scriptFileName);

    try {
        console.log(`[Navegador ${navigatorId}] Lendo script ${logLabel} de: ${scriptPath}`);
        if (!fs.existsSync(scriptPath)) {
            console.warn(`[Navegador ${navigatorId}] Arquivo ${logLabel} nao encontrado em: ${scriptPath}`);
            return false;
        }

        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        let configScript = '';

        if (configData) {
            const serializedConfig = JSON.stringify(configData);
            configScript = `
                (function() {
                    window.megabotConfig = window.megabotConfig || {};
                    Object.assign(window.megabotConfig, ${serializedConfig});
                    window.dispatchEvent(new CustomEvent('megabot-config-ready', { detail: window.megabotConfig }));
                    console.log('Configuracao MegaBot injetada para ${logLabel}:', window.megabotConfig);
                })();
            `;
        }

        const finalScript = configScript ? `${configScript}
${scriptContent}` : scriptContent;

        await page.evaluateOnNewDocument(finalScript);

        if (configData) {
            await page.evaluate((payload) => {
                window.megabotConfig = window.megabotConfig || {};
                Object.assign(window.megabotConfig, payload);
                window.dispatchEvent(new CustomEvent('megabot-config-ready', { detail: window.megabotConfig }));
            }, configData);
        }

        const successLog = successMessage || `Script ${logLabel} injetado permanentemente via evaluateOnNewDocument`;
        console.log(`[Navegador ${navigatorId}] ${successLog}`);
        return true;
    } catch (error) {
        console.error(`[Navegador ${navigatorId}] Erro ao injetar ${logLabel}:`, error.message);
        return false;
    }
}

async function startBrowser(options) {
    console.log(`[DEBUG] Iniciando função startBrowser para navegador ${options.navigatorId}`);
    let browser = null;
    let page = null; // Manter referência da página para navegação posterior
    const { url, navigatorId, proxy, automation = {}, blockedDomains, windowConfig } = options;

    try {
        // Usar o ID do perfil gerado pelo profile-manager ou gerar um aleatório como fallback
        let profileId;
        if (options.profile && options.profile.profile) {
        profileId = options.profile.profile;
            logger.info(navigatorId, `Usando perfil existente: ${profileId}`);
        } else {
            const randomId = Math.random().toString(36).substring(2, 7);
            profileId = `profile_${randomId}`;
            logger.info(navigatorId, `Perfil único criado: ${profileId}`);
        }
        const profilePath = path.join(__dirname, '..', '..', 'profiles', profileId);
        
        const randomMobile = getRandomDevice();
        logger.info(navigatorId, `Dispositivo selecionado: ${randomMobile.name}`);

        // Verificar se o dispositivo e viewport são válidos
        if (!randomMobile || !randomMobile.device || !randomMobile.device.viewport) {
            throw new Error('Dispositivo móvel inválido ou viewport não definido');
        }

        logger.info(navigatorId, `Dispositivo selecionado: ${randomMobile.name}`);
            logger.debug(navigatorId, `Viewport: ${randomMobile.device.viewport.width}x${randomMobile.device.viewport.height}`);
            logger.debug(navigatorId, `UserAgent: ${randomMobile.device.userAgent}`);

        // Preparar argumentos do Chrome para viewport adaptativa (como no index.js)
        let windowWidth = randomMobile.device.viewport.width;
        let windowHeight = randomMobile.device.viewport.height + 100; // +100 para barra de endereço
        
        // Usar dimensões personalizadas se fornecidas
        if (windowConfig) {
            windowWidth = windowConfig.LARGURA_LOGICA || windowWidth;
            windowHeight = windowConfig.ALTURA_LOGICA || windowHeight;
        }
        
        const deviceScaleFactor = 0.65 // Escala sempre fixa em 0.65
        
        logger.info(navigatorId, `Configurações finais de janela: ${windowWidth}x${windowHeight}, escala: ${deviceScaleFactor}`);

        const chromeArgs = [
            `--user-data-dir=${profilePath}`,
            `--window-size=${windowWidth},${windowHeight}`,
            // Inicia fora da tela para evitar flash antes do reposicionamento
            '--window-position=-5000,-5000',
            `--force-device-scale-factor=${deviceScaleFactor}`,
            '--exclude-switches=enable-automation',
            '--no-first-run',
            '--disable-default-apps',
            '--disable-infobars',
            '--disable-features=TranslateUI',
            // Argumentos otimizados para performance e baixo consumo de CPU
            '--enable-gpu-rasterization',
            '--enable-zero-copy',
            '--enable-hardware-overlays',
            '--max-active-webgl-contexts=1',
            '--renderer-process-limit=1',
            '--max-unused-resource-memory-usage-percentage=5',
            '--memory-pressure-off',
            '--process-per-site',
            '--disable-dev-shm-usage',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-hang-monitor',
            '--disable-prompt-on-repost',
            '--disable-domain-reliability',
            '--disable-component-extensions-with-background-pages',
            '--disable-background-networking',
            '--disable-sync',
            '--metrics-recording-only',
            '--no-crash-upload',
            '--disable-crash-reporter',
            '--lang=pt-BR',
            '--accept-lang=pt-BR,pt;q=0.9,en;q=0.8'
        ];

        // Configuração de proxy usando ProxyManager
        let proxyConfig = null;
        let proxyArgs = [];
        
        // Verificar se há proxy do perfil (formato do config.json)
        if (proxy && proxy.host && proxy.port) {
            try {
                // Proxy do perfil - usar diretamente
                proxyConfig = {
                    host: proxy.host,
                    port: proxy.port,
                    protocol: proxy.protocol || 'http',
                    username: proxy.username || null,
                    password: proxy.password || null
                };
                proxyArgs = ProxyManager.getProxyChromeArgs(proxyConfig);
                console.log(`[Navegador ${navigatorId}] Usando proxy do perfil: ${proxy.host}:${proxy.port}`);
            } catch (error) {
                console.error(`[Navegador ${navigatorId}] Erro ao configurar proxy do perfil:`, error.message);
                proxyConfig = null;
                proxyArgs = [];
            }
        } else if (proxy && proxy.mode && proxy.mode !== 'none') {
            try {
                if (proxy.mode === 'rotating' && proxy.list && proxy.list.length > 0) {
                    // Modo rotativo: mesmo proxy para todas as instâncias
                    const selectedProxy = proxy.list[0]; // Usar o primeiro proxy da lista
                    proxyConfig = ProxyManager.parseProxyString(selectedProxy);
                    proxyArgs = ProxyManager.getProxyChromeArgs(proxyConfig);
                    console.log(`[Navegador ${navigatorId}] Modo rotativo - Usando proxy: ${selectedProxy}`);
                } else if (proxy.mode === 'list' && proxy.list && proxy.list.length > 0) {
                    // Modo lista: proxy diferente para cada navegador
                    const proxyIndex = navigatorId % proxy.list.length; // navigatorId começa em 0
                    const selectedProxy = proxy.list[proxyIndex];
                    
                    if (selectedProxy) {
                        proxyConfig = ProxyManager.parseProxyString(selectedProxy);
                        proxyArgs = ProxyManager.getProxyChromeArgs(proxyConfig);
                        console.log(`[Navegador ${navigatorId}] Modo lista - Usando proxy [${proxyIndex}]: ${selectedProxy}`);
                    } else {
                        console.warn(`[Navegador ${navigatorId}] Nenhum proxy disponível no índice ${proxyIndex}`);
                    }
                }
            } catch (error) {
                console.error(`[Navegador ${navigatorId}] Erro ao configurar proxy:`, error.message);
                proxyConfig = null;
                proxyArgs = [];
            }
        } else {
            console.log(`[Navegador ${navigatorId}] Proxy desativado - navegando sem proxy`);
        }
        
        // Adicionar argumentos de proxy ao Chrome
        chromeArgs.push(...proxyArgs);
        console.log(`[DEBUG] Configuração de proxy concluída para navegador ${navigatorId}`);
        
        // Salvar informação do proxy no perfil se disponível
        if (options.profile && options.profile.profile && proxyConfig) {
            try {
                const proxyInfo = {
                    host: proxyConfig.host,
                    port: proxyConfig.port,
                    protocol: proxyConfig.protocol,
                    username: proxyConfig.username || null,
                    password: proxyConfig.password || null
                };
                await profileManager.updateProfile(options.profile.profile, { proxy: proxyInfo });
                console.log(`[Navegador ${navigatorId}] Proxy salvo no perfil: ${proxyConfig.host}:${proxyConfig.port}`);
            } catch (error) {
                console.error(`[Navegador ${navigatorId}] Erro ao salvar proxy no perfil:`, error.message);
            }
        }
        
        if (automation && automation.muteAudio) {
            chromeArgs.push('--mute-audio');
            console.log(`[Navegador ${navigatorId}] Áudio desabilitado.`);
        }

        // Perfis removidos - navegador usará perfil temporário

        const extensoes = carregarExtensoes();
        if (extensoes.length > 0) {
            const extensionPaths = extensoes.join(',');
            chromeArgs.push(`--disable-extensions-except=${extensionPaths}`);
            chromeArgs.push(`--load-extension=${extensionPaths}`);
            console.log(`[Navegador ${navigatorId}] Carregando ${extensoes.length} extensões.`);
        }

        console.log(`[DEBUG] Iniciando detectChromePath para navegador ${navigatorId}`);
        const executablePath = await detectChromePath();
        console.log(`[DEBUG] detectChromePath concluído para navegador ${navigatorId}: ${executablePath}`);
        if (!executablePath) {
            throw new Error('Nenhuma instalação do Google Chrome foi encontrada. Verifique se o Chrome está instalado.');
        }

        const launchOptions = {
            executablePath,
            headless: false,
            defaultViewport: null,
            args: chromeArgs,
            ignoreDefaultArgs: [
                '--enable-automation',
                '--disable-component-extensions-with-background-pages',
                '--disable-default-apps',
                '--disable-extensions'
            ]
        };

        console.log(`[Navegador ${navigatorId}] Iniciando puppeteer.launch...`);
        browser = await puppeteer.launch(launchOptions);
        console.log(`[Navegador ${navigatorId}] Puppeteer.launch concluído com sucesso!`);
        console.log(`[Navegador ${navigatorId}] Obtendo páginas do navegador...`);
        page = (await browser.pages())[0] || await browser.newPage();
        console.log(`[Navegador ${navigatorId}] Página obtida com sucesso!`);
        
        // Configurar autenticação de proxy se necessário
        if (proxyConfig && proxyConfig.username && proxyConfig.password) {
            console.log(`[Navegador ${navigatorId}] Configurando autenticação de proxy...`);
            await ProxyManager.setupAuthentication(page, proxyConfig);
            console.log(`[Navegador ${navigatorId}] Autenticação de proxy configurada!`);
        }

        // =================================================================================
        // [NOVO] INÍCIO DA LÓGICA DE BLOQUEIO DE DOMÍNIO
        // =================================================================================
        console.log(`[Navegador ${navigatorId}] Configurando bloqueio de domínios...`);
        const dominiosParaBloquear = blockedDomains || ['gcaptcha4-hrc.gsensebot.com', 'gcaptcha4-hrc.geetest.com'];

        if (dominiosParaBloquear.length > 0) {
            console.log(`[Navegador ${navigatorId}] Ativando interceptação de requisições...`);
            await page.setRequestInterception(true);
            console.log(`[Navegador ${navigatorId}] Interceptação de requisições ativada.`);
            console.log(`[Navegador ${navigatorId}] Domínios para bloqueio:`, dominiosParaBloquear);
            
            page.on('request', (request) => {
                const requestUrl = request.url();
                const isBlocked = dominiosParaBloquear.some(dominio => requestUrl.includes(dominio));

                if (isBlocked) {
                    console.warn(`[BLOQUEADO][Navegador ${navigatorId}]: ${requestUrl}`);
                    request.abort();
                } else {
                    request.continue();
                }
            });
        }
        // =================================================================================
        // [NOVO] FIM DA LÓGICA DE BLOQUEIO
        // =================================================================================

        // Aplicar User Agent para emulação móvel (viewport adaptativa via Chrome args)
        console.log(`[Navegador ${navigatorId}] Configurando User Agent...`);
        await page.setUserAgent(randomMobile.device.userAgent);
        console.log(`[Navegador ${navigatorId}] User Agent configurado!`);
        
        // Configurar idioma português brasileiro
        console.log(`[Navegador ${navigatorId}] Configurando headers HTTP...`);
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
        });
        console.log(`[Navegador ${navigatorId}] Headers HTTP configurados!`);
        console.log(`[Navegador ${navigatorId}] Dispositivo configurado: ${randomMobile.name}`);
        console.log(`[Navegador ${navigatorId}] UserAgent aplicado: ${randomMobile.device.userAgent}`);
        console.log(`[Navegador ${navigatorId}] Viewport adaptativo: ${randomMobile.device.viewport.width}x${randomMobile.device.viewport.height}`);
        console.log(`[Navegador ${navigatorId}] Touch support: ${randomMobile.device.viewport.hasTouch}`);
        console.log(`[Navegador ${navigatorId}] Mobile: ${randomMobile.device.viewport.isMobile}`);
        console.log(`[Navegador ${navigatorId}] Device scale factor: ${randomMobile.device.viewport.deviceScaleFactor}`);
        
        // Listeners úteis adicionados do seu script
        console.log(`[Navegador ${navigatorId}] Configurando listeners de página...`);
        page.on('dialog', async dialog => {
            console.warn(`[Navegador ${navigatorId}] Diálogo detectado e dispensado: ${dialog.message()}`);
            await dialog.dismiss();
        });
        page.on('error', err => {
            console.error(`[Navegador ${navigatorId}] ERRO NA PÁGINA: `, err.message);
        });
        console.log(`[Navegador ${navigatorId}] Listeners de página configurados!`);

        // Configurar TouchSimulator integrado
        console.log(`[Navegador ${navigatorId}] Configurando TouchSimulator...`);
        await page.evaluateOnNewDocument(() => {
            // CSS para ambiente mobile completo
            const mobileStyle = document.createElement('style');
            mobileStyle.innerHTML = `
                /* Estilos mobile para todos os elementos interativos */
                * {
                    -webkit-tap-highlight-color: rgba(0,0,0,0.1) !important;
                }
                
                /* Canvas mantém comportamento original */
                canvas {
                    -webkit-touch-callout: none !important;
                    -webkit-user-select: none !important;
                    -khtml-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                    user-select: none !important;
                    -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
                    touch-action: none !important;
                    cursor: default !important;
                }
                
                /* Elementos interativos com comportamento touch */
                button, a, [role="button"], .btn, [onclick], 
                .ui-select, .ui-select-single, .dropdown, 
                [class*="select"], [class*="dropdown"], [class*="option"] {
                    touch-action: manipulation !important;
                    -webkit-user-select: none !important;
                    user-select: none !important;
                    cursor: pointer !important;
                }
                
                /* Inputs de texto mantêm comportamento normal */
                input[type="text"], input[type="email"], input[type="password"],
                input[type="search"], input[type="url"], input[type="tel"], textarea {
                    touch-action: auto !important;
                    -webkit-user-select: text !important;
                    user-select: text !important;
                }
                
                html, body {
                    -webkit-overflow-scrolling: touch !important;
                    scroll-behavior: smooth !important;
                    touch-action: pan-x pan-y !important;
                }
                
                canvas::selection { 
                    background: transparent !important; 
                }
                canvas::-moz-selection { 
                    background: transparent !important; 
                }
            `;
            
            // Aplicar estilos
            if (document.head) {
                document.head.appendChild(mobileStyle);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.head.appendChild(mobileStyle);
                });
            }
            
            // Interceptar eventos em elementos mobile (exceto inputs de texto)
            document.addEventListener('selectstart', (e) => {
                if (shouldIntercept(e.target)) {
                    e.stopPropagation();
                    e.preventDefault();
                    return false;
                }
            }, true);
            
            document.addEventListener('dragstart', (e) => {
                if (shouldIntercept(e.target)) {
                    e.stopPropagation();
                    e.preventDefault();
                    return false;
                }
            }, true);
            
            document.addEventListener('contextmenu', (e) => {
                if (shouldIntercept(e.target)) {
                    e.stopPropagation();
                    e.preventDefault();
                    return false;
                }
            }, true);

            // NÃO bloquear clicks - deixar que touch events sejam suficientes
            // ou que clicks normais funcionem como fallback

            // Interceptação completa - todos os elementos (ambiente mobile completo)
            let isIntercepting = true;

            // Verificar se elemento deve ser interceptado
            function shouldIntercept(element) {
                if (!element) return false;
                
                // Em ambiente mobile, interceptar TODOS os elementos
                // Exceto inputs de texto para manter funcionalidade de digitação
                const tagName = element.tagName.toLowerCase();
                
                // Elementos que devem manter comportamento normal de mouse
                const excludedTags = ['input', 'textarea'];
                if (excludedTags.includes(tagName)) {
                    const inputType = element.getAttribute('type') || 'text';
                    // Apenas inputs de texto mantêm mouse normal
                    if (['text', 'email', 'password', 'search', 'url', 'tel'].includes(inputType)) {
                        return false;
                    }
                }
                
                // Todos os outros elementos recebem conversão touch
                return true;
            }

            // Helper para criar objetos Touch reutilizáveis
            function createTouchObject(element, event) {
                return new Touch({
                    identifier: 1,
                    target: element,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    pageX: event.pageX,
                    pageY: event.pageY,
                    screenX: event.screenX,
                    screenY: event.screenY,
                    radiusX: 15,
                    radiusY: 15,
                    rotationAngle: 0,
                    force: 1
                });
            }

            // Criar touch events reais
            function createTouchEvent(type, touch, element) {
                const touchEvent = new TouchEvent(type, {
                    touches: type === 'touchend' ? [] : [touch],
                    targetTouches: type === 'touchend' ? [] : [touch],
                    changedTouches: [touch],
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                return touchEvent;
            }

            // Interceptar mousedown -> touchstart
            document.addEventListener('mousedown', function(e) {
                if (!isIntercepting || !shouldIntercept(e.target)) return;
                
                // NÃO bloquear o evento original - apenas adicionar touch
                const element = e.target;
                
                // Debug log para verificar interceptação
                // console.log('TouchSimulator: Adicionando touch em', element.tagName, element.className);
                const touch = createTouchObject(element, e);

                const touchStartEvent = createTouchEvent('touchstart', touch, element);
                element.dispatchEvent(touchStartEvent);
                
                // Permitir que evento original continue
            }, true);

            // Interceptar mousemove -> touchmove
            let isDragging = false;
            let dragTarget = null;
            
            document.addEventListener('mousemove', function(e) {
                if (!isIntercepting || !isDragging || !dragTarget || !shouldIntercept(dragTarget)) return;
                
                e.stopPropagation();
                e.preventDefault();
                
                const element = document.elementFromPoint(e.clientX, e.clientY) || e.target;
                const touch = createTouchObject(element, e);

                const touchMoveEvent = createTouchEvent('touchmove', touch, element);
                element.dispatchEvent(touchMoveEvent);
                
                return false;
            }, true);

            // Detectar início de drag
            document.addEventListener('mousedown', function(e) {
                if (shouldIntercept(e.target)) {
                    isDragging = true;
                    dragTarget = e.target;
                } else {
                    isDragging = false;
                    dragTarget = null;
                }
            }, true);

            // Interceptar mouseup -> touchend
            document.addEventListener('mouseup', function(e) {
                if (!isIntercepting || !shouldIntercept(e.target)) {
                    isDragging = false;
                    dragTarget = null;
                    return;
                }
                
                isDragging = false;
                dragTarget = null;
                
                // NÃO bloquear o evento original - apenas adicionar touch
                
                const element = e.target;
                const touch = new Touch({
                    identifier: 1,
                    target: element,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    pageX: e.pageX,
                    pageY: e.pageY,
                    screenX: e.screenX,
                    screenY: e.screenY,
                    radiusX: 15,
                    radiusY: 15,
                    rotationAngle: 0,
                    force: 1
                });

                const touchEndEvent = createTouchEvent('touchend', touch, element);
                element.dispatchEvent(touchEndEvent);
                
                // console.log('TouchSimulator: touchend disparado para', element.tagName, element.className);
                
                // Permitir que evento original continue (click normal)
            }, true);

            // Interceptar wheel -> touch swipe
            document.addEventListener('wheel', function(e) {
                if (!isIntercepting || !shouldIntercept(e.target)) return;
                
                e.stopPropagation();
                e.preventDefault();
                
                const deltaX = e.deltaX;
                const deltaY = e.deltaY;
                const element = e.target;
                
                // Simular swipe baseado no scroll
                const startX = e.clientX;
                const startY = e.clientY;
                const endX = startX - (deltaX * 2);
                const endY = startY - (deltaY * 2);
                
                // Touch start
                const startTouch = new Touch({
                    identifier: 1,
                    target: element,
                    clientX: startX,
                    clientY: startY,
                    pageX: startX,
                    pageY: startY,
                    screenX: startX,
                    screenY: startY,
                    radiusX: 15,
                    radiusY: 15,
                    rotationAngle: 0,
                    force: 1
                });
                
                element.dispatchEvent(createTouchEvent('touchstart', startTouch, element));
                
                // Touch move e end com delays
                setTimeout(() => {
                    const endTouch = new Touch({
                        identifier: 1,
                        target: element,
                        clientX: endX,
                        clientY: endY,
                        pageX: endX,
                        pageY: endY,
                        screenX: endX,
                        screenY: endY,
                        radiusX: 15,
                        radiusY: 15,
                        rotationAngle: 0,
                        force: 1
                    });
                    
                    element.dispatchEvent(createTouchEvent('touchmove', endTouch, element));
                    
                    setTimeout(() => {
                        element.dispatchEvent(createTouchEvent('touchend', endTouch, element));
                    }, 50);
                }, 50);
                
                return false;
            }, true);
        });

        // =================================================================================
        // [NOVO] INJEÇÃO DO POPUP.JS - ELEMENTO DELETER
        // =================================================================================
        await injectAutomationScript(page, navigatorId, 'popup.js', {
            logLabel: 'popup.js'
        });
        // =================================================================================
        // [NOVO] FIM DA INJEÇÃO DO POPUP.JS
        // =================================================================================

        // =================================================================================
        // [NOVO] INJEÇÃO DO IPVIEW.JS - VISUALIZADOR DE IP
        // =================================================================================
        const proxyInfoForInjection = proxyConfig ? {
            host: proxyConfig.host,
            port: proxyConfig.port,
            protocol: proxyConfig.protocol || null
        } : null;

        await injectAutomationScript(page, navigatorId, 'ipview.js', {
            logLabel: 'ipview.js',
            configData: {
                browserIndex: navigatorId,
                proxyEnabled: Boolean(proxyConfig),
                proxyInfo: proxyInfoForInjection
            },
            successMessage: `Script ipview.js injetado permanentemente via evaluateOnNewDocument com browserIndex ${navigatorId}`
        });
        // =================================================================================
        // [NOVO] FIM DA INJEÇÃO DO IPVIEW.JS
        // =================================================================================

        // Configurar stealth - mascarar webdriver e automação
        await page.evaluateOnNewDocument((deviceInfo) => {
            // Mascarar webdriver completamente
            Object.defineProperty(Navigator.prototype, 'webdriver', {
                get: () => false,
                enumerable: false,
                configurable: true
            });
            
            if (navigator.hasOwnProperty('webdriver')) {
                delete navigator.webdriver;
            }

            // Remover propriedades CDC (Chrome DevTools)
            const cdcProps = Object.getOwnPropertyNames(window).filter(prop => prop.startsWith('cdc_'));
            cdcProps.forEach(prop => {
                delete window[prop];
            });

            // Melhorar objeto chrome
            if (!window.chrome || typeof window.chrome !== 'object') {
                Object.defineProperty(window, 'chrome', {
                    value: {
                        runtime: {
                            onConnect: undefined,
                            onMessage: undefined
                        },
                        loadTimes: function() {
                            return {
                                requestTime: Date.now() / 1000,
                                startLoadTime: Date.now() / 1000,
                                commitLoadTime: Date.now() / 1000,
                                finishDocumentLoadTime: Date.now() / 1000,
                                finishLoadTime: Date.now() / 1000,
                                firstPaintTime: Date.now() / 1000,
                                firstPaintAfterLoadTime: 0,
                                navigationType: 'Other',
                                wasFetchedViaSpdy: false,
                                wasNpnNegotiated: false,
                                npnNegotiatedProtocol: 'unknown',
                                wasAlternateProtocolAvailable: false,
                                connectionInfo: 'unknown'
                            };
                        },
                        csi: function() {
                            return {
                                startE: Date.now(),
                                onloadT: Date.now(),
                                pageT: Date.now(),
                                tran: 15
                            };
                        },
                        app: {}
                    },
                    writable: false,
                    enumerable: true,
                    configurable: false
                });
            }

            // Configurar touch support para mobile
            if (deviceInfo.viewport && deviceInfo.viewport.hasTouch) {
                Object.defineProperty(window, 'ontouchstart', {
                    value: null,
                    enumerable: true,
                    configurable: true
                });
                
                Object.defineProperty(window, 'ontouchmove', {
                    value: null,
                    enumerable: true,
                    configurable: true
                });
                
                Object.defineProperty(window, 'ontouchend', {
                    value: null,
                    enumerable: true,
                    configurable: true
                });
                
                Object.defineProperty(window, 'ontouchcancel', {
                    value: null,
                    enumerable: true,
                    configurable: true
                });

                // Document touch events
                Object.defineProperty(document, 'ontouchstart', {
                    value: null,
                    enumerable: true,
                    configurable: true
                });
                
                Object.defineProperty(document, 'ontouchmove', {
                    value: null,
                    enumerable: true,
                    configurable: true
                });
                
                Object.defineProperty(document, 'ontouchend', {
                    value: null,
                    enumerable: true,
                    configurable: true
                });
                
                Object.defineProperty(document, 'ontouchcancel', {
                    value: null,
                    enumerable: true,
                    configurable: true
                });

                // Compatibilidade com APIs antigas
                if (!document.createTouch) {
                    document.createTouch = function(view, target, identifier, pageX, pageY, screenX, screenY) {
                        return {
                            identifier: identifier,
                            target: target,
                            pageX: pageX,
                            pageY: pageY,
                            screenX: screenX,
                            screenY: screenY,
                            clientX: pageX,
                            clientY: pageY
                        };
                    };
                }

                if (!document.createTouchList) {
                    document.createTouchList = function(...touches) {
                        const touchList = [...touches];
                        touchList.item = function(index) {
                            return this[index] || null;
                        };
                        return touchList;
                    };
                }
            }

            // Remover outras pistas de automação
            ['__webdriver_evaluate', '__selenium_evaluate', '__webdriver_script_function', '__webdriver_script_func', '__webdriver_script_fn', '__fxdriver_evaluate', '__driver_unwrapped', '__webdriver_unwrapped', '__driver_evaluate', '__selenium_unwrapped', '__fxdriver_unwrapped'].forEach(prop => {
                delete window[prop];
            });

            // Ocultar propriedades de automação mais profundamente
            const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
            Object.getOwnPropertyNames = function(obj) {
                const props = originalGetOwnPropertyNames(obj);
                return props.filter(prop => prop !== 'webdriver');
            };

            const originalKeys = Object.keys;
            Object.keys = function(obj) {
                const keys = originalKeys(obj);
                return keys.filter(key => key !== 'webdriver');
            };

        }, randomMobile.device);

        // Configurar navigatorId no localStorage e window se fornecido
        if (navigatorId) {
            await page.evaluateOnNewDocument((navId) => {
                // Injetar navigatorId no window
                Object.defineProperty(window, 'navigatorId', {
                    value: navId,
                    writable: false,
                    enumerable: true,
                    configurable: false
                });
                
                // Aguardar DOM estar pronto para configurar localStorage
                document.addEventListener('DOMContentLoaded', () => {
                    try {
                        localStorage.setItem('navigatorId', navId);
                        // console.log(`[TouchSimulator] NavigatorId ${navId} configurado no localStorage`);
                    } catch (error) {
                        console.warn('[TouchSimulator] Erro ao configurar localStorage:', error);
                    }
                });
            }, navigatorId);
        }
        console.log(`[Navegador ${navigatorId}] TouchSimulator configurado com sucesso!`);

        // Configurar título único para identificação da janela
        console.log(`[Navegador ${navigatorId}] Configurando título único...`);
        const uniqueTitle = `Navegador_ID_${navigatorId}`;
        await page.evaluateOnNewDocument((title) => {
            document.addEventListener('DOMContentLoaded', () => {
                document.title = title;
            });
        }, uniqueTitle);
        
        // Normalizar URL - adicionar http/https se necessário
        function normalizeUrl(url) {
            if (!url || url.trim() === '') {
                return 'about:blank';
            }
            
            const trimmedUrl = url.trim();
            
            // Se já tem protocolo, retorna como está (usando regex que é mais conciso)
            if (trimmedUrl.match(/^https?:\/\//)) {
                return trimmedUrl;
            }
            
            // Protocolos especiais
            if (trimmedUrl.startsWith('about:') || trimmedUrl.startsWith('file:') || trimmedUrl.startsWith('data:')) {
                return trimmedUrl;
            }
            
            // Para todos os outros casos, adiciona https://
            return `https://${trimmedUrl}`;
        }
        
        console.log(`[Navegador ${navigatorId}] Título único configurado: ${uniqueTitle}`);
        console.log(`[Navegador ${navigatorId}] Exibindo informações do navegador ID: ${navigatorId}`);
        
        // Criar conteúdo HTML personalizado com informações do navegador
        const htmlContent = `
            <html>
                <head>
                    <title>${uniqueTitle}</title>
                    <style>
                        body {
                            background-color: #111;
                            color: #eee;
                            font-family: sans-serif;
                            text-align: center;
                            padding-top: 50px;
                            margin: 0;
                        }
                        h1 {
                            font-size: 3em;
                            margin-bottom: 20px;
                        }
                        p {
                            font-size: 1.2em;
                            margin: 10px 0;
                        }
                        .info-box {
                            background-color: #222;
                            border: 1px solid #444;
                            border-radius: 8px;
                            padding: 20px;
                            margin: 20px auto;
                            max-width: 400px;
                        }
                    </style>
                </head>
                <body>
                    <div class="info-box">
                        <h1>ID: ${navigatorId}</h1>
                        <p>Navegador: ${uniqueTitle}</p>
                        <p>Status: Ativo</p>
                        <p>Dispositivo: ${randomMobile.name}</p>
                    </div>
                </body>
            </html>
        `;
        
        // Definir o conteúdo HTML personalizado
        console.log(`[Navegador ${navigatorId}] Definindo conteúdo HTML personalizado...`);
        await page.setContent(htmlContent);
        console.log(`[Navegador ${navigatorId}] Conteúdo HTML definido com sucesso!`);

        // Navegar para a URL do perfil se disponível
        if (options.profile && options.profile.url) {
            try {
                const profileUrl = normalizeUrl(options.profile.url);
                console.log(`[Navegador ${navigatorId}] Navegando para URL do perfil: ${profileUrl}`);
                await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                console.log(`[Navegador ${navigatorId}] Navegação para URL do perfil concluída!`);
            } catch (error) {
                console.error(`[Navegador ${navigatorId}] Erro ao navegar para URL do perfil:`, error.message);
            }
        } else {
            console.log(`[Navegador ${navigatorId}] Nenhuma URL de perfil definida, mantendo página inicial`);
        }

        logger.info(navigatorId, `Navegador ${navigatorId} iniciado com sucesso.`);
        console.log(`[Navegador ${navigatorId}] Retornando objetos browser e page...`);

        // Retornar os objetos browser e page para o browser-manager
        return { browser, page };

    } catch (error) {
        logger.error(navigatorId, `Erro fatal:`, error);
        if (browser) await browser.close();
        throw error;
    }
}



// Função para normalizar URLs
function normalizeUrl(url) {
    if (!url || url.trim() === '') {
        return 'about:blank';
    }
    
    const trimmedUrl = url.trim();
    
    // Se já tem protocolo, retorna como está (usando regex que é mais conciso)
    if (trimmedUrl.match(/^https?:\/\//)) {
        return trimmedUrl;
    }
    
    // Protocolos especiais
    if (trimmedUrl.startsWith('about:') || trimmedUrl.startsWith('file:') || trimmedUrl.startsWith('data:')) {
        return trimmedUrl;
    }
    
    // Para todos os outros casos, adiciona https://
    return `https://${trimmedUrl}`;
}

// Exportar o módulo
module.exports = {
    startBrowser,
    normalizeUrl
};