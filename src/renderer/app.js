// Aplicação principal - Gerenciamento de eventos e funcionalidades

// Sistema de notificações sutis
function showNotification(message, type = 'info', duration = 4000) {
    // Remove notificação existente se houver
    const existingNotification = document.getElementById('custom-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.id = 'custom-notification';
    notification.className = `fixed top-4 right-4 z-[9999] px-4 py-3 rounded-lg shadow-lg transform translate-x-full transition-all duration-300 ease-in-out max-w-sm`;
    
    // Definir cores baseadas no tipo
    const typeClasses = {
        success: 'bg-green-600 text-white border-l-4 border-green-400',
        error: 'bg-red-600 text-white border-l-4 border-red-400',
        info: 'bg-blue-600 text-white border-l-4 border-blue-400',
        warning: 'bg-yellow-600 text-white border-l-4 border-yellow-400'
    };
    
    notification.className += ` ${typeClasses[type] || typeClasses.info}`;
    
    // Adicionar ícone baseado no tipo
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <span class="text-lg font-bold">${icons[type] || icons.info}</span>
            <span class="text-sm font-medium">${message}</span>
        </div>
    `;
    
    // Adicionar ao body
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
        notification.classList.add('translate-x-0');
    }, 100);
    
    // Auto remover após duração especificada
    setTimeout(() => {
        notification.classList.remove('translate-x-0');
        notification.classList.add('translate-x-full');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, duration);
}

// Aguarda o DOM estar carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('Aplicação iniciada');
    
    // Carregar configurações salvas
    loadSettings();
    
    // Inicializar funcionalidades
    initializeTabSystem();
    initializeButtons();
    initializePopups();
    initializeCounters();
    initializeLinkManagement();
    initializeAutoSave();
});

// Sistema de salvamento automático
let saveTimeout = null;
const SAVE_DELAY = 100; // 300ms de delay para evitar salvamentos excessivos

// Função para salvar configurações
function saveSettings() {
    const settings = {
        links: getAddedLinks(),
        proxies: getAddedProxies(),
        pixKeys: getAddedPixKeys(),
        extensions: getAddedExtensions(),
        settings: {
            delay: parseInt(document.getElementById('delay-count')?.textContent || '5'),
            openings: parseInt(document.getElementById('openings-count')?.textContent || '1'),
            toggles: getToggleStates(),
            lastSaved: new Date().toISOString()
        },
        automation: {
            generateWithdraw: document.getElementById('generate-withdraw-toggle')?.checked || false,
            muteAudio: document.getElementById('mute-audio-toggle')?.checked || false,
            depositMin: parseFloat(document.getElementById('deposit-min')?.value || '0'),
            depositMax: parseFloat(document.getElementById('deposit-max')?.value || '0'),
            delayEnabled: document.getElementById('delay-toggle')?.checked || false,
            delaySeconds: parseInt(document.getElementById('delay-count')?.textContent || '5')
        }
    };
    
    // Salvar no arquivo usando Electron IPC
    try {
        if (window.electronAPI && window.electronAPI.saveSettings) {
            window.electronAPI.saveSettings(settings);
            console.log('Configurações salvas automaticamente:', settings);
        } else {
            // Fallback para localStorage durante desenvolvimento
            localStorage.setItem('app-settings', JSON.stringify(settings, null, 2));
            console.log('Configurações salvas no localStorage (fallback):', settings);
        }
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
    }
}

// Função para carregar configurações
function loadSettings() {
    try {
        if (window.electronAPI && window.electronAPI.loadSettings) {
            window.electronAPI.loadSettings().then(settings => {
                if (settings) {
                    console.log('Carregando configurações salvas:', settings);
                    applyLoadedSettings(settings);
                }
            }).catch(error => {
                console.error('Erro ao carregar configurações via Electron:', error);
                // Fallback para localStorage
                loadSettingsFromLocalStorage();
            });
        } else {
            // Fallback para localStorage durante desenvolvimento
            loadSettingsFromLocalStorage();
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

// Função auxiliar para carregar do localStorage
function loadSettingsFromLocalStorage() {
    try {
        const savedSettings = localStorage.getItem('app-settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            console.log('Carregando configurações do localStorage:', settings);
            applyLoadedSettings(settings);
        }
    } catch (error) {
        console.error('Erro ao carregar do localStorage:', error);
    }
}

// Função para aplicar configurações carregadas
function applyLoadedSettings(settings) {
    // Carregar links
    if (settings.links && settings.links.length > 0) {
        loadLinks(settings.links);
    }
    
    // Carregar proxies
    if (settings.proxies && settings.proxies.length > 0) {
        loadProxies(settings.proxies);
    }
    
    // Carregar chaves PIX
    if (settings.pixKeys && settings.pixKeys.length > 0) {
        loadPixKeys(settings.pixKeys);
    }
    
    // Carregar extensões
    if (settings.extensions && settings.extensions.length > 0) {
        loadExtensions(settings.extensions);
    }
    
    // Carregar configurações de delay e openings
    if (settings.settings) {
        const delayCount = document.getElementById('delay-count');
        const openingsCount = document.getElementById('openings-count');
        
        if (delayCount && settings.settings.delay) {
            delayCount.textContent = settings.settings.delay;
        }
        
        if (openingsCount && settings.settings.openings) {
            openingsCount.textContent = settings.settings.openings;
        }
        
        // Carregar estados dos toggles
        if (settings.settings.toggles) {
            applyToggleStates(settings.settings.toggles);
        }
    }
    
    // Carregar configurações de automação
    if (settings.automation) {
        const generateWithdrawToggle = document.getElementById('generate-withdraw-toggle');
        const muteAudioToggle = document.getElementById('mute-audio-toggle');
        const depositMinInput = document.getElementById('deposit-min');
        const depositMaxInput = document.getElementById('deposit-max');
        const delayToggle = document.getElementById('delay-toggle');
        const delayControls = document.getElementById('delay-controls');
        
        if (generateWithdrawToggle) {
            generateWithdrawToggle.checked = settings.automation.generateWithdraw || false;
        }
        
        if (muteAudioToggle) {
            muteAudioToggle.checked = settings.automation.muteAudio || false;
        }
        
        if (depositMinInput && settings.automation.depositMin !== undefined) {
            depositMinInput.value = settings.automation.depositMin;
        }
        
        if (depositMaxInput && settings.automation.depositMax !== undefined) {
            depositMaxInput.value = settings.automation.depositMax;
        }
        
        if (delayToggle) {
            delayToggle.checked = settings.automation.delayEnabled || false;
            // Mostrar/ocultar controles de delay baseado no estado do toggle
            if (delayControls) {
                if (settings.automation.delayEnabled) {
                    delayControls.classList.remove('hidden');
                } else {
                    delayControls.classList.add('hidden');
                }
            }
        }
    }
}

// Função para salvar com delay (debounce)
function debouncedSave() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(() => {
        saveSettings();
    }, SAVE_DELAY);
}

// Inicializar sistema de auto-save
function initializeAutoSave() {
    // Observar mudanças nos contadores
    const delayCount = document.getElementById('delay-count');
    const openingsCount = document.getElementById('openings-count');
    
    if (delayCount) {
        const observer = new MutationObserver(debouncedSave);
        observer.observe(delayCount, { childList: true, subtree: true });
    }
    
    if (openingsCount) {
        const observer = new MutationObserver(debouncedSave);
        observer.observe(openingsCount, { childList: true, subtree: true });
    }
    
    // Observar mudanças nos containers de links e proxies
    const linksContainer = document.getElementById('links-container');
    const proxiesContainer = document.getElementById('proxies-container');
    const pixContainer = document.getElementById('pix-container');
    const extensionsContainer = document.getElementById('extensions-container');
    
    if (linksContainer) {
        const observer = new MutationObserver(debouncedSave);
        observer.observe(linksContainer, { childList: true, subtree: true });
    }
    
    if (proxiesContainer) {
        const observer = new MutationObserver(debouncedSave);
        observer.observe(proxiesContainer, { childList: true, subtree: true });
    }
    
    if (pixContainer) {
        const observer = new MutationObserver(debouncedSave);
        observer.observe(pixContainer, { childList: true, subtree: true });
    }
    
    if (extensionsContainer) {
        const observer = new MutationObserver(debouncedSave);
        observer.observe(extensionsContainer, { childList: true, subtree: true });
    }
    
    // Observar mudanças nos elementos da aba automação
    const generateWithdrawToggle = document.getElementById('generate-withdraw-toggle');
    const muteAudioToggle = document.getElementById('mute-audio-toggle');
    const depositMinInput = document.getElementById('deposit-min');
    const depositMaxInput = document.getElementById('deposit-max');
    const delayToggleAutomation = document.getElementById('delay-toggle');
    
    if (generateWithdrawToggle) {
        generateWithdrawToggle.addEventListener('change', debouncedSave);
    }
    
    if (muteAudioToggle) {
        muteAudioToggle.addEventListener('change', debouncedSave);
    }
    
    if (depositMinInput) {
        depositMinInput.addEventListener('input', debouncedSave);
        depositMinInput.addEventListener('change', debouncedSave);
    }
    
    if (depositMaxInput) {
        depositMaxInput.addEventListener('input', debouncedSave);
        depositMaxInput.addEventListener('change', debouncedSave);
    }
    
    if (delayToggleAutomation) {
        delayToggleAutomation.addEventListener('change', debouncedSave);
    }
    
    // Observar mudanças nos toggles, checkboxes e radio buttons
    const toggleElements = document.querySelectorAll('input[type="checkbox"], .toggle-switch, input[type="radio"]');
    toggleElements.forEach(toggle => {
        if (toggle.type === 'checkbox' || toggle.type === 'radio') {
            toggle.addEventListener('change', debouncedSave);
        } else {
            toggle.addEventListener('click', debouncedSave);
        }
    });
    
    // Observar cliques em botões que podem alterar estado
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Delay maior para botões para capturar mudanças de estado
            setTimeout(debouncedSave, 100);
        });
    });
    
    // Salvar quando a janela for fechada
    window.addEventListener('beforeunload', () => {
        saveSettings();
    });
    
    // Salvar periodicamente (backup)
    setInterval(() => {
        saveSettings();
    }, 30000); // A cada 30 segundos
}

// Sistema de abas
function initializeTabSystem() {
    const tabButtons = document.querySelectorAll('[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove classe ativa de todos os botões
            tabButtons.forEach(btn => {
                btn.classList.remove('bg-app-blue-700', 'text-white', 'shadow-lg');
                btn.classList.add('text-app-gray-400', 'hover:text-white', 'hover:bg-app-gray-700');
            });
            
            // Adiciona classe ativa ao botão clicado
            button.classList.remove('text-app-gray-400', 'hover:text-white', 'hover:bg-app-gray-700');
            button.classList.add('bg-app-blue-700', 'text-white', 'shadow-lg');
            
            // Esconde todas as abas
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            // Mostra a aba selecionada
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
        });
    });
}

// Inicializar botões principais
function initializeButtons() {
    // Botões principais (exceto os que usam sistema de injeção padronizado)
    const mainButtons = [
        { id: 'create-accounts-btn', action: () => console.log('Criar contas') },
        { id: 'withdraw-btn', action: () => console.log('Saque') },
        { id: 'deposit-btn', action: () => console.log('Depositar') },
        { id: 'play-btn', action: () => console.log('Jogar') },
        { id: 'refresh-pages-btn', action: () => atualizarPaginas() },
        { id: 'mirror-mode-btn', action: () => console.log('Modo Espelho') },
        { id: 'manage-extensions-btn', action: () => showPopup('extensions-popup-overlay') },
        { id: 'pix-btn', action: () => showPopup('pix-popup-overlay') },
        { id: 'add-proxies-btn', action: () => showPopup('proxy-popup-overlay') }
        // Nota: home-btn e reports-btn agora usam o sistema padronizado de injeção
    ];
    
    mainButtons.forEach(({ id, action }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', action);
        }
    });
    
    // Sistema padronizado de injeção de scripts
    initializeScriptInjectionButtons();
    
    // Botão Criar Contas (funcionalidade especial)
    const criarContasBtn = document.getElementById('criar-contas-btn');
    if (criarContasBtn) {
        criarContasBtn.addEventListener('click', () => {
            console.log('Criar contas clicado');
            toggleLinksDropdown();
        });
    }
    
    // Botão Abrir Navegadores
    const openBrowsersBtn = document.getElementById('open-browsers-btn');
    if (openBrowsersBtn) {
        openBrowsersBtn.addEventListener('click', async () => {
            await abrirNavegadores();
        });
    }
}

// Sistema padronizado de injeção de scripts
function initializeScriptInjectionButtons() {
    // Busca todos os botões com data-inject-script
    const scriptButtons = document.querySelectorAll('[data-inject-script]');
    
    scriptButtons.forEach(button => {
        const scriptName = button.getAttribute('data-inject-script');
        const notificationMessage = button.getAttribute('data-notification') || `Script ${scriptName} executado`;
        const confirmMessage = button.getAttribute('data-confirm');
        
        button.addEventListener('click', async () => {
            try {
                // Verifica se precisa de confirmação
                if (confirmMessage && !confirm(confirmMessage)) {
                    return;
                }
                
                // Executa a injeção do script
                await window.electronAPI.injectScript(scriptName);
                
                // Mostra notificação de sucesso
                showNotification(notificationMessage, 'success');
                
                console.log(`Script ${scriptName} injetado com sucesso em todos os navegadores`);
            } catch (error) {
                console.error(`Erro ao injetar script ${scriptName}:`, error);
                showNotification(`Erro ao executar script ${scriptName}`, 'error');
            }
        });
    });
}

// Função para injetar script customizado
async function injectCustomScript(scriptCode, notificationMessage = 'Script customizado executado') {
    try {
        await window.electronAPI.injectCustomScript(scriptCode);
        showNotification(notificationMessage, 'success');
        console.log('Script customizado injetado com sucesso');
    } catch (error) {
        console.error('Erro ao injetar script customizado:', error);
        showNotification('Erro ao executar script customizado', 'error');
    }
}

// Expor função globalmente para uso em outros contextos
window.injectCustomScript = injectCustomScript;

// Sistema de popups
function initializePopups() {
    // Fechar popups
    const closeButtons = [
        'close-url-popup',
        'close-pix-popup', 
        'close-extensions-popup',
        'close-proxy-popup'
    ];
    
    closeButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                const popup = button.closest('[id$="-popup-overlay"]');
                if (popup) {
                    hidePopup(popup.id);
                }
            });
        }
    });
    
    // Fechar popup clicando no overlay
    const overlays = document.querySelectorAll('[id$="-popup-overlay"]');
    overlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                hidePopup(overlay.id);
            }
        });
    });
    
    // Fechar dropdown de links clicando fora dele
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('links-dropdown');
        const criarContasBtn = document.getElementById('criar-contas-btn');
        
        if (dropdown && criarContasBtn && !dropdown.classList.contains('hidden')) {
            if (!criarContasBtn.contains(e.target) && !dropdown.contains(e.target)) {
                hideLinksDropdown();
            }
        }
    });
}

// Contadores (delay, instâncias)
function initializeCounters() {
    // Contador de delay
    const decreaseDelay = document.getElementById('decrease-delay');
    const increaseDelay = document.getElementById('increase-delay');
    const delayCount = document.getElementById('delay-count');
    
    if (decreaseDelay && increaseDelay && delayCount) {
        decreaseDelay.addEventListener('click', () => {
            let current = parseInt(delayCount.textContent);
            if (current > 1) {
                delayCount.textContent = current - 1;
                debouncedSave();
            }
        });
        
        increaseDelay.addEventListener('click', () => {
            let current = parseInt(delayCount.textContent);
            if (current < 60) {
                delayCount.textContent = current + 1;
                debouncedSave();
            }
        });
    }
    
    // Contador de aberturas simultâneas
    const decreaseOpenings = document.getElementById('decrease-openings');
    const increaseOpenings = document.getElementById('increase-openings');
    const openingsCount = document.getElementById('openings-count');
    
    if (decreaseOpenings && increaseOpenings && openingsCount) {
        decreaseOpenings.addEventListener('click', () => {
            let current = parseInt(openingsCount.textContent);
            if (current > 1) {
                openingsCount.textContent = current - 1;
                debouncedSave();
            }
        });
        
        increaseOpenings.addEventListener('click', () => {
            let current = parseInt(openingsCount.textContent);
            if (current < capacidadeMaximaAtual) {
                openingsCount.textContent = current + 1;
                debouncedSave();
            }
        });
    }
}

// Gerenciamento de links e outros botões
function initializeLinkManagement() {
    // Botão principal adicionar links (abre popup de URLs)
    const linksBtn = document.getElementById('links-btn');
    if (linksBtn) {
        linksBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showPopup('url-popup-overlay');
        });
    }
    
    // Botão adicionar link dentro do popup
    const addItemBtn = document.getElementById('add-item-btn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            addNewLinkInput();
        });
    }
    
    // Adicionar event listeners para inputs existentes
    const existingInputs = document.querySelectorAll('#links-container input[type="text"]');
    existingInputs.forEach(input => {
        input.addEventListener('input', updateCriarContasButton);
        input.addEventListener('blur', updateCriarContasButton);
    });
    
    // Atualizar o botão na inicialização
    updateCriarContasButton();
    
    // Botão adicionar chaves PIX
    const addPixBtn = document.getElementById('add-pix-file-btn');
    if (addPixBtn) {
        addPixBtn.addEventListener('click', () => {
            const pixFileInput = document.getElementById('pix-file-input');
            if (pixFileInput) {
                pixFileInput.click();
            }
        });
    }
    
    // Botão adicionar extensão
    const uploadExtensionBtn = document.getElementById('upload-extension-btn');
    if (uploadExtensionBtn) {
        uploadExtensionBtn.addEventListener('click', () => {
            const extensionInput = document.getElementById('extension-folder-input');
            if (extensionInput) {
                extensionInput.click();
            }
        });
    }
    
    // Input de arquivo PIX
    const pixFileInput = document.getElementById('pix-file-input');
    if (pixFileInput) {
        pixFileInput.addEventListener('change', handlePixFileUpload);
    }
    
    // Input de extensão
    const extensionInput = document.getElementById('extension-folder-input');
    if (extensionInput) {
        extensionInput.addEventListener('change', handleExtensionUpload);
    }
    
    // Funcionalidade para proxies
    initializeProxyManagement();
}

// Funções auxiliares
function showPopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.remove('opacity-0', 'invisible');
        popup.classList.add('opacity-100', 'visible');
        
        const sidebar = popup.querySelector('.transform');
        if (sidebar) {
            sidebar.classList.remove('translate-x-full');
            sidebar.classList.add('translate-x-0');
        }
    }
}

function hidePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        const sidebar = popup.querySelector('.transform');
        if (sidebar) {
            sidebar.classList.remove('translate-x-0');
            sidebar.classList.add('translate-x-full');
        }
        
        setTimeout(() => {
            popup.classList.remove('opacity-100', 'visible');
            popup.classList.add('opacity-0', 'invisible');
        }, 300);
    }
}

function toggleLinksDropdown() {
    const links = getAddedLinks();
    const dropdown = document.getElementById('links-dropdown');
    const arrow = document.getElementById('dropdown-arrow');
    const criarContasBtn = document.getElementById('criar-contas-btn');
    const criarContasText = document.getElementById('criar-contas-text');
    
    // Se não há links, mostrar mensagem
    if (links.length === 0) {
        showNotification('Nenhum link foi adicionado. Por favor, adicione links primeiro.', 'warning');
        return;
    }
    
    // Se há apenas um link, executar diretamente
    if (links.length === 1) {
        console.log('Executando criação de contas com link único:', links[0]);
        executeAccountCreation(links[0]);
        return;
    }
    
    // Se há múltiplos links, mostrar dropdown
    if (dropdown && arrow && criarContasBtn) {
        // Atualizar conteúdo do dropdown
        updateLinksDropdownContent(links);
        
        // Toggle dropdown
        const isHidden = dropdown.classList.contains('hidden');
        
        if (isHidden) {
            // Mostrar dropdown
            dropdown.classList.remove('hidden');
            arrow.classList.remove('hidden');
            arrow.style.transform = 'rotate(180deg)';
            criarContasBtn.classList.add('dropdown-active');
            criarContasText.textContent = `Criar contas (${links.length} links)`;
        } else {
            // Esconder dropdown
            dropdown.classList.add('hidden');
            arrow.style.transform = 'rotate(0deg)';
            criarContasBtn.classList.remove('dropdown-active');
            criarContasText.textContent = 'Criar contas';
        }
    }
}

// Função para obter links adicionados
function getAddedLinks() {
    const linksContainer = document.getElementById('links-container');
    const links = [];
    
    if (linksContainer) {
        const linkInputs = linksContainer.querySelectorAll('input[type="text"]');
        linkInputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                links.push(value);
            }
        });
    }
    
    return links;
}

// Função para obter proxies adicionados
function getAddedProxies() {
    const proxies = [];
    
    // Obter proxies da lista principal
    const proxyList = document.getElementById('proxy-list');
    if (proxyList && proxyList.value.trim() !== '') {
        const listProxies = proxyList.value.split('\n').filter(proxy => proxy.trim() !== '');
        proxies.push(...listProxies);
    }
    
    // Obter proxies da lista do popup
    const proxyListPopup = document.getElementById('proxy-list-popup');
    if (proxyListPopup && proxyListPopup.value.trim() !== '') {
        const listProxies = proxyListPopup.value.split('\n').filter(proxy => proxy.trim() !== '');
        proxies.push(...listProxies);
    }
    
    // Nota: Proxies rotativos não são incluídos na lista geral
    // Eles são tratados separadamente na lógica de abertura de navegadores
    
    // Remover duplicatas
    return [...new Set(proxies.map(proxy => proxy.trim()))];
}

// Função para consumir (remover) um proxy da lista após uso
function consumeProxy(proxyToRemove) {
    if (!proxyToRemove) return;
    
    console.log('Consumindo proxy:', proxyToRemove);
    
    // Remover da lista principal
    const proxyList = document.getElementById('proxy-list');
    if (proxyList && proxyList.value.includes(proxyToRemove)) {
        const proxies = proxyList.value.split('\n').filter(proxy => proxy.trim() !== proxyToRemove.trim());
        proxyList.value = proxies.join('\n');
    }
    
    // Remover da lista do popup
    const proxyListPopup = document.getElementById('proxy-list-popup');
    if (proxyListPopup && proxyListPopup.value.includes(proxyToRemove)) {
        const proxies = proxyListPopup.value.split('\n').filter(proxy => proxy.trim() !== proxyToRemove.trim());
        proxyListPopup.value = proxies.join('\n');
    }
    
    // Atualizar contador
    updateProxyCount();
    
    // Salvar configurações
    debouncedSave();
    
    console.log('Proxy consumido e removido da lista:', proxyToRemove);
}

// Função para obter próximo proxy disponível (sem remover)
function getNextAvailableProxy() {
    const proxies = getAddedProxies();
    return proxies.length > 0 ? proxies[0] : null;
}

// Função para obter e consumir próximo proxy disponível
function getAndConsumeNextProxy() {
    const proxy = getNextAvailableProxy();
    if (proxy) {
        consumeProxy(proxy);
    }
    return proxy;
}

// Função para obter o proxy rotativo único
function getRotatingProxy() {
    const rotatingProxyList = document.getElementById('rotating-proxy-list');
    const rotatingProxyListPopup = document.getElementById('rotating-proxy-list-popup');
    
    // Usar popup se estiver aberto e tiver valor, senão usar o campo principal
    const activeRotatingField = (rotatingProxyListPopup && rotatingProxyListPopup.value.trim()) ? rotatingProxyListPopup : rotatingProxyList;
    
    if (activeRotatingField && activeRotatingField.value.trim()) {
        return activeRotatingField.value.trim();
    }
    
    return null;
}

// Função para obter chaves PIX adicionadas
function getAddedPixKeys() {
    const pixKeys = [];
    
    // Obter chaves PIX da lista dinâmica
    const pixList = document.getElementById('pix-list');
    if (pixList) {
        const pixElements = pixList.querySelectorAll('.font-mono');
        pixElements.forEach(element => {
            const pixKey = element.textContent.trim();
            if (pixKey !== '') {
                pixKeys.push(pixKey);
            }
        });
    }
    
    return pixKeys;
}

// Função para obter extensões adicionadas
function getAddedExtensions() {
    const extensions = [];
    
    // Obter extensões da lista dinâmica
    const extensionsList = document.getElementById('extensions-list');
    if (extensionsList) {
        const extensionElements = extensionsList.querySelectorAll('.font-mono');
        extensionElements.forEach(element => {
            const extensionPath = element.textContent.trim();
            if (extensionPath !== '') {
                extensions.push(extensionPath);
            }
        });
    }
    
    return extensions;
}

// Função para obter estados dos toggles
function getToggleStates() {
    const toggles = {};
    const toggleElements = document.querySelectorAll('input[type="checkbox"], .toggle-switch, input[type="radio"]');
    
    toggleElements.forEach(toggle => {
        if (toggle.id) {
            if (toggle.type === 'checkbox') {
                toggles[toggle.id] = toggle.checked;
            } else if (toggle.classList.contains('toggle-switch')) {
                toggles[toggle.id] = toggle.classList.contains('active');
            } else if (toggle.type === 'radio') {
                toggles[toggle.id] = toggle.checked;
            }
        }
    });
    
    return toggles;
}

// Função para carregar links
function loadLinks(links) {
    const linksContainer = document.getElementById('links-container');
    if (!linksContainer) return;
    
    // Limpar container atual
    linksContainer.innerHTML = '';
    
    // Adicionar cada link salvo
    links.forEach(link => {
        addNewLinkInput();
        const inputs = linksContainer.querySelectorAll('input[type="text"]');
        const lastInput = inputs[inputs.length - 1];
        if (lastInput) {
            lastInput.value = link;
        }
    });
    
    // Atualizar botão "Criar Contas"
    updateCriarContasButton();
}

// Função para carregar proxies
function loadProxies(proxies) {
    if (!proxies || proxies.length === 0) return;
    
    // Carregar proxies na lista principal
    const proxyList = document.getElementById('proxy-list');
    if (proxyList) {
        proxyList.value = proxies.join('\n');
    }
    
    // Carregar proxies na lista do popup
    const proxyListPopup = document.getElementById('proxy-list-popup');
    if (proxyListPopup) {
        proxyListPopup.value = proxies.join('\n');
    }
    
    // Atualizar contador de proxies
    updateProxyCount();
}

// Função para carregar chaves PIX
function loadPixKeys(pixKeys) {
    if (!pixKeys || pixKeys.length === 0) return;
    
    const pixList = document.getElementById('pix-list');
    if (!pixList) return;
    
    // Limpar lista atual
    pixList.innerHTML = '';
    
    // Adicionar cada chave PIX
    pixKeys.forEach(pixKey => {
        const pixItem = document.createElement('div');
        pixItem.className = 'flex items-center justify-between p-2 bg-gray-50 rounded';
        pixItem.innerHTML = `
            <span class="font-mono text-sm">${pixKey}</span>
            <button onclick="removePixKey(this)" class="text-red-500 hover:text-red-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;
        pixList.appendChild(pixItem);
    });
    
    // Atualizar contador
    updatePixCount();
}

