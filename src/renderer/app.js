// Aplicação principal - Gerenciamento de eventos e funcionalidades

// Variáveis globais para valores de resolução padrão
let DEFAULT_WIDTH = 800;
let DEFAULT_HEIGHT = 1200;
let FALLBACK_WIDTH = 502;
let FALLBACK_HEIGHT = 800;

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

/**
 * Função de confirmação customizada com estilo do app
 */
function showCustomConfirm(message, onConfirm, onCancel = null) {
    return new Promise((resolve) => {
        // Criar overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; display: flex; align-items: center; justify-content: center;';
        
        // Criar modal
        const modal = document.createElement('div');
        modal.className = 'bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-md mx-4 shadow-2xl';
        modal.style.cssText = 'background: rgba(31, 41, 55, 0.95); backdrop-filter: blur(10px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);';
        
        modal.innerHTML = `
            <div class="mb-4">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-8 h-8 bg-yellow-800 rounded-full flex items-center justify-center">
                        <span class="text-yellow-300 text-lg">⚠</span>
                    </div>
                    <h3 class="text-white font-semibold text-lg">Confirmação</h3>
                </div>
                <p class="text-gray-300 text-sm leading-relaxed">${message}</p>
            </div>
            <div class="flex gap-3 justify-end">
                <button id="cancel-btn" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors">
                    Cancelar
                </button>
                <button id="confirm-btn" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                    Confirmar
                </button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Sem animação - exibir diretamente
        
        // Event listeners
        const confirmBtn = modal.querySelector('#confirm-btn');
        const cancelBtn = modal.querySelector('#cancel-btn');
        
        const cleanup = () => {
            if (overlay.parentElement) {
                overlay.remove();
            }
        };
        
        confirmBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
            if (onConfirm) onConfirm();
        });
        
        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
            if (onCancel) onCancel();
        });
        
        // Fechar com ESC
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                resolve(false);
                if (onCancel) onCancel();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // Fechar clicando no overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(false);
                if (onCancel) onCancel();
            }
        });
    });
}

// Aguarda o DOM estar carregado
/**
 * Função principal de inicialização da aplicação
 */
async function initializeApplication() {
    console.log('Aplicação iniciada');
    
    try {
        // Carregar configurações salvas primeiro e aguardar
        await loadSettingsAsync();
        
        // Inicializar funcionalidades básicas
        initializeTabSystem();
        initializeButtons();
        initializePopups();
        initializeCounters();
        initializeLinkManagement();
        initializeAutoSave();
        
        // Inicializar sistema de download do Chrome
        initializeChromeDownloadModal();
        initializeChromeDownloadSystem();
        
        // Aguardar um pouco para garantir que tudo esteja carregado antes de inicializar monitores
        setTimeout(inicializarSistemaMonitores, 500);
        
        console.log('Aplicação inicializada com sucesso');
    } catch (error) {
        console.error('Erro durante a inicialização da aplicação:', error);
    }
}

// Inicializar aplicação quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', initializeApplication);

// Sistema de salvamento automático
let saveTimeout = null;
const SAVE_DELAY = 100; // 300ms de delay para evitar salvamentos excessivos

// Função para salvar configurações
function saveSettings() {
    // Obter configuração de resolução da interface
    const defaultCheckbox = document.getElementById('default-resolution-checkbox');
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');
    
    const settings = {
        links: getAddedLinks(),
        proxies: getAddedProxies(),
        rotatingProxies: getRotatingProxy() ? [getRotatingProxy()] : [],
        pixKeys: getAddedPixKeys(),
        extensions: getAddedExtensions(),
        settings: {
            delay: parseInt(document.getElementById('delay-count')?.textContent || '5'),
            openings: parseInt(document.getElementById('openings-count')?.textContent || '1'),
            toggles: getToggleStates(),
            lastSaved: new Date().toISOString()
        },
        resolution: {
            useDefault: defaultCheckbox?.checked ?? true,
            width: parseInt(widthInput?.value) || DEFAULT_WIDTH,
            height: parseInt(heightInput?.value) || DEFAULT_HEIGHT
        },
        automation: {
            muteAudio: document.getElementById('mute-audio-toggle')?.checked || false,
            depositMin: parseFloat(document.getElementById('deposit-min')?.value || '0'),
            depositMax: parseFloat(document.getElementById('deposit-max')?.value || '0'),
            delayEnabled: document.getElementById('delay-toggle')?.checked || false,
            delaySeconds: parseInt(document.getElementById('delay-count')?.textContent || '5'),
            password: document.getElementById('password-field')?.value || '',
            withdrawPassword: document.getElementById('withdraw-password-field')?.value || '',
            randomPasswords: document.getElementById('random-passwords-toggle')?.checked || false,
            categoria: document.getElementById('categoria-field')?.value || 'slots',
            jogo: document.getElementById('jogo-field')?.value || '',
            pixKeyType: document.getElementById('pix-key-type')?.value || 'CPF'
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

// Função para carregar configurações (versão assíncrona)
async function loadSettingsAsync() {
    try {
        if (window.electronAPI && window.electronAPI.loadSettings) {
            const settings = await window.electronAPI.loadSettings();
            if (settings) {
                console.log('Carregando configurações salvas:', settings);
                applyLoadedSettings(settings);
            }
        } else {
            // Fallback para localStorage durante desenvolvimento
            loadSettingsFromLocalStorage();
        }
    } catch (error) {
        console.error('Erro ao carregar configurações via Electron:', error);
        // Fallback para localStorage
        loadSettingsFromLocalStorage();
    }
}

// Função para carregar configurações (versão síncrona - mantida para compatibilidade)
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
    
    // Carregar proxies rotativos
    if (settings.rotatingProxies && settings.rotatingProxies.length > 0) {
        loadRotatingProxies(settings.rotatingProxies);
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
        
    }
    
    // Carregar configuração de resolução ANTES dos toggles para evitar sobrescrita
    if (settings.resolution) {
        // Atualizar variáveis globais com valores do arquivo de configuração
        if (settings.resolution.width) {
            DEFAULT_WIDTH = settings.resolution.width;
        }
        if (settings.resolution.height) {
            DEFAULT_HEIGHT = settings.resolution.height;
        }
        
        const defaultCheckbox = document.getElementById('default-resolution-checkbox');
        const widthInput = document.getElementById('width-input');
        const heightInput = document.getElementById('height-input');
        
        if (defaultCheckbox) {
            defaultCheckbox.checked = settings.resolution.useDefault === true;
        }
        
        if (widthInput && settings.resolution.width) {
            widthInput.value = settings.resolution.width;
        }
        
        if (heightInput && settings.resolution.height) {
            heightInput.value = settings.resolution.height;
        }
        
        // Atualizar estado dos campos baseado no checkbox
        if (defaultCheckbox && widthInput && heightInput) {
            const isDefault = defaultCheckbox.checked;
            widthInput.disabled = isDefault;
            heightInput.disabled = isDefault;
            
            // NÃO sobrescrever os valores carregados do arquivo
            // Os valores já foram definidos acima com base no settings.resolution
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
        const jogoField = document.getElementById('jogo-field');
        
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
        
        // Carregar campos de senha
        const passwordField = document.getElementById('password-field');
        const withdrawPasswordField = document.getElementById('withdraw-password-field');
        const randomPasswordsToggle = document.getElementById('random-passwords-toggle');
        
        if (passwordField && settings.automation.password !== undefined) {
            passwordField.value = settings.automation.password;
        }
        
        if (withdrawPasswordField && settings.automation.withdrawPassword !== undefined) {
            withdrawPasswordField.value = settings.automation.withdrawPassword;
        }
        
        if (randomPasswordsToggle) {
            randomPasswordsToggle.checked = settings.automation.randomPasswords || false;
        }
        
        // Carregar campo categoria
        const categoriaField = document.getElementById('categoria-field');
        if (categoriaField && settings.automation.categoria !== undefined) {
            categoriaField.value = settings.automation.categoria;
        }
        
        // Carregar campo jogo
        if (jogoField && settings.automation.jogo !== undefined) {
            jogoField.value = settings.automation.jogo;
        }
        
        // Carregar tipo de chave PIX
        const pixKeyTypeField = document.getElementById('pix-key-type');
        if (pixKeyTypeField && settings.automation.pixKeyType !== undefined) {
            pixKeyTypeField.value = settings.automation.pixKeyType;
        }
    }
    

    // Carregar estados dos toggles POR ÚLTIMO, excluindo o checkbox de resolução
    if (settings.settings && settings.settings.toggles) {
        const togglesToApply = { ...settings.settings.toggles };
        // Remover o checkbox de resolução dos toggles para não sobrescrever
        delete togglesToApply['default-resolution-checkbox'];
        applyToggleStates(togglesToApply);
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
    const categoriaField = document.getElementById('categoria-field');
    const jogoField = document.getElementById('jogo-field');
    
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
        delayToggleAutomation.addEventListener('change', function() {
            const delayControls = document.getElementById('delay-controls');
            
            if (this.checked) {
                if (delayControls) delayControls.classList.remove('hidden');
            } else {
                if (delayControls) delayControls.classList.add('hidden');
            }
            
            debouncedSave();
        });
    }
    
    if (categoriaField) {
        categoriaField.addEventListener('change', debouncedSave);
    }
    
    if (jogoField) {
        jogoField.addEventListener('input', debouncedSave);
        jogoField.addEventListener('change', debouncedSave);
    }
    
    // Observar mudanças no dropdown de tipo de chave PIX
    const pixKeyTypeField = document.getElementById('pix-key-type');
    if (pixKeyTypeField) {
        pixKeyTypeField.addEventListener('change', debouncedSave);
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
    
    // Lógica específica para a checkbox de senhas aleatórias
    const randomPasswordsToggle = document.getElementById('random-passwords-toggle');
    const passwordField = document.getElementById('password-field');
    const withdrawPasswordField = document.getElementById('withdraw-password-field');
    
    if (randomPasswordsToggle && passwordField && withdrawPasswordField) {
        // Função para atualizar estado dos campos
        function updatePasswordFields() {
            const isRandomEnabled = randomPasswordsToggle.checked;
            passwordField.disabled = isRandomEnabled;
            withdrawPasswordField.disabled = isRandomEnabled;
            
            if (isRandomEnabled) {
                passwordField.placeholder = 'Senha será gerada automaticamente';
                withdrawPasswordField.placeholder = 'Senha será gerada automaticamente';
            } else {
                passwordField.placeholder = 'Digite a senha';
                withdrawPasswordField.placeholder = 'Digite 6 números';
            }
        }
        
        // Aplicar estado inicial
        updatePasswordFields();
        
        // Escutar mudanças na checkbox
        randomPasswordsToggle.addEventListener('change', updatePasswordFields);
        
        // Adicionar listeners para salvar automaticamente quando os campos mudarem
        passwordField.addEventListener('input', debouncedSave);
        
        // Validação para senha de saque (apenas números, máximo 6 dígitos)
        withdrawPasswordField.addEventListener('input', function(e) {
            // Remove caracteres não numéricos
            let value = e.target.value.replace(/[^0-9]/g, '');
            // Limita a 6 dígitos
            if (value.length > 6) {
                value = value.slice(0, 6);
            }
            e.target.value = value;
            debouncedSave();
        });
        
        // Previne colagem de texto não numérico
         withdrawPasswordField.addEventListener('paste', function(e) {
             e.preventDefault();
             const paste = (e.clipboardData || window.clipboardData).getData('text');
             const numericOnly = paste.replace(/[^0-9]/g, '').slice(0, 6);
             e.target.value = numericOnly;
             debouncedSave();
         });
    }
    
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
    
    // Atualizar status dos perfis periodicamente
    setInterval(async () => {
        const profilesTab = document.querySelector('[data-tab="profiles"]');
        if (profilesTab && profilesTab.classList.contains('active')) {
            await renderProfileCards();
        }
    }, 2000); // A cada 2 segundos quando a aba de perfis estiver ativa

    // Observer para detectar quando a aba de contas fica visível
    const profilesTabContent = document.getElementById('tab-contas');
    if (profilesTabContent) {
        const observer = new MutationObserver(async (mutations) => {
            mutations.forEach(async (mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (!target.classList.contains('hidden')) {
                        // Aba de contas ficou visível - renderização já é feita pelo initializeProfilesTab
                        console.log('Aba de perfis ficou visível');
                    }
                }
            });
        });
        
        observer.observe(profilesTabContent, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
}

// Sistema de abas
function initializeTabSystem() {
    const tabButtons = document.querySelectorAll('[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
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
                
                // Sempre recarregar dados quando aba Contas for ativada
                if (targetTab === 'contas') {
                    await initializeProfilesTab();
                }
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
    
    // Botão All (carregar todos os links sequencialmente)
    const allBtn = document.getElementById('all-btn');
    if (allBtn) {
        allBtn.addEventListener('click', () => {
            console.log('Botão All clicado');
            executeAllLinksNavigation();
        });
    }
    
    // Botão Abrir Navegadores
    const openBrowsersBtn = document.getElementById('open-browsers-btn');
    if (openBrowsersBtn) {
        openBrowsersBtn.addEventListener('click', async () => {
            await abrirNavegadores();
        });
    }
    
    // Botão Excluir Todos os Perfis
    const deleteAllProfilesBtn = document.getElementById('delete-all-profiles-btn');
    if (deleteAllProfilesBtn) {
        deleteAllProfilesBtn.addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('Tem certeza que deseja excluir TODOS os perfis? Esta ação não pode ser desfeita e irá apagar todas as pastas de perfis e limpar o config.json.');
            if (confirmed) {
                try {
                    // Mostrar barra de progressão
                    showDeleteProgress();
                    
                    // Configurar listener para progresso
                    window.electronAPI.onDeleteProgress((progressData) => {
                        updateDeleteProgress(progressData);
                    });
                    
                    const result = await window.electronAPI.deleteAllProfiles();
                    
                    if (result.success) {
                        // Aguardar um pouco para mostrar conclusão
                        setTimeout(() => {
                            hideDeleteProgress();
                            showNotification('Todos os perfis foram excluídos com sucesso', 'success');
                            // Limpar dados locais imediatamente
                            profilesData = [];
                            filteredProfilesData = [];
                            // Renderizar cards filtrados imediatamente
                            renderFilteredProfileCards();
                        }, 1000);
                    } else {
                        hideDeleteProgress();
                        showNotification(`Erro ao excluir perfis: ${result.error}`, 'error');
                    }
                } catch (error) {
                    console.error('Erro ao excluir todos os perfis:', error);
                    hideDeleteProgress();
                    showNotification('Erro ao excluir todos os perfis', 'error');
                } finally {
                    // Remover listener
                    window.electronAPI.removeDeleteProgressListener();
                }
            }
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
                if (confirmMessage && !(await showCustomConfirm(confirmMessage))) {
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
    
    // Funcionalidade para chaves PIX
    initializePixManagement();
    
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
        
        // Se for o popup de links, remover campos vazios antes de fechar
        if (popupId === 'links-popup') {
            removeEmptyLinkInputs();
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
                // Normalizar URL antes de adicionar à lista
                const normalizedUrl = normalizeUrlFrontend(value);
                links.push(normalizedUrl);
                console.log(`Link coletado e normalizado: ${value} -> ${normalizedUrl}`);
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
    
    // Obter chaves PIX do textarea
    const pixListPopup = document.getElementById('pix-list-popup');
    if (pixListPopup && pixListPopup.value) {
        const lines = pixListPopup.value.split('\n');
        lines.forEach(line => {
            const pixKey = line.trim();
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

// Função para carregar proxies rotativos
function loadRotatingProxies(rotatingProxies) {
    if (!rotatingProxies || rotatingProxies.length === 0) return;
    
    // Usar o primeiro proxy rotativo da lista
    const rotatingProxy = rotatingProxies[0];
    
    // Carregar proxy rotativo no campo principal
    const rotatingProxyList = document.getElementById('rotating-proxy-list');
    if (rotatingProxyList) {
        rotatingProxyList.value = rotatingProxy;
    }
    
    // Carregar proxy rotativo no campo do popup
    const rotatingProxyListPopup = document.getElementById('rotating-proxy-list-popup');
    if (rotatingProxyListPopup) {
        rotatingProxyListPopup.value = rotatingProxy;
    }
}

// Função para carregar chaves PIX
function loadPixKeys(pixKeys) {
    const pixListPopup = document.getElementById('pix-list-popup');
    if (!pixListPopup) return;
    
    // Carregar chaves PIX no textarea
    if (pixKeys && pixKeys.length > 0) {
        pixListPopup.value = pixKeys.join('\n');
    } else {
        pixListPopup.value = '';
    }
    
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
    const pixListPopup = document.getElementById('pix-list-popup');
    let totalPixKeys = 0;
    let pixKeys = [];
    
    if (pixListPopup && pixListPopup.value) {
        const lines = pixListPopup.value.split('\n');
        pixKeys = lines.filter(line => line.trim() !== '').map(line => line.trim());
        totalPixKeys = pixKeys.length;
    }
    
    // Atualizar contador na interface (se existir)
    const pixCounter = document.getElementById('pix-counter-text');
    if (pixCounter) {
        pixCounter.textContent = `${totalPixKeys} chaves PIX disponíveis`;
    }
    
    // Atualizar contadores por tipo usando o PixValidator
    updatePixCountsByType(pixKeys);
    
    console.log(`Total de chaves PIX: ${totalPixKeys}`);
}

// Função para atualizar contadores por tipo de chave PIX
function updatePixCountsByType(pixKeys) {
    if (typeof PixValidator === 'undefined') {
        console.warn('PixValidator não está disponível');
        return;
    }
    
    const validator = new PixValidator();
    const counts = validator.countPixKeysByType(pixKeys);
    
    // Atualizar elementos na interface
    const cpfCount = document.getElementById('cpf-count');
    const cnpjCount = document.getElementById('cnpj-count');
    const emailCount = document.getElementById('email-count');
    const phoneCount = document.getElementById('phone-count');
    const randomCount = document.getElementById('random-count');
    const invalidCount = document.getElementById('invalid-count');
    
    if (cpfCount) cpfCount.textContent = counts['CPF'] || 0;
    if (cnpjCount) cnpjCount.textContent = counts['CNPJ'] || 0;
    if (emailCount) emailCount.textContent = counts['E-mail'] || 0;
    if (phoneCount) phoneCount.textContent = counts['Telefone'] || 0;
    if (randomCount) randomCount.textContent = counts['Chave Aleatória'] || 0;
    if (invalidCount) invalidCount.textContent = counts['Inválidas'] || 0;
    
    console.log('Contadores por tipo atualizados:', counts);
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

// Função para executar navegação com todos os links
async function executeAllLinksNavigation() {
    console.log('Iniciando navegação com todos os links...');
    
    try {
        // Obter todos os links adicionados
        const links = getAddedLinks();
        
        if (links.length === 0) {
            showNotification('Nenhum link foi adicionado. Por favor, adicione links primeiro.', 'warning');
            return;
        }
        
        // Obter navegadores ativos com dados de perfil
        const activeBrowsersResult = await window.electronAPI.getActiveBrowsersWithProfiles();
        
        if (!activeBrowsersResult.success) {
            showNotification('Erro ao verificar navegadores ativos: ' + activeBrowsersResult.error, 'error');
            return;
        }
        
        const activeBrowsersWithProfiles = activeBrowsersResult.browsers;
        const activeBrowsers = activeBrowsersWithProfiles.map(browser => browser.navigatorId);
        
        if (activeBrowsers.length === 0) {
            showNotification('Nenhum navegador ativo encontrado. Abra os navegadores primeiro usando o botão "Abrir Navegadores".', 'warning');
            return;
        }
        
        // Verificar se há pelo menos o mesmo número de navegadores para os links
        if (activeBrowsers.length < links.length) {
            showNotification(`Número insuficiente de navegadores. Você tem ${links.length} links mas apenas ${activeBrowsers.length} navegador(es) ativo(s). Abra mais navegadores.`, 'warning');
            return;
        }
        
        console.log(`Encontrados ${activeBrowsers.length} navegadores ativos para ${links.length} links`);
        
        // Criar array de URLs distribuídas de forma sequencial natural
        const distributedUrls = [];
        
        // Distribuir links de forma sequencial (link1, link2, link3, link1, link2, link3...)
        for (let i = 0; i < activeBrowsers.length; i++) {
            const linkIndex = i % links.length;
            distributedUrls.push(links[linkIndex]);
        }
        
        console.log('Distribuição de URLs:', distributedUrls);
        
        // Salvar URLs específicas nos perfis dos navegadores correspondentes
        console.log('Salvando URLs específicas para cada navegador...');
        
        // Salvar a URL específica para cada navegador baseado na distribuição
        for (let i = 0; i < activeBrowsersWithProfiles.length; i++) {
            const browser = activeBrowsersWithProfiles[i];
            const urlForThisBrowser = distributedUrls[i];
            
            if (browser.profileId !== null) {
                try {
                    const saveUrlResult = await window.electronAPI.saveUrlToProfiles(urlForThisBrowser, [browser.profileId]);
                    if (saveUrlResult.success) {
                        console.log(`URL ${urlForThisBrowser} salva no perfil ${browser.profileId} (navegador ${browser.navigatorId}) com sucesso:`, saveUrlResult.message);
                    } else {
                        console.warn(`Falha ao salvar URL ${urlForThisBrowser} no perfil ${browser.profileId}:`, saveUrlResult.error);
                    }
                } catch (urlSaveError) {
                    console.error(`Erro ao salvar URL ${urlForThisBrowser} no perfil ${browser.profileId}:`, urlSaveError);
                }
            } else {
                console.log(`Navegador ${browser.navigatorId} não possui perfil associado, URL ${urlForThisBrowser} não será salva.`);
            }
        }
        
        // Navegar todos os navegadores com as URLs distribuídas
        const navigationResult = await window.electronAPI.navigateAllBrowsers(distributedUrls);
        
        if (navigationResult.success) {
            const successCount = navigationResult.results ? navigationResult.results.filter(r => r.success).length : activeBrowsers.length;
            showNotification(`Navegação iniciada com sucesso em ${successCount} navegador(es) com ${links.length} link(s) distribuído(s). URLs salvas nos perfis.`, 'success');
            
            // Injetar script de registro após navegação bem-sucedida
            // Usar injeção pós-navegação para aguardar carregamento completo da página automaticamente
            try {
                console.log('Iniciando injeção do script de registro (pós-navegação)...');
                const injectionResult = await window.electronAPI.injectScriptPostNavigation('registro');
                
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
                navigationResult.results.forEach((result, index) => {
                    if (result.success) {
                        console.log(`✓ Navegador ${result.browserId}: Navegando para ${distributedUrls[index]}`);
                    } else {
                        console.error(`✗ Navegador ${result.browserId}: ${result.error}`);
                    }
                });
            }
        } else {
            showNotification('Erro ao navegar navegadores: ' + navigationResult.error, 'error');
        }
        
    } catch (error) {
        console.error('Erro na execução da navegação com todos os links:', error);
        showNotification('Erro inesperado ao executar navegação: ' + error.message, 'error');
    }
}

// Função para executar criação de contas
async function executeAccountCreation(link) {
    console.log('Iniciando criação de contas para:', link);
    
    try {
        // Obter navegadores ativos com dados de perfil
        const activeBrowsersResult = await window.electronAPI.getActiveBrowsersWithProfiles();
        
        if (!activeBrowsersResult.success) {
            showNotification('Erro ao verificar navegadores ativos: ' + activeBrowsersResult.error, 'error');
            return;
        }
        
        const activeBrowsersWithProfiles = activeBrowsersResult.browsers;
        
        // Extrair apenas os IDs dos perfis dos navegadores ativos
        const activeProfileIds = activeBrowsersWithProfiles
            .filter(browser => browser.profileId !== null)
            .map(browser => browser.profileId);
        
        console.log('Perfis ativos encontrados:', activeProfileIds);
        
        // Salvar a URL apenas nos perfis dos navegadores ativos
        try {
            const saveUrlResult = await window.electronAPI.saveUrlToProfiles(link, activeProfileIds.length > 0 ? activeProfileIds : null);
            if (saveUrlResult.success) {
                console.log('URL salva nos perfis ativos com sucesso:', saveUrlResult.message);
            } else {
                console.warn('Falha ao salvar URL nos perfis:', saveUrlResult.error);
            }
        } catch (urlSaveError) {
            console.error('Erro ao salvar URL nos perfis:', urlSaveError);
        }
        
        // Usar os IDs dos navegadores para verificação
        const activeBrowsers = activeBrowsersWithProfiles.map(browser => browser.navigatorId);
        
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
            
            // Injetar script de registro após navegação bem-sucedida
            // Usar injeção pós-navegação para aguardar carregamento completo da página automaticamente
            try {
                console.log('Iniciando injeção do script de registro (pós-navegação)...');
                const injectionResult = await window.electronAPI.injectScriptPostNavigation('registro');
                
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

// Função para normalizar URLs no frontend (similar à do backend)
function normalizeUrlFrontend(url) {
    if (!url || url.trim() === '') {
        return '';
    }
    
    const trimmedUrl = url.trim();
    
    // Se já tem protocolo, retorna como está
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

// Função para validar e normalizar URL quando o usuário digita
function validateAndNormalizeUrl(input) {
    const originalValue = input.value.trim();
    if (originalValue && !originalValue.match(/^https?:\/\//)) {
        const normalizedUrl = normalizeUrlFrontend(originalValue);
        console.log(`URL normalizada: ${originalValue} -> ${normalizedUrl}`);
        // Mostrar uma dica visual de que a URL foi normalizada
        showNotification(`URL normalizada: ${normalizedUrl}`, 'info', 2000);
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
                <input type="text" id="link-input-${linkCount}" class="w-full px-3 py-2 bg-app-gray-800 border border-app-gray-700 rounded-lg text-white placeholder-app-gray-400 focus:outline-none focus:ring-2 focus:ring-app-blue-600 focus:border-transparent transition-all duration-200" placeholder="exemplo.com (https:// será adicionado automaticamente)">
            </div>
            <button class="w-8 h-8 bg-app-red-600 hover:bg-app-red-500 rounded-lg text-white text-sm font-bold transition-colors duration-200 mt-5" onclick="console.log('BOTÃO X CLICADO LINK ${linkCount} (JS)'); window.removeLinkInputGlobal(${linkCount})" title="Remover este campo">×</button>
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
            validateAndNormalizeUrl(newInput);
            removeEmptyLinkInputs();
            updateCriarContasButton();
            debouncedSave();
        });
    }
    
    updateCriarContasButton();
}

function removeLinkInput(linkNumber) {
    console.log(`Tentando remover link ${linkNumber}`);
    const linkGroup = document.getElementById(`link-group-${linkNumber}`);
    if (linkGroup) {
        linkGroup.remove();
        console.log(`Link ${linkNumber} removido com sucesso`);
        
        // Reorganizar os IDs dos links restantes
        reorganizeLinkIds();
        
        updateCriarContasButton();
        debouncedSave();
    } else {
        console.log(`Link group ${linkNumber} não encontrado`);
    }
}

// Função para reorganizar os IDs dos links após remoção
function reorganizeLinkIds() {
    const container = document.getElementById('links-container');
    if (!container) return;
    
    const linkGroups = container.children;
    for (let i = 0; i < linkGroups.length; i++) {
        const linkGroup = linkGroups[i];
        const newNumber = i + 1;
        
        // Atualizar ID do grupo
        linkGroup.id = `link-group-${newNumber}`;
        
        // Atualizar label
        const label = linkGroup.querySelector('label');
        if (label) {
            label.textContent = `Link ${newNumber}:`;
            label.setAttribute('for', `link-input-${newNumber}`);
        }
        
        // Atualizar input
        const input = linkGroup.querySelector('input');
        if (input) {
            input.id = `link-input-${newNumber}`;
        }
        
        // Atualizar botão de remoção
        const button = linkGroup.querySelector('button');
        if (button) {
            button.setAttribute('onclick', `console.log('BOTÃO X CLICADO LINK ${newNumber} (REORGANIZADO)'); window.removeLinkInputGlobal(${newNumber})`);
        }
    }
}

// Função para remover campos de link vazios automaticamente
function removeEmptyLinkInputs() {
    const container = document.getElementById('links-container');
    if (!container) return;
    
    const linkGroups = Array.from(container.children);
    let removedAny = false;
    
    // Remover grupos vazios (exceto se for o único)
    linkGroups.forEach(linkGroup => {
        const input = linkGroup.querySelector('input');
        if (input && input.value.trim() === '' && linkGroups.length > 1) {
            linkGroup.remove();
            removedAny = true;
        }
    });
    
    // Se removeu algum, reorganizar os IDs
    if (removedAny) {
        reorganizeLinkIds();
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
// Função handlePixFileUpload removida - não é mais necessária com o novo formato de textarea

function handleExtensionUpload(event) {
    const files = event.target.files;
    if (files.length > 0) {
        console.log('Extensão selecionada:', files[0].webkitRelativePath);
        showNotification('Extensão carregada com sucesso!', 'success');
        
        // Aqui você pode processar a extensão
        displayExtension(files[0].webkitRelativePath);
    }
}

// Função displayPixKeys removida - não é mais necessária com o novo formato de textarea

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

// Função removePixKey removida - não é mais necessária com o novo formato de textarea

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
function initializePixManagement() {
    const pixListPopup = document.getElementById('pix-list-popup');
    const pixCounter = document.getElementById('pix-counter-text');
    const clearPixBtn = document.getElementById('clear-pix-btn');
    
    // Event listener para campo do popup
    if (pixListPopup) {
        pixListPopup.addEventListener('input', () => {
            updatePixCount();
            debouncedSave();
        });
    }
    
    // Botão limpar chaves PIX
    if (clearPixBtn) {
        clearPixBtn.addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('Tem certeza que deseja limpar todas as chaves PIX?');
            if (confirmed) {
                if (pixListPopup) pixListPopup.value = '';
                updatePixCount();
                debouncedSave();
                showNotification('Chaves PIX limpas com sucesso!', 'success');
            }
        });
    }
    
    // Atualizar contagem inicial
    updatePixCount();
}

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
        clearProxiesBtn.addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('Tem certeza que deseja limpar todos os proxies?');
        if (confirmed) {
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
            const indiceMonitorPrimario = monitoresDetectados.findIndex(m => m.ehPrimario);
            if (indiceMonitorPrimario >= 0) {
                // Atualizar o select para mostrar o monitor selecionado
                const monitorSelect = document.getElementById('monitor-select');
                if (monitorSelect) {
                    monitorSelect.value = indiceMonitorPrimario;
                }
                selecionarMonitor(indiceMonitorPrimario);
            } else if (monitoresDetectados.length > 0) {
                // Atualizar o select para mostrar o primeiro monitor
                const monitorSelect = document.getElementById('monitor-select');
                if (monitorSelect) {
                    monitorSelect.value = 0;
                }
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
    
    // Remover listeners anteriores e adicionar novo evento de mudança
    monitorSelect.removeEventListener('change', handleMonitorChange);
    monitorSelect.addEventListener('change', handleMonitorChange);
}

/**
 * Handler para mudança de seleção de monitor
 */
function handleMonitorChange(e) {
    selecionarMonitor(parseInt(e.target.value));
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
        // Obter configuração atual da interface
        const defaultCheckbox = document.getElementById('default-resolution-checkbox');
        const widthInput = document.getElementById('width-input');
        const heightInput = document.getElementById('height-input');
        
        let larguraLogica, alturaLogica;
        
        if (defaultCheckbox && defaultCheckbox.checked) {
            larguraLogica = FALLBACK_WIDTH;
        alturaLogica = FALLBACK_HEIGHT;
    } else {
        larguraLogica = parseInt(widthInput?.value) || DEFAULT_WIDTH;
        alturaLogica = parseInt(heightInput?.value) || DEFAULT_HEIGHT;
        }
        
        const config = {
            larguraLogica: larguraLogica,
            alturaLogica: alturaLogica,
            fatorEscala: 0.65
        };
        
        const resultado = await window.electronAPI.saveMonitorData(monitoresDetectados, dadosPosicionamento, config);
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
// Função base que contém toda a lógica compartilhada de cálculo de capacidade
async function calcularCapacidadeBase(monitor, config) {
    try {
        if (!window.electronAPI || !window.electronAPI.calculateMonitorCapacity) {
            throw new Error('API de cálculo de capacidade não disponível');
        }
        
        // Usar configuração fornecida ou obter valores da interface
        let configCalculo = config;
        
        if (!configCalculo) {
            // Obter valores da interface ou usar padrões
            const defaultCheckbox = document.getElementById('default-resolution-checkbox');
            const widthInput = document.getElementById('width-input');
            const heightInput = document.getElementById('height-input');
            
            let larguraLogica, alturaLogica;
            
            if (defaultCheckbox && defaultCheckbox.checked) {
                // Usar valores padrão
                larguraLogica = FALLBACK_WIDTH;
                alturaLogica = FALLBACK_HEIGHT;
            } else {
                // Usar valores dos campos da interface
                larguraLogica = parseInt(widthInput?.value) || DEFAULT_WIDTH;
                alturaLogica = parseInt(heightInput?.value) || DEFAULT_HEIGHT;
            }
            
            configCalculo = {
                larguraLogica: larguraLogica,
                alturaLogica: alturaLogica,
                fatorEscala: 0.65
            };
        }
        
        // Chamar a API do Electron para calcular capacidade
        const result = await window.electronAPI.calculateMonitorCapacity(monitor, configCalculo);
        
        if (!result.success) {
            throw new Error(result.error || 'Erro desconhecido no cálculo');
        }
        
        return {
            success: true,
            capacidade: result.capacidade,
            posicoes: result.posicoes,
            monitor: monitor,
            config: configCalculo
        };
        
    } catch (error) {
        console.error('Erro no cálculo de capacidade:', error);
        return {
            success: false,
            error: error.message,
            monitor: monitor
        };
    }
}

async function calcularCapacidadeMonitor(monitor) {
    // Verificar se já existem dados salvos para este monitor
    const monitorId = `monitor_${monitor.id || Date.now()}`;
    const dadosExistentes = dadosPosicionamento.find(item => item.id === monitorId);
    
    // Se existem dados salvos e a configuração não mudou, usar os dados existentes
    if (dadosExistentes && dadosExistentes.config) {
        const configAtual = {
            larguraLogica: parseInt(document.getElementById('width-input')?.value) || DEFAULT_WIDTH,
            alturaLogica: parseInt(document.getElementById('height-input')?.value) || DEFAULT_HEIGHT,
            fatorEscala: 0.65
        };
        
        const configSalva = dadosExistentes.config;
        const configIgual = configSalva.larguraLogica === configAtual.larguraLogica &&
                           configSalva.alturaLogica === configAtual.alturaLogica &&
                           configSalva.fatorEscala === configAtual.fatorEscala;
        
        if (configIgual) {
            console.log('Usando posições salvas para o monitor:', dadosExistentes.capacidade);
            
            // Atualizar interface com dados salvos
            const capacityElement = document.getElementById('monitor-capacity');
            if (capacityElement) {
                capacityElement.textContent = `${dadosExistentes.capacidade} navegadores`;
            }
            
            capacidadeMaximaAtual = dadosExistentes.capacidade;
            
            const openingsSlider = document.querySelector('input[type="range"]');
            const openingsCount = document.getElementById('openings-count');
            
            if (openingsSlider) {
                openingsSlider.max = dadosExistentes.capacidade;
                const currentValue = parseInt(openingsCount?.textContent || '1');
                if (currentValue > dadosExistentes.capacidade) {
                    openingsSlider.value = dadosExistentes.capacidade;
                    if (openingsCount) {
                        openingsCount.textContent = dadosExistentes.capacidade;
                    }
                }
            }
            return;
        }
    }
    
    // Só recalcular se não existem dados ou se a configuração mudou
    const configAtual = {
        larguraLogica: parseInt(document.getElementById('width-input')?.value) || FALLBACK_WIDTH,
        alturaLogica: parseInt(document.getElementById('height-input')?.value) || FALLBACK_HEIGHT,
        fatorEscala: 0.65
    };
    const result = await calcularCapacidadeBase(monitor, configAtual);
    
    if (result.success) {
        console.log('Capacidade recalculada:', result.capacidade);
        console.log('Posições dos navegadores:', result.posicoes);
        
        // Armazenar dados de posicionamento com ID único
        const dadosMonitor = {
            id: monitorId,
            monitor: monitor,
            config: result.config,
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
}

/**
 * Calcula a capacidade total de todos os monitores
 */
async function calcularCapacidadeTodosMonitores() {
    try {
        if (!monitoresDetectados || monitoresDetectados.length === 0) {
            console.log('Nenhum monitor detectado');
            return;
        }
        
        // Verificar se já existem dados salvos para todos os monitores
        const dadosExistentes = dadosPosicionamento.find(item => item.id === 'todos_monitores');
        
        // Se existem dados salvos e a configuração não mudou, usar os dados existentes
        if (dadosExistentes && dadosExistentes.config) {
            const configAtual = {
                larguraLogica: parseInt(document.getElementById('width-input')?.value) || FALLBACK_WIDTH,
                alturaLogica: parseInt(document.getElementById('height-input')?.value) || FALLBACK_HEIGHT,
                fatorEscala: 0.65
            };
            
            const configSalva = dadosExistentes.config;
            const configIgual = configSalva.larguraLogica === configAtual.larguraLogica &&
                               configSalva.alturaLogica === configAtual.alturaLogica &&
                               configSalva.fatorEscala === configAtual.fatorEscala;
            
            if (configIgual) {
                console.log('Usando posições salvas para todos os monitores:', dadosExistentes.capacidade);
                
                // Atualizar interface com dados salvos
                const capacityElement = document.getElementById('monitor-capacity');
                if (capacityElement) {
                    capacityElement.textContent = `${dadosExistentes.capacidade} navegadores (todos os monitores)`;
                }
                
                capacidadeMaximaAtual = dadosExistentes.capacidade;
                
                const openingsSlider = document.querySelector('input[type="range"]');
                const openingsCount = document.getElementById('openings-count');
                
                if (openingsSlider) {
                    openingsSlider.max = dadosExistentes.capacidade;
                    const currentValue = parseInt(openingsCount?.textContent || '1');
                    if (currentValue > dadosExistentes.capacidade) {
                        openingsSlider.value = dadosExistentes.capacidade;
                        if (openingsCount) {
                            openingsCount.textContent = dadosExistentes.capacidade;
                        }
                    }
                }
                return;
            }
        }
        
        // Só recalcular se não existem dados ou se a configuração mudou
        let capacidadeTotal = 0;
        let todasPosicoes = [];
        let proximoId = 0; // Contador global para IDs únicos
        
        // Calcular capacidade para cada monitor usando a função base
        for (const monitor of monitoresDetectados) {
            try {
                const configAtual = {
                    larguraLogica: parseInt(document.getElementById('width-input')?.value) || FALLBACK_WIDTH,
                    alturaLogica: parseInt(document.getElementById('height-input')?.value) || FALLBACK_HEIGHT,
                    fatorEscala: 0.65
                };
                const result = await calcularCapacidadeBase(monitor, configAtual);
                
                if (result && result.success) {
                    capacidadeTotal += result.capacidade;
                    
                    // Corrigir IDs para serem sequenciais e únicos
                    const posicoesComIdCorrigido = result.posicoes.map(pos => ({
                        ...pos,
                        id: proximoId++
                    }));
                    
                    todasPosicoes = todasPosicoes.concat(posicoesComIdCorrigido);
                    
                    console.log(`Monitor ${monitor.nome}: ${result.capacidade} navegadores`);
                } else {
                    console.error(`Erro ao calcular capacidade do monitor ${monitor.nome}:`, result?.error || 'Resultado inválido');
                }
            } catch (error) {
                console.error(`Erro ao calcular capacidade do monitor ${monitor.nome}:`, error);
            }
        }
        
        console.log('Capacidade total recalculada de todos os monitores:', capacidadeTotal);
        console.log('Total de posições disponíveis:', todasPosicoes.length);
        
        // Obter configuração da interface para armazenamento
        const defaultCheckbox = document.getElementById('default-resolution-checkbox');
        const widthInput = document.getElementById('width-input');
        const heightInput = document.getElementById('height-input');
        
        let larguraLogica, alturaLogica;
        
        if (defaultCheckbox && defaultCheckbox.checked) {
            larguraLogica = FALLBACK_WIDTH;
            alturaLogica = FALLBACK_HEIGHT;
        } else {
            larguraLogica = parseInt(widthInput?.value) || FALLBACK_WIDTH;
            alturaLogica = parseInt(heightInput?.value) || FALLBACK_HEIGHT;
        }
        
        const config = {
            larguraLogica: larguraLogica,
            alturaLogica: alturaLogica,
            fatorEscala: 0.65
        };
        
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
/**
 * Configura event listeners para campos de resolução
 * @param {HTMLInputElement} widthInput - Campo de largura
 * @param {HTMLInputElement} heightInput - Campo de altura
 * @param {HTMLInputElement} defaultCheckbox - Checkbox de resolução padrão
 */
function setupResolutionListeners(widthInput, heightInput, defaultCheckbox) {
    // Função compartilhada para recálculo de capacidade
    function recalcularCapacidade() {
        if (!defaultCheckbox.checked) {
            if (monitorSelecionado) {
                calcularCapacidadeMonitor(monitorSelecionado);
            } else if (monitorSelecionado === null && monitoresDetectados.length > 0) {
                calcularCapacidadeTodosMonitores();
            }
        }
        // Salvar configurações automaticamente após mudança
        debouncedSave();
    }
    
    // Aplicar o mesmo listener para ambos os campos
    widthInput.addEventListener('input', recalcularCapacidade);
    heightInput.addEventListener('input', recalcularCapacidade);
}

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
                widthInput.value = FALLBACK_WIDTH.toString();
                heightInput.value = FALLBACK_HEIGHT.toString();
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
        defaultCheckbox.addEventListener('change', () => {
            atualizarEstadoCampos();
            // Salvar configurações automaticamente após mudança
            debouncedSave();
        });
        
        // Aguardar um pouco antes de configurar os event listeners para evitar
        // que sejam disparados durante o carregamento inicial das configurações
        setTimeout(() => {
            setupResolutionListeners(widthInput, heightInput, defaultCheckbox);
        }, 1000);
        
        // Inicializar estado apenas se não há valores já definidos
        if (!widthInput.value || !heightInput.value) {
            atualizarEstadoCampos();
        } else {
            // Apenas atualizar o estado dos campos sem alterar valores
            const isDefault = defaultCheckbox.checked;
            widthInput.disabled = isDefault;
            heightInput.disabled = isDefault;
        }
    }
}

/**
 * Valida configuração de proxy baseada no modo selecionado
 * @param {string} proxyMode - Modo do proxy ('list' ou 'rotating')
 * @param {Object} settings - Configurações do aplicativo
 * @param {number} simultaneousOpenings - Número de aberturas simultâneas
 * @returns {Object} Resultado da validação com success, proxyList e message
 */
function validateProxyConfiguration(proxyMode, settings, simultaneousOpenings) {
    let proxyList = [];
    
    if (proxyMode === 'none') {
        // Modo sem proxy - navegadores serão abertos sem proxy
        return {
            success: true,
            proxyList: [],
            message: 'Navegadores serão abertos sem proxy',
            type: 'info'
        };
        
    } else if (proxyMode === 'list') {
        // Para modo lista, usar proxies da lista de proxies
        let listProxies = [];
        if (Array.isArray(settings.proxies)) {
            listProxies = settings.proxies.filter(p => p && p.trim());
        } else if (typeof settings.proxies === 'string') {
            listProxies = settings.proxies.split('\n').filter(p => p.trim());
        }
        
        // Validar se há proxies suficientes
        if (listProxies.length === 0) {
            return {
                success: false,
                message: 'Nenhum proxy configurado na Lista de Proxies. Adicione proxies antes de abrir os navegadores.',
                type: 'error'
            };
        }
        
        if (listProxies.length < simultaneousOpenings) {
            return {
                success: false,
                message: `Erro: Apenas ${listProxies.length} proxies disponíveis para ${simultaneousOpenings} navegadores. Adicione mais proxies ou reduza o número de aberturas simultâneas.`,
                type: 'error'
            };
        }
        
        // Usar proxies da lista (consumir um por navegador)
        proxyList = listProxies.slice(0, simultaneousOpenings);
        
        return {
            success: true,
            proxyList: proxyList,
            message: `${proxyList.length} proxies da lista serão utilizados`,
            type: 'info'
        };
        
    } else if (proxyMode === 'rotating') {
        // Para modo rotativo, usar o proxy rotativo único
        const rotatingProxy = getRotatingProxy();
        
        if (!rotatingProxy) {
            return {
                success: false,
                message: 'Nenhum proxy configurado em Proxy Rotativo. Adicione um proxy antes de abrir os navegadores.',
                type: 'warning'
            };
        }
        
        // No modo rotativo, todos os navegadores usam o mesmo proxy
        proxyList = [rotatingProxy];
        
        return {
            success: true,
            proxyList: proxyList,
            message: `Proxy rotativo ${rotatingProxy} será utilizado para todos os navegadores`,
            type: 'info'
        };
    }
    
    return {
        success: false,
        message: 'Modo de proxy inválido',
        type: 'error'
    };
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
        
        // Validar configuração de proxy usando função centralizada
        const proxyValidation = validateProxyConfiguration(proxyMode, settings, simultaneousOpenings);
        
        if (!proxyValidation.success) {
            showNotification(proxyValidation.message, proxyValidation.type);
            return;
        }
        
        const proxyList = proxyValidation.proxyList;
        
        // Log e notificação de sucesso
        if (proxyMode === 'none') {
            console.log(`Abrindo ${simultaneousOpenings} navegadores sem proxy`);
        } else if (proxyMode === 'list') {
            console.log(`Usando ${proxyList.length} proxies da lista para ${simultaneousOpenings} navegadores`);
        } else if (proxyMode === 'rotating') {
            console.log(`Usando proxy rotativo: ${proxyList[0]} para todos os navegadores`);
        }
        
        showNotification(proxyValidation.message, proxyValidation.type, 2000);
        
        // Obter configuração de resolução da interface
        const defaultCheckbox = document.getElementById('default-resolution-checkbox');
        const widthInput = document.getElementById('width-input');
        const heightInput = document.getElementById('height-input');
        
        let larguraLogica, alturaLogica;
        
        if (defaultCheckbox && defaultCheckbox.checked) {
            larguraLogica = FALLBACK_WIDTH;
            alturaLogica = FALLBACK_HEIGHT;
        } else {
            larguraLogica = parseInt(widthInput?.value) || FALLBACK_WIDTH;
            alturaLogica = parseInt(heightInput?.value) || FALLBACK_HEIGHT;
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
            useAllMonitors: monitorSelecionado === null,
            // Incluir configuração de resolução da interface
            resolution: {
                larguraLogica: larguraLogica,
                alturaLogica: alturaLogica,
                fatorEscala: 0.65
            }
        };
        
        // Validações já foram feitas acima para cada modo de proxy
        
        console.log('Opções dos navegadores:', options);
        console.log('Configuração de resolução aplicada:', {
            larguraLogica: larguraLogica,
            alturaLogica: alturaLogica,
            fatorEscala: 0.65,
            origem: defaultCheckbox?.checked ? 'padrão' : 'personalizada'
        });
        
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



// Sistema de monitores e download do Chrome agora inicializados no DOMContentLoaded principal

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

// Sistema de gerenciamento de perfis na aba Contas
let profilesData = [];

/**
 * Carrega todos os perfis do config.json via IPC
 */
async function loadProfilesData() {
    try {
        console.log('Iniciando carregamento de perfis...');
        const response = await window.electronAPI.getAllProfiles();
        console.log('Resposta do IPC getAllProfiles:', response);
        
        if (response && response.success && response.profiles) {
            profilesData = response.profiles;
            console.log('Perfis atribuídos com sucesso:', profilesData);
        } else {
            profilesData = [];
            console.log('Nenhum perfil encontrado ou erro na resposta');
        }
        
        console.log(`Total de perfis carregados: ${profilesData.length}`);
        return profilesData;
    } catch (error) {
        console.error('Erro ao carregar perfis:', error);
        profilesData = [];
        return [];
    }
}

/**
 * Cria um card HTML para um perfil
 */
async function createProfileCard(profile) {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg p-3 border border-gray-600 w-72';
    card.setAttribute('data-profile-id', profile.navigatorId);
    
    // Verificar se o navegador está ativo
    let isActive = false;
    try {
        const activeBrowsersResult = await window.electronAPI.getActiveBrowsersWithProfiles();
        if (activeBrowsersResult.success) {
            const activeBrowsers = activeBrowsersResult.browsers;
            isActive = activeBrowsers.some(browser => browser.profile && browser.profile.navigatorId === profile.navigatorId);
        }
    } catch (error) {
        console.log('Erro ao verificar status do navegador:', error);
    }
    
    const statusText = isActive ? 'Ativo' : 'Inativo';
    const statusClass = isActive ? 'text-green-400 bg-green-900' : 'text-red-400 bg-red-900';
    
    card.innerHTML = `
        <div class="mb-3">
            <h3 class="text-white font-semibold text-base mb-3">Navegador ${profile.navigatorId}</h3>
        </div>
        
        <div class="space-y-1.5 text-xs mb-4">
            <div class="flex justify-between">
                <span class="text-gray-400">URL:</span>
                <span class="text-gray-300 text-right max-w-40 truncate">${profile.url || 'N/A'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-400">Usuário:</span>
                <span class="text-white text-right">${profile.usuario}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-400">Senha:</span>
                <span class="text-white text-right">${profile.senha || 'N/A'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-400">Proxy:</span>
                <span class="text-gray-300 text-right max-w-40 truncate">${profile.proxy && profile.proxy.host ? `${profile.proxy.host}:${profile.proxy.port}` : 'N/A'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-400">PIX:</span>
                <span class="text-white text-right">${profile.pix || 'N/A'}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-400">Status:</span>
                <span class="${statusClass} text-xs px-2 py-0.5 rounded text-right">${statusText}</span>
            </div>
        </div>
        
        <div class="flex justify-center space-x-1">
            <button class="hover:bg-gray-700 text-white p-2 rounded flex items-center justify-center play-button" data-profile-id="${profile.navigatorId}" title="Iniciar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M8 5v14l11-7z" fill="#10b981"/>
                </svg>
            </button>
            <button class="hover:bg-gray-700 text-white p-2 rounded flex items-center justify-center" onclick="withdrawProfile('${profile.navigatorId}')" title="Saque">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#f59e0b"/>
                </svg>
            </button>
            <button class="hover:bg-gray-700 text-white p-2 rounded flex items-center justify-center" onclick="depositProfile('${profile.navigatorId}')" title="Depósito">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="#3b82f6"/>
                </svg>
            </button>
            <button class="hover:bg-gray-700 text-white p-2 rounded flex items-center justify-center" onclick="statsProfile('${profile.navigatorId}')" title="Relatório">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="#8b5cf6"/>
                </svg>
            </button>
            <button class="hover:bg-gray-700 text-white p-2 rounded flex items-center justify-center" onclick="homeProfile('${profile.navigatorId}')" title="Home">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="#6b7280"/>
                </svg>
            </button>
            <button class="hover:bg-gray-700 text-white p-2 rounded flex items-center justify-center" onclick="deleteProfile('${profile.navigatorId}')" title="Delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ef4444"/>
                </svg>
            </button>
        </div>
    `;    
    
    // Adicionar event listener para o botão play
    const playButton = card.querySelector('.play-button');
    if (playButton) {
        playButton.addEventListener('click', () => {
            const navigatorId = playButton.getAttribute('data-profile-id');
            console.log('Botão clicado via addEventListener para navigatorId:', navigatorId);
            // Buscar o profile.profile correspondente ao navigatorId
            const profileData = profilesData.find(p => p.navigatorId.toString() === navigatorId);
            if (profileData) {
                playProfile(profileData.profile);
            } else {
                console.error('Perfil não encontrado para navigatorId:', navigatorId);
                showNotification('Perfil não encontrado', 'error');
            }
        });
    }
    
    return card;
}

// Funções dos botões dos cards de perfil
async function playProfile(profileId) {
    console.log('Iniciando navegador para perfil:', profileId);
    try {
        const result = await window.electronAPI.startBrowserWithProfile(profileId);
        if (result.success) {
            showNotification(`Navegador iniciado para perfil ${profileId}`, 'success');
            // Atualizar os cards dos perfis para refletir o novo status
            await renderProfileCards();
        } else {
            showNotification(`Erro ao iniciar navegador: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao iniciar navegador:', error);
        showNotification('Erro ao iniciar navegador', 'error');
    }
}

async function withdrawProfile(profileId) {
    console.log('Saque profile:', profileId);
    try {
        const result = await window.electronAPI.injectScriptInProfile(profileId, 'saque');
        if (result.success) {
            showNotification(`Script de saque injetado no perfil ${profileId}`, 'success');
        } else {
            showNotification(`Erro ao injetar script: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao injetar script de saque:', error);
        showNotification('Erro ao injetar script de saque', 'error');
    }
}

async function depositProfile(profileId) {
    console.log('Depósito profile:', profileId);
    try {
        const result = await window.electronAPI.injectScriptInProfile(profileId, 'deposito');
        if (result.success) {
            showNotification(`Script de depósito injetado no perfil ${profileId}`, 'success');
        } else {
            showNotification(`Erro ao injetar script: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao injetar script de depósito:', error);
        showNotification('Erro ao injetar script de depósito', 'error');
    }
}

async function statsProfile(profileId) {
    console.log('Stats profile:', profileId);
    try {
        const result = await window.electronAPI.injectScriptInProfile(profileId, 'relatorio');
        if (result.success) {
            showNotification(`Script de relatório injetado no perfil ${profileId}`, 'success');
        } else {
            showNotification(`Erro ao injetar script: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao injetar script de relatório:', error);
        showNotification('Erro ao injetar script de relatório', 'error');
    }
}

async function homeProfile(profileId) {
    console.log('Home profile:', profileId);
    try {
        const result = await window.electronAPI.injectScriptInProfile(profileId, 'home');
        if (result.success) {
            showNotification(`Script de home injetado no perfil ${profileId}`, 'success');
        } else {
            showNotification(`Erro ao injetar script: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao injetar script de home:', error);
        showNotification('Erro ao injetar script de home', 'error');
    }
}

async function deleteProfile(profileId) {
    console.log('Delete profile:', profileId);
    
    const confirmed = await showCustomConfirm(`Tem certeza que deseja excluir o perfil ${profileId}? Esta ação não pode ser desfeita.`);
    if (!confirmed) {
        return;
    }
    
    try {
        const result = await window.electronAPI.deleteProfile(profileId);
        if (result.success) {
            showNotification(`Perfil ${profileId} excluído com sucesso`, 'success');
            // Remove o card da interface
            await removeProfileCard(profileId);
            // Recarrega os dados dos perfis
            await loadProfilesData();
        } else {
            showNotification(`Erro ao excluir perfil: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir perfil:', error);
        showNotification('Erro ao excluir perfil', 'error');
    }
}

/**
 * Renderiza todos os cards de perfis no container
 */
// Função renderProfileCards removida - usando versão com filtros

/**
 * Remove um perfil e atualiza a interface
 */
async function removeProfileCard(profileId) {
    try {
        const success = await window.electronAPI.removeProfile(profileId);
        if (success) {
            // Remover da lista local
            profilesData = profilesData.filter(p => p.navigatorId !== profileId);
            
            // Atualizar dados filtrados
            filteredProfilesData = filteredProfilesData.filter(p => p.navigatorId !== profileId);
            
            // Re-renderizar cards filtrados imediatamente
            renderFilteredProfileCards();
            
            showNotification('Perfil removido com sucesso', 'success');
        } else {
            showNotification('Erro ao remover perfil', 'error');
        }
    } catch (error) {
        console.error('Erro ao remover perfil:', error);
        showNotification('Erro ao remover perfil', 'error');
    }
}

/**
 * Inicializa o sistema de perfis quando a aba Contas é ativada
 */
async function initializeProfilesTab() {
    await loadProfilesData();
    await renderProfileCards();
}

/**
 * Sistema de filtros para perfis
 */
let filteredProfilesData = [];

/**
 * Aplica filtros aos perfis e re-renderiza
 */
async function applyProfileFilters() {
    const filterType = document.getElementById('profile-filter')?.value || 'all';
    const statusFilter = document.getElementById('status-filter')?.value || 'all';
    const searchText = document.getElementById('search-profiles')?.value.toLowerCase() || '';
    
    filteredProfilesData = profilesData.filter(profile => {
        // Filtro por tipo
        let typeMatch = true;
        if (filterType !== 'all') {
            switch (filterType) {
                case 'id':
                    typeMatch = profile.navigatorId.toString().includes(searchText);
                    break;
                case 'user':
                    typeMatch = profile.usuario.toLowerCase().includes(searchText);
                    break;
                case 'url':
                    typeMatch = (profile.url || '').toLowerCase().includes(searchText);
                    break;
            }
        } else {
            // Busca geral em todos os campos
            typeMatch = profile.navigatorId.toString().includes(searchText) ||
                       profile.usuario.toLowerCase().includes(searchText) ||
                       (profile.url || '').toLowerCase().includes(searchText);
        }
        
        // Filtro por status (implementação futura)
        let statusMatch = true;
        if (statusFilter !== 'all') {
            // TODO: Implementar lógica de status quando disponível
            statusMatch = true;
        }
        
        return typeMatch && statusMatch;
    });
    
    await renderFilteredProfileCards();
}

/**
 * Renderiza os cards filtrados
 */
async function renderFilteredProfileCards() {
    const container = document.getElementById('profiles-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (filteredProfilesData.length === 0) {
        // Remover classes de grid e adicionar classes de centralização
        container.className = 'flex items-center justify-center min-h-[400px]';
        container.innerHTML = `
            <div class="text-center text-app-gray-400">
                <p class="text-xl font-medium mb-2">Nenhum perfil encontrado</p>
                <p class="text-sm">Tente ajustar os filtros ou criar novos perfis</p>
            </div>
        `;
        return;
    }
    
    // Restaurar classes de grid quando há perfis
    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
    
    // Criar todos os cards de forma assíncrona
    const cardPromises = filteredProfilesData.map(profile => createProfileCard(profile));
    const cards = await Promise.all(cardPromises);
    
    // Adicionar todos os cards ao container
    cards.forEach(card => {
        container.appendChild(card);
    });
}

/**
 * Limpa todos os filtros
 */
function clearProfileFilters() {
    document.getElementById('profile-filter').value = 'all';
    document.getElementById('status-filter').value = 'all';
    document.getElementById('search-profiles').value = '';
    
    filteredProfilesData = [...profilesData];
    renderFilteredProfileCards();
}

/**
 * Inicializa os event listeners dos filtros
 */
function initializeProfileFilters() {
    const profileFilter = document.getElementById('profile-filter');
    const statusFilter = document.getElementById('status-filter');
    const searchInput = document.getElementById('search-profiles');
    const clearButton = document.getElementById('clear-filters');
    
    if (profileFilter) {
        profileFilter.addEventListener('change', async () => await applyProfileFilters());
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', async () => await applyProfileFilters());
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', async () => await applyProfileFilters());
    }
    
    if (clearButton) {
        clearButton.addEventListener('click', clearProfileFilters);
    }
}

/**
 * Atualiza a função renderProfileCards para usar filtros
 */
async function renderProfileCards() {
    console.log('Iniciando renderização de cards de perfis...');
    const container = document.getElementById('profiles-container');
    if (!container) {
        console.error('Container profiles-container não encontrado');
        return;
    }
    
    // Inicializar dados filtrados
    filteredProfilesData = [...profilesData];
    
    // Renderizar cards filtrados
    await renderFilteredProfileCards();
    
    // Inicializar filtros se ainda não foram inicializados
    if (!window.profileFiltersInitialized) {
        initializeProfileFilters();
        window.profileFiltersInitialized = true;
    }
    
    console.log(`${profilesData.length} perfis carregados, ${filteredProfilesData.length} exibidos`);
}

// Expor funções globalmente
window.removeProfileCard = removeProfileCard;
window.initializeProfilesTab = initializeProfilesTab;
window.applyProfileFilters = applyProfileFilters;
window.clearProfileFilters = clearProfileFilters;

// Funções para barra de progressão de exclusão
function showDeleteProgress() {
    const progressContainer = document.getElementById('delete-progress-container');
    if (progressContainer) {
        progressContainer.classList.remove('hidden');
        // Reset inicial
        updateDeleteProgress({
            current: 0,
            total: 0,
            currentItem: 'Preparando...'
        });
    }
}

function hideDeleteProgress() {
    const progressContainer = document.getElementById('delete-progress-container');
    if (progressContainer) {
        progressContainer.classList.add('hidden');
    }
}

function updateDeleteProgress(progressData) {
    const { current, total, currentItem } = progressData;
    
    // Atualizar texto do progresso
    const progressText = document.getElementById('delete-progress-text');
    if (progressText) {
        progressText.textContent = `${current} / ${total}`;
    }
    
    // Atualizar barra de progresso
    const progressBar = document.getElementById('delete-progress-bar');
    if (progressBar && total > 0) {
        const percentage = (current / total) * 100;
        progressBar.style.width = `${percentage}%`;
    }
    
    // Atualizar item atual
    const currentItemElement = document.getElementById('delete-current-item');
    if (currentItemElement) {
        currentItemElement.textContent = currentItem || 'Processando...';
    }
}

// Expor funções globalmente
window.showDeleteProgress = showDeleteProgress;
window.hideDeleteProgress = hideDeleteProgress;
window.updateDeleteProgress = updateDeleteProgress;

console.log('app.js carregado com sucesso');
console.log('Sistema de download do Chrome inicializado');
console.log('Função atualizarPaginas() configurada para usar módulo de injeção');
console.log('Sistema de cards de perfis inicializado');
console.log('Sistema de filtros de perfis inicializado');
console.log('Sistema de barra de progressão de exclusão inicializado');