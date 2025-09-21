// Função principal que faz todo o trabalho.
function showIpDisplay() {
    if (document.getElementById('my-ip-viewer-container')) {
        return;
    }

    const container = document.createElement('div');
    container.id = 'my-ip-viewer-container';
    container.style.position = 'fixed';
    container.style.bottom = '10px';
    container.style.right = '10px';
    container.style.zIndex = '2147483647';
    container.style.pointerEvents = 'none';

    const shadowRoot = container.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      div {
        background-color: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 5px 10px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        pointer-events: none;
      }
      .navigation-id {
        color: #ffff00;
        font-weight: bold;
      }
    `;

    const ipBox = document.createElement('div');
    let navigationId = window.megabotConfig?.browserIndex ?? window.navigatorId ?? 0;
    let lastProxySignature = null;
    let lastDisplayedIp = null;
    let fetchInFlight = null;

    const ensureContainer = () => {
        if (!document.body.contains(container)) {
            document.body.appendChild(container);
        }
    };

    const updateDisplay = (text) => {
        ipBox.innerHTML = `<span class="navigation-id">${navigationId}</span><span style="color: red;"> | </span>${text}`;
        ensureContainer();
    };

    const getProxySignature = (config) => {
        if (!config || !config.proxyInfo) {
            return 'none';
        }
        const info = config.proxyInfo;
        const protocol = info.protocol || 'http';
        return `${protocol}://${info.host}:${info.port}`;
    };

    const fetchPublicIp = () => {
        if (fetchInFlight) {
            return fetchInFlight;
        }
        updateDisplay('Carregando IP...');
        fetchInFlight = fetch('https://api.ipify.org?format=json')
            .then((response) => response.json())
            .then((data) => {
                lastDisplayedIp = data.ip;
                updateDisplay(lastDisplayedIp);
            })
            .catch((error) => {
                console.error('IpView.js: Erro ao obter IP:', error);
                lastDisplayedIp = null;
                updateDisplay('IP indisponivel');
            })
            .finally(() => {
                fetchInFlight = null;
            });

        return fetchInFlight;
    };

    const applyConfig = (config) => {
        if (!config || typeof config.proxyEnabled === 'undefined') {
            updateDisplay('Carregando...');
            return;
        }

        if (typeof config.browserIndex !== 'undefined') {
            navigationId = config.browserIndex;
        }

        const proxyState = config.proxyEnabled;
        const hasProxy = proxyState === true || proxyState === 'true';
        const signature = hasProxy ? getProxySignature(config) : 'none';

        if (!hasProxy) {
            lastProxySignature = 'none';
            lastDisplayedIp = null;
            updateDisplay('Sem proxy');
            return;
        }

        if (signature === lastProxySignature && lastDisplayedIp) {
            updateDisplay(lastDisplayedIp);
            return;
        }

        lastProxySignature = signature;
        fetchPublicIp();
    };

    window.addEventListener('megabot-config-ready', (event) => {
        applyConfig(event.detail);
    });

    shadowRoot.appendChild(style);
    shadowRoot.appendChild(ipBox);

    if (window.megabotConfig) {
        applyConfig(window.megabotConfig);
    } else {
        updateDisplay('Carregando...');
    }
}


// A MUDANÇA MAIS IMPORTANTE ESTÁ AQUI:
// Verificamos o estado do documento.
// Se ele já estiver carregado, executamos a função imediatamente.
if (document.readyState === 'loading') {
    // Se ainda estiver carregando, esperamos pelo evento DOMContentLoaded.
    document.addEventListener('DOMContentLoaded', showIpDisplay);
} else {
    // Se já carregou, a função pode ser chamada com segurança.
    showIpDisplay();
}