// Função para carregar extensões
function loadExtensions(extensions) {
    if (!extensions || extensions.length === 0) return;
    
    const extensionsList = document.getElementById('extensions-list');
    if (!extensionsList) return;
    
    // Limpar lista atual
    extensionsList.innerHTML = '';
    
    // Adicionar cada extensão
    extensions.forEach(extensionPath => {
        const extensionItem = document.createElement('div');
        extensionItem.className = 'flex items-center justify-between p-2 bg-gray-50 rounded';
        extensionItem.innerHTML = `
            <span class="font-mono text-sm">${extensionPath}</span>
            <button onclick="removeExtension(this)" class="text-red-500 hover:text-red-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;
        extensionsList.appendChild(extensionItem);
    });
    
    // Atualizar contador
    updateExtensionCount();
}

// Função para atualizar contador de chaves PIX
function updatePixCount() {
    const pixList = document.getElementById('pix-list');
    let totalPixKeys = 0;
    
    if (pixList) {
        const pixElements = pixList.querySelectorAll('.font-mono');
        totalPixKeys = pixElements.length;
    }
    
    // Atualizar contador na interface (se existir)
    const pixCounter = document.getElementById('pix-counter-text');
    if (pixCounter) {
        pixCounter.textContent = `${totalPixKeys} chaves PIX disponíveis`;
    }
    
    console.log(`Total de chaves PIX: ${totalPixKeys}`);
}

// Função para atualizar contador de extensões
function updateExtensionCount() {
    const extensionsList = document.getElementById('extensions-list');
    let totalExtensions = 0;
    
    if (extensionsList) {
        const extensionElements = extensionsList.querySelectorAll('.font-mono');
        totalExtensions = extensionElements.length;
    }
    
    // Atualizar contador na interface (se existir)
    const extensionCounter = document.getElementById('extension-counter-text');
    if (extensionCounter) {
        extensionCounter.textContent = `${totalExtensions} extensões carregadas`;
    }
    
    console.log(`Total de extensões: ${totalExtensions}`);
}

// Função para aplicar estados dos toggles
function applyToggleStates(toggleStates) {
    Object.keys(toggleStates).forEach(toggleId => {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            const isActive = toggleStates[toggleId];
            
            if (toggle.type === 'checkbox') {
                toggle.checked = isActive;
            } else if (toggle.classList.contains('toggle-switch')) {
                if (isActive) {
                    toggle.classList.add('active');
                } else {
                    toggle.classList.remove('active');
                }
            } else if (toggle.type === 'radio') {
                toggle.checked = isActive;
            }
        }
    });
}

// Função para atualizar conteúdo do dropdown
function updateLinksDropdownContent(links) {
    const dropdownContent = document.getElementById('links-dropdown-content');
    if (!dropdownContent) return;
    
    dropdownContent.innerHTML = '';
    
    links.forEach((link, index) => {
        const linkItem = document.createElement('div');
        linkItem.className = 'px-4 py-2 hover:bg-app-gray-700 cursor-pointer text-white text-sm transition-colors duration-200';
        linkItem.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="truncate flex-1 mr-2">${link}</span>
                <span class="text-xs text-app-gray-400">${index + 1}</span>
            </div>
        `;
        
        linkItem.addEventListener('click', () => {
            console.log('Executando criação de contas com link selecionado:', link);
            executeAccountCreation(link);
            hideLinksDropdown();
        });
        
        dropdownContent.appendChild(linkItem);
    });
}

// Função para esconder dropdown
function hideLinksDropdown() {
    const dropdown = document.getElementById('links-dropdown');
    const arrow = document.getElementById('dropdown-arrow');
    const criarContasBtn = document.getElementById('criar-contas-btn');
    const criarContasText = document.getElementById('criar-contas-text');
    
    if (dropdown && arrow && criarContasBtn) {
        dropdown.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
        criarContasBtn.classList.remove('dropdown-active');
        criarContasText.textContent = 'Criar contas';
    }
}

// Função para executar criação de contas
async function executeAccountCreation(link) {
    console.log('Iniciando criação de contas para:', link);
    
    try {
        // Verificar se há navegadores ativos
        const activeBrowsersResult = await window.electronAPI.getActiveBrowsers();
        
        if (!activeBrowsersResult.success) {
            showNotification('Erro ao verificar navegadores ativos: ' + activeBrowsersResult.error, 'error');
            return;
        }
        
        const activeBrowsers = activeBrowsersResult.browsers;
        
        if (activeBrowsers.length === 0) {
            showNotification('Nenhum navegador ativo encontrado. Abra os navegadores primeiro usando o botão "Abrir Navegadores".', 'warning');
            return;
        }
        
        console.log(`Encontrados ${activeBrowsers.length} navegadores ativos. Navegando para: ${link}`);
        
        // Navegar todos os navegadores para o link selecionado
        const navigationResult = await window.electronAPI.navigateAllBrowsers(link);
        
        if (navigationResult.success) {
            const successCount = navigationResult.results ? navigationResult.results.filter(r => r.success).length : activeBrowsers.length;
            showNotification(`Navegação iniciada com sucesso em ${successCount} navegador(es) para: ${link}`, 'success');
            
            // Aguardar 3 segundos para garantir que a página carregou completamente
            console.log('Aguardando 3 segundos para a página carregar...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Injetar script de registro após navegação bem-sucedida
            try {
                console.log('Iniciando injeção do script de registro...');
                const injectionResult = await window.electronAPI.injectScript('registro');
                
                if (injectionResult.success) {
                    console.log('Script de registro injetado com sucesso em todos os navegadores');
                    showNotification('Script de registro injetado com sucesso!', 'success');
                } else {
                    console.warn('Falha na injeção do script de registro:', injectionResult.message);
                    showNotification(`Aviso: ${injectionResult.message}`, 'warning');
                }
            } catch (injectionError) {
                console.error('Erro ao injetar script de registro:', injectionError);
                showNotification('Erro ao injetar script de registro', 'error');
            }
            
            // Log dos resultados detalhados
            if (navigationResult.results) {
                navigationResult.results.forEach(result => {
                    if (result.success) {
                        console.log(`✓ Navegador ${result.navigatorId}: Navegação iniciada`);
                    } else {
                        console.error(`✗ Navegador ${result.navigatorId}: ${result.error}`);
                    }
                });
            }
        } else {
            showNotification('Erro ao navegar navegadores: ' + navigationResult.error, 'error');
        }
        
    } catch (error) {
        console.error('Erro na execução da criação de contas:', error);
        showNotification('Erro inesperado ao executar criação de contas: ' + error.message, 'error');
    }
}

function addNewLinkInput() {
    const container = document.getElementById('links-container');
    if (!container) return;
    
    const linkCount = container.children.length + 1;
    
    const newLinkGroup = document.createElement('div');
    newLinkGroup.className = 'space-y-2';
    newLinkGroup.id = `link-group-${linkCount}`;
    
    newLinkGroup.innerHTML = `
        <div class="flex items-center gap-2">
            <div class="flex-1">
                <label for="link-input-${linkCount}" class="block text-white font-medium text-sm mb-1">Link ${linkCount}:</label>
                <input type="text" id="link-input-${linkCount}" class="w-full px-3 py-2 bg-app-gray-800 border border-app-gray-700 rounded-lg text-white placeholder-app-gray-400 focus:outline-none focus:ring-2 focus:ring-app-blue-600 focus:border-transparent transition-all duration-200" placeholder="https://exemplo.com">
            </div>
            <button class="w-8 h-8 bg-app-red-600 hover:bg-app-red-500 rounded-lg text-white text-sm font-bold transition-colors duration-200 mt-5" onclick="removeLinkInput(${linkCount})" title="Remover este campo">×</button>
        </div>
    `;
    
    container.appendChild(newLinkGroup);
    
    // Adicionar event listener para atualizar o botão quando o input mudar
    const newInput = newLinkGroup.querySelector('input');
    if (newInput) {
        newInput.addEventListener('input', () => {
            updateCriarContasButton();
            debouncedSave();
        });
        newInput.addEventListener('blur', () => {
            updateCriarContasButton();
            debouncedSave();
        });
    }
    
    updateCriarContasButton();
}

function removeLinkInput(linkNumber) {
    const linkGroup = document.getElementById(`link-group-${linkNumber}`);
    if (linkGroup) {
        linkGroup.remove();
        updateCriarContasButton();
        debouncedSave();
    }
}

// Função para atualizar o texto e estado do botão "Criar Contas"
function updateCriarContasButton() {
    const links = getAddedLinks();
    const criarContasText = document.getElementById('criar-contas-text');
    const dropdownArrow = document.getElementById('dropdown-arrow');
    
    if (criarContasText && dropdownArrow) {
        if (links.length === 0) {
            criarContasText.textContent = 'Criar contas';
            dropdownArrow.classList.add('hidden');
        } else if (links.length === 1) {
            criarContasText.textContent = 'Criar contas (1 link)';
            dropdownArrow.classList.add('hidden');
        } else {
            criarContasText.textContent = `Criar contas (${links.length} links)`;
            dropdownArrow.classList.remove('hidden');
        }
    }
}

// Função global para remoção de links (chamada pelo HTML)
window.removeLinkInputGlobal = removeLinkInput;

// Funções para upload de arquivos
function handlePixFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const pixKeys = content.split('\n').filter(key => key.trim() !== '');
            
            console.log('Chaves PIX carregadas:', pixKeys.length);
            showNotification(`${pixKeys.length} chaves PIX carregadas com sucesso!`, 'success');
            
            // Aqui você pode processar as chaves PIX
            displayPixKeys(pixKeys);
        };
        reader.readAsText(file);
    } else {
        showNotification('Por favor, selecione um arquivo .txt válido', 'warning');
    }
}

function handleExtensionUpload(event) {
    const files = event.target.files;
    if (files.length > 0) {
        console.log('Extensão selecionada:', files[0].webkitRelativePath);
        showNotification('Extensão carregada com sucesso!', 'success');
        
        // Aqui você pode processar a extensão
        displayExtension(files[0].webkitRelativePath);
    }
}

function displayPixKeys(keys) {
    const pixList = document.getElementById('pix-list');
    if (pixList) {
        pixList.innerHTML = '';
        keys.forEach((key, index) => {
            const keyElement = document.createElement('div');
            keyElement.className = 'flex items-center justify-between p-3 bg-app-gray-800 rounded-lg border border-app-gray-700';
            keyElement.innerHTML = `
                <span class="text-white text-sm font-mono">${key}</span>
                <button class="w-6 h-6 bg-app-red-600 hover:bg-app-red-500 rounded text-white text-xs font-bold transition-colors duration-200" onclick="removePixKey(${index})" title="Remover chave">×</button>
            `;
            pixList.appendChild(keyElement);
        });
        debouncedSave();
    }
}

function displayExtension(path) {
    const extensionsList = document.getElementById('extensions-list');
    if (extensionsList) {
        const extensionElement = document.createElement('div');
        extensionElement.className = 'flex items-center justify-between p-3 bg-app-gray-800 rounded-lg border border-app-gray-700';
        extensionElement.innerHTML = `
            <span class="text-white text-sm">${path.split('/')[0]}</span>
            <button class="w-6 h-6 bg-app-red-600 hover:bg-app-red-500 rounded text-white text-xs font-bold transition-colors duration-200" onclick="removeExtension(this)" title="Remover extensão">×</button>
        `;
        extensionsList.appendChild(extensionElement);
        debouncedSave();
    }
}

function removePixKey(index) {
    // Implementar remoção de chave PIX
    console.log('Removendo chave PIX:', index);
    debouncedSave();
}

function removeExtension(button) {
    button.parentElement.remove();
    debouncedSave();
}

// Função para atualizar contador de proxies
function updateProxyCount() {
    let totalProxies = 0;
    
    // Contar proxies da lista normal (usar popup se estiver aberto)
    const proxyList = document.getElementById('proxy-list');
    const proxyListPopup = document.getElementById('proxy-list-popup');
    const activeProxyList = (proxyListPopup && proxyListPopup.value) ? proxyListPopup : proxyList;
    if (activeProxyList && activeProxyList.value.trim()) {
        const normalProxies = activeProxyList.value.trim().split('\n').filter(proxy => proxy.trim() !== '');
        totalProxies += normalProxies.length;
    }
    
    // Nota: Proxy rotativo não é contabilizado no contador geral
    // Ele é usado separadamente para todos os navegadores no modo rotativo
    
    // Atualizar contador
    const proxyCounter = document.getElementById('proxy-counter-text');
    if (proxyCounter) {
        proxyCounter.textContent = `${totalProxies} proxies restantes`;
    }
}

// Gerenciamento de proxies
function initializeProxyManagement() {
    const proxyList = document.getElementById('proxy-list');
    const rotatingProxyList = document.getElementById('rotating-proxy-list');
    const proxyListPopup = document.getElementById('proxy-list-popup');
    const rotatingProxyListPopup = document.getElementById('rotating-proxy-list-popup');
    const proxyCounter = document.getElementById('proxy-counter-text');
    const clearProxiesBtn = document.getElementById('clear-proxies-btn');
    
    // Sincronizar campos principais com popup
    function syncMainToPopup() {
        if (proxyList && proxyListPopup) {
            proxyListPopup.value = proxyList.value;
        }
        if (rotatingProxyList && rotatingProxyListPopup) {
            rotatingProxyListPopup.value = rotatingProxyList.value;
        }
    }
    
    function syncPopupToMain() {
        if (proxyListPopup && proxyList) {
            proxyList.value = proxyListPopup.value;
        }
        if (rotatingProxyListPopup && rotatingProxyList) {
            rotatingProxyList.value = rotatingProxyListPopup.value;
        }
        updateProxyCount();
    }
    
    // Event listeners para campos principais
    if (proxyList) {
        proxyList.addEventListener('input', () => {
            updateProxyCount();
            debouncedSave();
        });
    }
    
    if (rotatingProxyList) {
        rotatingProxyList.addEventListener('input', () => {
            updateProxyCount();
            debouncedSave();
        });
    }
    
    // Event listeners para campos do popup com sincronização automática
    if (proxyListPopup) {
        proxyListPopup.addEventListener('input', () => {
            syncPopupToMain();
            updateProxyCount();
            debouncedSave();
        });
    }
    
    if (rotatingProxyListPopup) {
        rotatingProxyListPopup.addEventListener('input', () => {
            syncPopupToMain();
            updateProxyCount();
            debouncedSave();
        });
    }
    
    // Botão limpar proxies
    if (clearProxiesBtn) {
        clearProxiesBtn.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar todos os proxies?')) {
                if (proxyListPopup) proxyListPopup.value = '';
                if (rotatingProxyListPopup) rotatingProxyListPopup.value = '';
                syncPopupToMain();
                debouncedSave();
                showNotification('Proxies limpos com sucesso!', 'success');
            }
        });
    }
    
    // Sincronizar ao abrir popup
    const proxyPopupOverlay = document.getElementById('proxy-popup-overlay');
    if (proxyPopupOverlay) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (proxyPopupOverlay.classList.contains('opacity-100')) {
                        syncMainToPopup();
                    }
                }
            });
        });
        observer.observe(proxyPopupOverlay, { attributes: true });
    }
    
    // Atualizar contagem inicial
    updateProxyCount();
}

// Log para debug

// === SISTEMA DE DETECÇÃO DE MONITORES ===

// Variáveis globais para monitores
let monitoresDetectados = [];
let monitorSelecionado = null;
let dadosPosicionamento = [];
let capacidadeMaximaAtual = 24; // Valor padrão, será atualizado dinamicamente

/**
 * Detecta automaticamente os monitores e atualiza a interface
 */
async function detectarEAtualizarMonitores() {
    try {
        console.log('Iniciando detecção de monitores...');
        
        if (!window.electronAPI || !window.electronAPI.detectMonitors) {
            console.warn('API de detecção de monitores não disponível');
            return;
        }
        
        const result = await window.electronAPI.detectMonitors();
        
        if (result.success) {
            monitoresDetectados = result.monitores.detalhes;
            console.log('Monitores detectados:', monitoresDetectados);
            
            // Salvar dados dos monitores detectados
            await salvarDadosMonitores();
            
            // Atualizar o select de monitores
            atualizarSelectMonitores(monitoresDetectados);
            
            // Selecionar o monitor primário por padrão
            const monitorPrimario = monitoresDetectados.find(m => m.ehPrimario);
            if (monitorPrimario) {
                selecionarMonitor(monitorPrimario.id - 1); // -1 porque o select usa índice 0
            } else if (monitoresDetectados.length > 0) {
                selecionarMonitor(0);
            }
        } else {
            console.error('Erro na detecção de monitores:', result.error);
            // Manter o monitor padrão
            atualizarSelectMonitores([{
                id: 1,
                nome: 'Monitor 1 (Padrão)',
                resolucao: '1920x1080',
                ehPrimario: true
            }]);
        }
    } catch (error) {
        console.error('Erro ao detectar monitores:', error);
    }
}

/**
 * Atualiza o select de monitores com os monitores detectados
 */
function atualizarSelectMonitores(monitores) {
    const monitorSelect = document.getElementById('monitor-select');
    if (!monitorSelect) return;
    
    // Limpar opções existentes
    monitorSelect.innerHTML = '';
    
    // Adicionar opções para cada monitor
    monitores.forEach((monitor, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${monitor.nome} ${monitor.ehPrimario ? '(Primário)' : ''} - ${monitor.resolucao}`;
        monitorSelect.appendChild(option);
    });
    
    // Adicionar opção "Todos os monitores"
    const allMonitorsOption = document.createElement('option');
    allMonitorsOption.value = monitores.length; // Usar o índice após o último monitor
    allMonitorsOption.textContent = 'Todos os Monitores';
    monitorSelect.appendChild(allMonitorsOption);
    
    // Adicionar evento de mudança
    monitorSelect.addEventListener('change', (e) => {
        selecionarMonitor(parseInt(e.target.value));
    });
}

/**
 * Seleciona um monitor e calcula sua capacidade
 */
async function selecionarMonitor(indice) {
    if (indice < 0 || indice > monitoresDetectados.length) return;
    
    // Se o índice é igual ao número de monitores, significa "Todos os monitores"
    if (indice === monitoresDetectados.length) {
        monitorSelecionado = null; // Indica que todos os monitores foram selecionados
        console.log('Selecionado: Todos os monitores');
        
        // Calcular capacidade total de todos os monitores
        await calcularCapacidadeTodosMonitores();
    } else {
        monitorSelecionado = monitoresDetectados[indice];
        console.log('Monitor selecionado:', monitorSelecionado);
        
        // Calcular capacidade do monitor
        await calcularCapacidadeMonitor(monitorSelecionado);
    }
}

/**
 * Salva os dados dos monitores e posicionamento no arquivo JSON
 */
async function salvarDadosMonitores() {
    try {
        const resultado = await window.electronAPI.saveMonitorData(monitoresDetectados, dadosPosicionamento);
        if (resultado.success) {
            console.log('Dados dos monitores salvos com sucesso');
        } else {
            console.error('Erro ao salvar dados dos monitores:', resultado.error);
        }
        return resultado;
    } catch (error) {
        console.error('Erro ao salvar dados dos monitores:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Carrega os dados dos monitores salvos do arquivo JSON
 */
async function carregarDadosMonitores() {
    try {
        const resultado = await window.electronAPI.loadMonitorData();
        if (resultado.success && resultado.data) {
            console.log('Dados dos monitores carregados:', resultado.data);
            return resultado.data;
        } else {
            console.log('Nenhum dado de monitor salvo encontrado');
            return null;
        }
    } catch (error) {
        console.error('Erro ao carregar dados dos monitores:', error);
        return null;
    }
}

/**
 * Calcula a capacidade de navegadores para o monitor selecionado
 */
async function calcularCapacidadeMonitor(monitor) {
    try {
        if (!window.electronAPI || !window.electronAPI.calculateMonitorCapacity) {
            console.warn('API de cálculo de capacidade não disponível');
            return;
        }
        
        // Obter valores da interface ou usar padrões
        const defaultCheckbox = document.getElementById('default-resolution-checkbox');
        const widthInput = document.getElementById('width-input');
        const heightInput = document.getElementById('height-input');
        
        let larguraLogica, alturaLogica;
        
        if (defaultCheckbox && defaultCheckbox.checked) {
            // Usar valores padrão
            larguraLogica = 502;
            alturaLogica = 800;
        } else {
            // Usar valores dos campos da interface
            larguraLogica = parseInt(widthInput?.value) || 502;
            alturaLogica = parseInt(heightInput?.value) || 800;
        }
        
        const config = {
            larguraLogica: larguraLogica,
            alturaLogica: alturaLogica,
            fatorEscala: 0.65
        };
        
        const result = await window.electronAPI.calculateMonitorCapacity(monitor, config);
        
        if (result.success) {
            console.log('Capacidade calculada:', result.capacidade);
            console.log('Posições dos navegadores:', result.posicoes);
            
            // Armazenar dados de posicionamento com ID único
            const dadosMonitor = {
                id: `monitor_${monitor.id || Date.now()}`,
                monitor: monitor,
                config: config,
                capacidade: result.capacidade,
                posicoes: result.posicoes,
                timestamp: new Date().toISOString()
            };
            
            // Atualizar array de posicionamento
            const indiceExistente = dadosPosicionamento.findIndex(item => item.id === dadosMonitor.id);
            if (indiceExistente >= 0) {
                dadosPosicionamento[indiceExistente] = dadosMonitor;
            } else {
                dadosPosicionamento.push(dadosMonitor);
            }
            
            // Salvar dados automaticamente
            await salvarDadosMonitores();
            
            // Atualizar a interface com a capacidade
            const capacityElement = document.getElementById('monitor-capacity');
            if (capacityElement) {
                capacityElement.textContent = `${result.capacidade} navegadores`;
            }
            
            // Atualizar o máximo de aberturas simultâneas
            const openingsCount = document.getElementById('openings-count');
            const openingsSlider = document.querySelector('input[type="range"]');
            
            // Atualizar a capacidade máxima global
            capacidadeMaximaAtual = result.capacidade;
            
            if (openingsSlider) {
                openingsSlider.max = result.capacidade;
                
                // Se o valor atual for maior que a capacidade, ajustar
                const currentValue = parseInt(openingsCount?.textContent || '1');
                if (currentValue > result.capacidade) {
                    openingsSlider.value = result.capacidade;
                    if (openingsCount) {
                        openingsCount.textContent = result.capacidade;
                    }
                }
            }
        } else {
            console.error('Erro ao calcular capacidade:', result.error);
            
            // Valor padrão em caso de erro
            const capacityElement = document.getElementById('monitor-capacity');
            if (capacityElement) {
                capacityElement.textContent = 'Erro no cálculo';
            }
        }
    } catch (error) {
        console.error('Erro ao calcular capacidade do monitor:', error);
    }
}

/**
 * Calcula a capacidade total de todos os monitores
 */
async function calcularCapacidadeTodosMonitores() {
    try {
        if (!window.electronAPI || !window.electronAPI.calculateMonitorCapacity) {
            console.warn('API de cálculo de capacidade não disponível');
            return;
        }
        
        // Obter valores da interface ou usar padrões
        const defaultCheckbox = document.getElementById('default-resolution-checkbox');
        const widthInput = document.getElementById('width-input');
        const heightInput = document.getElementById('height-input');
        
        let larguraLogica, alturaLogica;
        
        if (defaultCheckbox && defaultCheckbox.checked) {
            // Usar valores padrão
            larguraLogica = 502;
            alturaLogica = 800;
        } else {
            // Usar valores dos campos da interface
            larguraLogica = parseInt(widthInput?.value) || 502;
            alturaLogica = parseInt(heightInput?.value) || 800;
        }
        
        const config = {
            larguraLogica: larguraLogica,
            alturaLogica: alturaLogica,
            fatorEscala: 0.65
        };
        
        let capacidadeTotal = 0;
        let todasPosicoes = [];
        let proximoId = 0; // Contador global para IDs únicos
        
        // Calcular capacidade para cada monitor
        for (const monitor of monitoresDetectados) {
            const result = await window.electronAPI.calculateMonitorCapacity(monitor, config);
            
            if (result.success) {
                capacidadeTotal += result.capacidade;
                
                // Corrigir IDs para serem sequenciais e únicos
                const posicoesComIdCorrigido = result.posicoes.map(pos => ({
                    ...pos,
                    id: proximoId++
                }));
                
                todasPosicoes = todasPosicoes.concat(posicoesComIdCorrigido);
                
                console.log(`Monitor ${monitor.nome}: ${result.capacidade} navegadores`);
            } else {
                console.error(`Erro ao calcular capacidade do monitor ${monitor.nome}:`, result.error);
            }
        }
        
        console.log('Capacidade total de todos os monitores:', capacidadeTotal);
        console.log('Total de posições disponíveis:', todasPosicoes.length);
        
        // Armazenar dados de posicionamento para todos os monitores
        const dadosTodosMonitores = {
            id: 'todos_monitores',
            monitores: monitoresDetectados,
            config: config,
            capacidade: capacidadeTotal,
            posicoes: todasPosicoes,
            timestamp: new Date().toISOString()
        };
        
        // Atualizar array de posicionamento
        const indiceExistente = dadosPosicionamento.findIndex(item => item.id === 'todos_monitores');
        if (indiceExistente >= 0) {
            dadosPosicionamento[indiceExistente] = dadosTodosMonitores;
        } else {
            dadosPosicionamento.push(dadosTodosMonitores);
        }
        
        // Salvar dados automaticamente
        await salvarDadosMonitores();
        
        // Atualizar a interface com a capacidade total
        const capacityElement = document.getElementById('monitor-capacity');
        if (capacityElement) {
            capacityElement.textContent = `${capacidadeTotal} navegadores (todos os monitores)`;
        }
        
        // Atualizar o máximo de aberturas simultâneas
        const openingsCount = document.getElementById('openings-count');
        const openingsSlider = document.querySelector('input[type="range"]');
        
        // Atualizar a capacidade máxima global
        capacidadeMaximaAtual = capacidadeTotal;
        
        if (openingsSlider) {
            openingsSlider.max = capacidadeTotal;
            
            // Se o valor atual for maior que a capacidade, ajustar
            const currentValue = parseInt(openingsCount?.textContent || '1');
            if (currentValue > capacidadeTotal) {
                openingsSlider.value = capacidadeTotal;
                if (openingsCount) {
                    openingsCount.textContent = capacidadeTotal;
                }
            }
        }
        
    } catch (error) {
        console.error('Erro ao calcular capacidade de todos os monitores:', error);
        
        // Valor padrão em caso de erro
        const capacityElement = document.getElementById('monitor-capacity');
        if (capacityElement) {
            capacityElement.textContent = 'Erro no cálculo';
        }
    }
}

/**
 * Inicializa o sistema de detecção de monitores
 */
async function inicializarSistemaMonitores() {
    console.log('Inicializando sistema de monitores...');
    
    // Carregar dados salvos anteriormente
    const dadosSalvos = await carregarDadosMonitores();
    if (dadosSalvos) {
        if (dadosSalvos.monitores) {
            monitoresDetectados = dadosSalvos.monitores;
            console.log('Monitores carregados do arquivo:', monitoresDetectados);
        }
        if (dadosSalvos.posicionamento) {
            dadosPosicionamento = dadosSalvos.posicionamento;
            console.log('Dados de posicionamento carregados:', dadosPosicionamento);
        }
    }
    
    // Detectar monitores automaticamente quando a aplicação carregar (sempre atualizar)
    await detectarEAtualizarMonitores();
    

    
    // Inicializar controles de resolução
    inicializarControlesResolucao();
}

/**
 * Inicializa os controles de resolução (checkbox padrão e campos de largura/altura)
 */
function inicializarControlesResolucao() {
    const defaultCheckbox = document.getElementById('default-resolution-checkbox');
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');
    
    if (defaultCheckbox && widthInput && heightInput) {
        // Função para atualizar estado dos campos
        function atualizarEstadoCampos() {
            const isDefault = defaultCheckbox.checked;
            widthInput.disabled = isDefault;
            heightInput.disabled = isDefault;
            
            if (isDefault) {
                widthInput.value = '502';
                heightInput.value = '800';
            }
            
            // Recalcular capacidade quando houver mudança
            if (monitorSelecionado) {
                calcularCapacidadeMonitor(monitorSelecionado);
            } else if (monitorSelecionado === null && monitoresDetectados.length > 0) {
                // Todos os monitores selecionados
                calcularCapacidadeTodosMonitores();
            }
        }
        
        // Event listener para checkbox
        defaultCheckbox.addEventListener('change', atualizarEstadoCampos);
        
        // Event listeners para campos de largura e altura
        widthInput.addEventListener('input', () => {
            if (!defaultCheckbox.checked) {
                if (monitorSelecionado) {
                    calcularCapacidadeMonitor(monitorSelecionado);
                } else if (monitorSelecionado === null && monitoresDetectados.length > 0) {
                    calcularCapacidadeTodosMonitores();
                }
            }
        });
        
        heightInput.addEventListener('input', () => {
            if (!defaultCheckbox.checked) {
                if (monitorSelecionado) {
                    calcularCapacidadeMonitor(monitorSelecionado);
                } else if (monitorSelecionado === null && monitoresDetectados.length > 0) {
                    calcularCapacidadeTodosMonitores();
                }
            }
        });
        
        // Inicializar estado
        atualizarEstadoCampos();
    }
}

// Função para abrir navegadores
async function abrirNavegadores() {
    try {
        console.log('Iniciando abertura de navegadores...');
        
        // Carregar configurações atuais
        const settings = await window.electronAPI.loadSettings();
        if (!settings) {
            showNotification('Erro ao carregar configurações. Verifique se as configurações estão salvas.', 'error');
            return;
        }
        
        // Obter links configurados
        const links = settings.links || [];
        if (links.length === 0) {
            showNotification('Nenhum link configurado. Adicione links antes de abrir os navegadores.', 'warning');
            return;
        }
        
        // Obter número de aberturas simultâneas
        const simultaneousOpenings = settings.settings?.openings || 1;
        
        // Obter modo de proxy
        const proxyMode = getProxyMode(settings.settings?.toggles);
        
        // Preparar lista de proxies baseada no modo
        let proxyList = [];
        if (proxyMode === 'list') {
            // Para modo lista, usar proxies da lista de proxies
            // settings.proxies pode ser array ou string, tratar ambos os casos
            let listProxies = [];
            if (Array.isArray(settings.proxies)) {
                listProxies = settings.proxies.filter(p => p && p.trim());
            } else if (typeof settings.proxies === 'string') {
                listProxies = settings.proxies.split('\n').filter(p => p.trim());
            }
            
            // Validar se há proxies suficientes
            if (listProxies.length === 0) {
                showNotification('Nenhum proxy configurado na Lista de Proxies. Adicione proxies antes de abrir os navegadores.', 'error');
                return;
            }
            
            if (listProxies.length < simultaneousOpenings) {
                showNotification(`Erro: Apenas ${listProxies.length} proxies disponíveis para ${simultaneousOpenings} navegadores. Adicione mais proxies ou reduza o número de aberturas simultâneas.`, 'error');
                return;
            }
            
            // Usar proxies da lista (consumir um por navegador)
            proxyList = listProxies.slice(0, simultaneousOpenings);
            
            console.log(`Usando ${proxyList.length} proxies da lista para ${simultaneousOpenings} navegadores`);
            showNotification(`${proxyList.length} proxies da lista serão utilizados`, 'info', 2000);
        } else if (proxyMode === 'rotating') {
            // Para modo rotativo, usar o proxy rotativo único
            const rotatingProxy = getRotatingProxy();
            
            if (!rotatingProxy) {
                showNotification('Nenhum proxy configurado em Proxy Rotativo. Adicione um proxy antes de abrir os navegadores.', 'warning');
                return;
            }
            
            // No modo rotativo, todos os navegadores usam o mesmo proxy
            proxyList = [rotatingProxy];
            console.log(`Usando proxy rotativo: ${rotatingProxy} para todos os navegadores`);
            showNotification(`Proxy rotativo ${rotatingProxy} será utilizado para todos os navegadores`, 'info', 2000);
        }
        
        // Preparar opções para os navegadores
        const options = {
            simultaneousOpenings: simultaneousOpenings,
            urls: links,
            proxy: {
                mode: proxyMode,
                list: proxyList
            },
            automation: {
                muteAudio: settings.settings?.toggles?.['mute-audio-toggle'] || false,
                delay: settings.settings?.delay || 5
            },
            blockedDomains: ['gcaptcha4-hrc.gsensebot.com', 'gcaptcha4-hrc.geetest.com'],
            // Incluir informações do monitor selecionado
            selectedMonitor: monitorSelecionado,
            useAllMonitors: monitorSelecionado === null
        };
        
        // Validações já foram feitas acima para cada modo de proxy
        
        console.log('Opções dos navegadores:', options);
        
        // Desabilitar botão durante o processo
        const openBrowsersBtn = document.getElementById('open-browsers-btn');
        if (openBrowsersBtn) {
            openBrowsersBtn.disabled = true;
            openBrowsersBtn.textContent = 'Abrindo...';
        }
        
        // Chamar API para abrir navegadores
        const result = await window.electronAPI.openBrowsers(options);
        
        if (result.success) {
            console.log('Navegadores abertos com sucesso:', result);
            
            // Consumir proxies da lista após uso bem-sucedido
            if (proxyMode === 'list' && proxyList.length > 0) {
                const quantidadeUsada = Math.min(proxyList.length, simultaneousOpenings);
                for (let i = 0; i < quantidadeUsada; i++) {
                    if (proxyList[i]) {
                        consumeProxy(proxyList[i]);
                    }
                }
                console.log(`${quantidadeUsada} proxies consumidos da lista`);
            }
            
            showNotification(`${result.janelasMovidas || 0} navegadores foram abertos e posicionados com sucesso!`, 'success');
        } else {
            console.error('Erro ao abrir navegadores:', result.error);
            showNotification(`Erro ao abrir navegadores: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Erro ao abrir navegadores:', error);
        showNotification(`Erro inesperado: ${error.message}`, 'error');
    } finally {
        // Reabilitar botão
        const openBrowsersBtn = document.getElementById('open-browsers-btn');
        if (openBrowsersBtn) {
            openBrowsersBtn.disabled = false;
            openBrowsersBtn.textContent = 'Abrir Navegadores';
        }
    }
}

// Função auxiliar para determinar o modo de proxy
function getProxyMode(toggles) {
    if (!toggles) return 'none';
    
    if (toggles['proxy-mode-list']) return 'list';
    if (toggles['proxy-mode-rotating']) return 'rotating';
    return 'none';
}



// Adicionar inicialização do sistema de monitores ao DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que tudo esteja carregado
    setTimeout(inicializarSistemaMonitores, 500);
    initializeChromeDownloadModal();
    initializeChromeDownloadSystem();
});

// Sistema de Download do Chrome
function initializeChromeDownloadModal() {
    const modal = document.getElementById('chrome-download-modal');
    const closeBtn = document.getElementById('close-download-modal-btn');
    const cancelBtn = document.getElementById('cancel-download-btn');
    
    // Fechar modal
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideChromeDownloadModal();
        });
    }
    
    // Cancelar download (implementar se necessário)
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            // Implementar cancelamento se necessário
            console.log('Download cancelado pelo usuário');
        });
    }
}

function showChromeDownloadModal(options = {}) {
    const modal = document.getElementById('chrome-download-modal');
    const title = document.getElementById('download-title');
    const message = document.getElementById('download-message');
    const versionInfo = document.getElementById('version-info');
    const currentVersion = document.getElementById('current-version');
    const newVersion = document.getElementById('new-version');
    const cancelBtn = document.getElementById('cancel-download-btn');
    const closeBtn = document.getElementById('close-download-modal-btn');
    
    if (modal) {
        // Configurar conteúdo
        if (title) title.textContent = options.title || 'Baixando Chrome';
        if (message) message.textContent = options.message || 'Preparando download...';
        
        // Mostrar informações de versão se fornecidas
        if (options.currentVersion || options.newVersion) {
            if (versionInfo) versionInfo.classList.remove('hidden');
            if (currentVersion) currentVersion.textContent = options.currentVersion || '-';
            if (newVersion) newVersion.textContent = options.newVersion || '-';
        }
        
        // Mostrar botões apropriados
        if (options.showCancel && cancelBtn) {
            cancelBtn.classList.remove('hidden');
        }
        if (options.showClose && closeBtn) {
            closeBtn.classList.remove('hidden');
        }
        
        // Resetar progresso
        updateDownloadProgress(0);
        
        // Mostrar modal
        modal.classList.remove('hidden');
    }
}

function hideChromeDownloadModal() {
    const modal = document.getElementById('chrome-download-modal');
    if (modal) {
        modal.classList.add('hidden');
        
        // Resetar estado
        const versionInfo = document.getElementById('version-info');
        const cancelBtn = document.getElementById('cancel-download-btn');
        const closeBtn = document.getElementById('close-download-modal-btn');
        
        if (versionInfo) versionInfo.classList.add('hidden');
        if (cancelBtn) cancelBtn.classList.add('hidden');
        if (closeBtn) closeBtn.classList.add('hidden');
    }
}

function updateDownloadProgress(percentage, speed = '') {
    const progressBar = document.getElementById('download-progress-bar');
    const percentageText = document.getElementById('download-percentage');
    const speedText = document.getElementById('download-speed');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    if (percentageText) {
        percentageText.textContent = `${Math.round(percentage)}%`;
    }
    
    if (speedText) {
        speedText.textContent = speed;
    }
}

function updateDownloadMessage(message) {
    const messageElement = document.getElementById('download-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
}

function showDownloadComplete(success = true) {
    const title = document.getElementById('download-title');
    const message = document.getElementById('download-message');
    const cancelBtn = document.getElementById('cancel-download-btn');
    const closeBtn = document.getElementById('close-download-modal-btn');
    
    if (success) {
        if (title) title.textContent = 'Download Concluído!';
        if (message) message.textContent = 'Chrome foi instalado com sucesso.';
        updateDownloadProgress(100);
    } else {
        if (title) title.textContent = 'Erro no Download';
        if (message) message.textContent = 'Ocorreu um erro durante o download.';
    }
    
    // Esconder botão cancelar e mostrar fechar
    if (cancelBtn) cancelBtn.classList.add('hidden');
    if (closeBtn) closeBtn.classList.remove('hidden');
}

// Expor funções globalmente para uso pelo main process
window.chromeDownload = {
    showChromeDownloadModal: showChromeDownloadModal,
    hideChromeDownloadModal: hideChromeDownloadModal,
    updateDownloadProgress: updateDownloadProgress,
    updateDownloadMessage: updateDownloadMessage,
    showDownloadComplete: showDownloadComplete
};

// Sistema de download do Chrome
function initializeChromeDownloadSystem() {
    // Listener para mostrar modal de download
    window.electronAPI.onShowChromeDownloadModal((data) => {
        const title = data.isUpdate ? 'Atualizando Chrome' : 'Baixando Chrome';
        const message = data.isUpdate 
            ? `Atualizando do Chrome ${data.currentVersion} para ${data.latestVersion}`
            : `Baixando Chrome ${data.latestVersion}`;
        
        window.chromeDownload.showChromeDownloadModal({ title, message });
    });
    
    // Listener para progresso do download
    window.electronAPI.onChromeDownloadProgress((progress) => {
        window.chromeDownload.updateDownloadProgress(
            progress.percent || 0,
            progress.speed || '0 KB/s'
        );
        
        if (progress.message) {
            window.chromeDownload.updateDownloadMessage(progress.message);
        }
    });
    
    // Listener para conclusão do download
    window.electronAPI.onChromeDownloadComplete(() => {
        window.chromeDownload.showDownloadComplete(true);
        setTimeout(() => {
            window.chromeDownload.hideChromeDownloadModal();
        }, 2000);
    });
    
    // Listener para erros
    window.electronAPI.onChromeDownloadError((error) => {
        window.chromeDownload.updateDownloadMessage(`Erro: ${error}`);
        window.chromeDownload.showDownloadComplete(false);
        setTimeout(() => {
            window.chromeDownload.hideChromeDownloadModal();
        }, 3000);
    });
}

/**
 * Função para atualizar todas as páginas dos navegadores ativos
 * Usa o módulo de injeção para carregar o script reload.js
 */
async function atualizarPaginas() {
    try {
        console.log('🔄 Iniciando atualização de páginas...');
        
        // Mostrar notificação de início
        showNotification('Atualizando páginas dos navegadores...', 'info');
        
        // Usar o módulo de injeção para carregar o script reload.js
        const result = await window.electronAPI.injectScript('reload');
        
        if (result.success) {
            console.log('✅ Páginas atualizadas com sucesso:', result.message);
            showNotification(result.message, 'success');
        } else {
            console.error('❌ Erro ao atualizar páginas:', result.message);
            showNotification(`Erro: ${result.message}`, 'error');
        }
        
    } catch (error) {
        console.error('Erro inesperado ao atualizar páginas:', error);
        showNotification(`Erro inesperado: ${error.message}`, 'error');
    }
}

console.log('app.js carregado com sucesso');
console.log('Sistema de download do Chrome inicializado');
console.log('Função atualizarPaginas() configurada para usar módulo de injeção');