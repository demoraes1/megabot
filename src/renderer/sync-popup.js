// Módulo para o popup de sincronização de navegadores

/**
 * Classe para gerenciar o popup de sincronização
 */
class SyncPopup {
    constructor() {
        this.isOpen = false;
        this.popup = null;
        this.overlay = null;
        this.activeBrowsers = [];
    }

    /**
     * Abre o popup de sincronização (alias para open)
     */
    async show() {
        return this.open();
    }

    /**
     * Abre o popup de sincronização
     */
    async open() {
        console.log('SyncPopup.open() chamado');
        if (this.isOpen) {
            console.log('Popup já está aberto');
            return;
        }

        try {
            console.log('Tentando obter navegadores ativos...');
            // Obter navegadores ativos do main process
            const result = await window.electronAPI.getActiveBrowsers();
            console.log('Resultado da API:', result);
            
            if (result.success) {
                this.activeBrowsers = result.browsers || [];
                console.log('Navegadores ativos obtidos:', this.activeBrowsers);
            } else {
                console.error('Erro na API:', result.error);
                this.activeBrowsers = [];
            }
            
            this.createPopup();
            this.isOpen = true;
            console.log('Popup criado com sucesso');
        } catch (error) {
            console.error('Erro ao abrir popup de sincronização:', error);
            // Fallback com dados de exemplo para desenvolvimento
            this.activeBrowsers = ['1', '2', '3'];
            console.log('Usando dados de fallback:', this.activeBrowsers);
            this.createPopup();
            this.isOpen = true;
            console.log('Popup criado com fallback');
        }
    }

    /**
     * Fecha o popup de sincronização
     */
    close() {
        if (!this.isOpen) return;

        if (this.overlay && this.overlay.parentElement) {
            this.overlay.remove();
        }
        
        this.popup = null;
        this.overlay = null;
        this.isOpen = false;
    }

    /**
     * Cria o popup HTML
     */
    createPopup() {
        // Criar overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end';
        
        // Criar popup
        this.popup = document.createElement('div');
        this.popup.className = 'bg-gray-900 border border-gray-600 rounded-l-lg shadow-2xl h-full w-80 transform translate-x-full transition-transform duration-300 ease-in-out overflow-y-auto';
        
        this.popup.innerHTML = this.getPopupHTML();
        
        this.overlay.appendChild(this.popup);
        document.body.appendChild(this.overlay);
        
        // Animar entrada
        setTimeout(() => {
            this.popup.classList.remove('translate-x-full');
            this.popup.classList.add('translate-x-0');
        }, 10);
        
        this.attachEventListeners();
    }

    /**
     * Gera o HTML do popup
     */
    getPopupHTML() {
        const browsersHTML = this.activeBrowsers.length > 0 
            ? `<div class="grid grid-cols-3 gap-2">${this.activeBrowsers.map(browserId => `
                <div class="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-700 hover:bg-gray-750 transition-colors">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span class="text-white text-sm font-medium">${browserId}</span>
                    </div>
                    <input type="checkbox" class="browser-checkbox w-3 h-3 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-1" data-browser-id="${browserId}">
                </div>
            `).join('')}</div>`
            : '<div class="text-center py-8 text-gray-400"><p>Nenhum navegador ativo encontrado</p></div>';

        return `
            <div class="p-6 h-full flex flex-col">
                <!-- Header -->
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-3">
                        <span class="text-gray-400 text-sm">${this.activeBrowsers.length} navegadores</span>
                        <button id="refresh-browsers-list" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                            </svg>
                            Atualizar
                        </button>
                    </div>
                    <button id="close-sync-popup" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Checkbox Todos -->
                <div class="flex items-center justify-between p-2 bg-gray-700 rounded border border-gray-600 mb-2">
                    <span class="text-white text-sm font-medium">Todos</span>
                    <input type="checkbox" id="select-all-browsers" class="w-3 h-3 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-1">
                </div>

                <!-- Lista de Navegadores -->
                <div class="flex-1">
                    <div id="browsers-list">
                        ${browsersHTML}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Anexa event listeners ao popup
     */
    attachEventListeners() {
        // Fechar popup
        const closeBtn = this.popup.querySelector('#close-sync-popup');
        closeBtn?.addEventListener('click', () => this.close());

        // Fechar clicando no overlay
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Atualizar lista de navegadores
        const refreshBtn = this.popup.querySelector('#refresh-browsers-list');
        refreshBtn?.addEventListener('click', () => this.refreshBrowsersList());

        // Aplicar estados salvos dos checkboxes
        this.applyCheckboxStates();

        // Checkbox "Todos"
        const selectAllCheckbox = this.popup.querySelector('#select-all-browsers');
        selectAllCheckbox?.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const browserCheckboxes = this.popup.querySelectorAll('.browser-checkbox');
            browserCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            // Salvar estado após alteração
            this.saveCheckboxStates();
        });

        // Checkboxes individuais
        const browserCheckboxes = this.popup.querySelectorAll('.browser-checkbox');
        browserCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectAllCheckbox();
                // Salvar estado após alteração
                this.saveCheckboxStates();
            });
        });

        // Fechar com ESC
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                this.close();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    }

    /**
     * Sincroniza um navegador específico
     */
    async syncBrowser(browserId) {
        try {
            console.log(`Sincronizando navegador ${browserId}`);
            
            // Aqui você pode implementar a lógica de sincronização específica
            if (window.electronAPI && window.electronAPI.syncBrowser) {
                await window.electronAPI.syncBrowser(browserId);
            }
            
            // Mostrar notificação de sucesso
            if (window.showNotification) {
                window.showNotification(`Navegador ${browserId} sincronizado com sucesso!`, 'success');
            }
        } catch (error) {
            console.error(`Erro ao sincronizar navegador ${browserId}:`, error);
            if (window.showNotification) {
                window.showNotification(`Erro ao sincronizar navegador ${browserId}`, 'error');
            }
        }
    }

    /**
     * Visualiza um navegador específico
     */
    async viewBrowser(browserId) {
        try {
            console.log(`Visualizando navegador ${browserId}`);
            
            if (window.electronAPI && window.electronAPI.focusBrowser) {
                await window.electronAPI.focusBrowser(browserId);
            }
            
            // Fechar popup após visualizar
            this.close();
        } catch (error) {
            console.error(`Erro ao visualizar navegador ${browserId}:`, error);
        }
    }

    /**
     * Sincroniza todos os navegadores
     */
    async syncAllBrowsers() {
        try {
            console.log('Sincronizando todos os navegadores');
            
            for (const browserId of this.activeBrowsers) {
                await this.syncBrowser(browserId);
                // Pequeno delay entre sincronizações
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            if (window.showNotification) {
                window.showNotification('Todos os navegadores foram sincronizados!', 'success');
            }
        } catch (error) {
            console.error('Erro ao sincronizar todos os navegadores:', error);
            if (window.showNotification) {
                window.showNotification('Erro ao sincronizar navegadores', 'error');
            }
        }
    }

    /**
     * Atualiza o estado da checkbox "Todos" baseado nas checkboxes individuais
     */
    updateSelectAllCheckbox() {
        const selectAllCheckbox = this.popup.querySelector('#select-all-browsers');
        const browserCheckboxes = this.popup.querySelectorAll('.browser-checkbox');
        
        if (browserCheckboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            return;
        }
        
        const checkedCount = Array.from(browserCheckboxes).filter(cb => cb.checked).length;
        
        if (checkedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === browserCheckboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    /**
     * Atualiza a lista de navegadores ativos
     */
    async refreshBrowsersList() {
        try {
            // Obter navegadores ativos atualizados
            const result = await window.electronAPI.getActiveBrowsers();
            console.log('Resultado da atualização:', result);
            
            if (result.success) {
                this.activeBrowsers = result.browsers || [];
                console.log('Lista de navegadores atualizada:', this.activeBrowsers);
            } else {
                console.error('Erro ao atualizar lista:', result.error);
                this.activeBrowsers = [];
            }
            
            // Atualizar o conteúdo da lista
            const browsersList = this.popup.querySelector('#browsers-list');
            if (browsersList) {
                const browsersHTML = this.activeBrowsers.length > 0 
                    ? `<div class="grid grid-cols-3 gap-2">${this.activeBrowsers.map(browserId => `
                        <div class="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-700 hover:bg-gray-750 transition-colors">
                            <div class="flex items-center gap-2">
                                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span class="text-white text-sm font-medium">${browserId}</span>
                            </div>
                            <input type="checkbox" class="browser-checkbox w-3 h-3 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-1" data-browser-id="${browserId}">
                        </div>
                    `).join('')}</div>`
                    : '<div class="text-center py-8 text-gray-400"><p>Nenhum navegador ativo encontrado</p></div>';
                
                browsersList.innerHTML = browsersHTML;
                
                // Reattach event listeners para os novos botões
                this.attachBrowserEventListeners();
            }
            
            if (window.showNotification) {
                window.showNotification('Lista de navegadores atualizada!', 'info');
            }
        } catch (error) {
            console.error('Erro ao atualizar lista de navegadores:', error);
            if (window.showNotification) {
                window.showNotification('Erro ao atualizar lista', 'error');
            }
        }
    }

    /**
     * Salva o estado dos checkboxes no localStorage
     */
    saveCheckboxStates() {
        const states = {};
        
        // Salvar estado da checkbox "Todos"
        const selectAllCheckbox = this.popup.querySelector('#select-all-browsers');
        if (selectAllCheckbox) {
            states.selectAll = selectAllCheckbox.checked;
        }
        
        // Salvar estado das checkboxes individuais
        const browserCheckboxes = this.popup.querySelectorAll('.browser-checkbox');
        browserCheckboxes.forEach(checkbox => {
            const browserId = checkbox.getAttribute('data-browser-id');
            if (browserId) {
                states[browserId] = checkbox.checked;
            }
        });
        
        localStorage.setItem('syncPopupCheckboxStates', JSON.stringify(states));
        console.log('Estados dos checkboxes salvos:', states);
    }

    /**
     * Carrega o estado dos checkboxes do localStorage
     */
    loadCheckboxStates() {
        try {
            const savedStates = localStorage.getItem('syncPopupCheckboxStates');
            if (savedStates) {
                const states = JSON.parse(savedStates);
                console.log('Estados dos checkboxes carregados:', states);
                return states;
            }
        } catch (error) {
            console.error('Erro ao carregar estados dos checkboxes:', error);
        }
        return {};
    }

    /**
     * Aplica os estados salvos aos checkboxes
     */
    applyCheckboxStates() {
        // Limpar localStorage para forçar estado padrão (temporário para debug)
        localStorage.removeItem('syncPopupCheckboxStates');
        
        const savedStates = localStorage.getItem('syncPopupCheckboxStates');
        console.log('Estados salvos encontrados:', savedStates);
        
        // Se não há estados salvos, marcar "Todos" por padrão
        if (!savedStates) {
            console.log('Aplicando estado padrão - todos marcados');
            const selectAllCheckbox = this.popup.querySelector('#select-all-browsers');
            const browserCheckboxes = this.popup.querySelectorAll('.browser-checkbox');
            
            console.log('Checkbox Todos encontrado:', selectAllCheckbox);
            console.log('Checkboxes de navegadores encontrados:', browserCheckboxes.length);
            
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = true;
                console.log('Checkbox Todos marcado como true');
            }
            
            browserCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
                console.log('Checkbox navegador marcado:', checkbox.getAttribute('data-browser-id'));
            });
            
            // Salvar este estado padrão
            this.saveCheckboxStates();
            return;
        }
        
        const states = this.loadCheckboxStates();
        
        // Aplicar estado da checkbox "Todos"
        const selectAllCheckbox = this.popup.querySelector('#select-all-browsers');
        if (selectAllCheckbox && states.selectAll !== undefined) {
            selectAllCheckbox.checked = states.selectAll;
        }
        
        // Aplicar estado das checkboxes individuais
        const browserCheckboxes = this.popup.querySelectorAll('.browser-checkbox');
        browserCheckboxes.forEach(checkbox => {
            const browserId = checkbox.getAttribute('data-browser-id');
            if (browserId && states[browserId] !== undefined) {
                checkbox.checked = states[browserId];
            }
        });
        
        // Atualizar estado da checkbox "Todos" baseado nas individuais
        this.updateSelectAllCheckbox();
    }

    /**
     * Anexa event listeners específicos dos navegadores
     */
    attachBrowserEventListeners() {
        // Checkbox "Todos"
        const selectAllCheckbox = this.popup.querySelector('#select-all-browsers');
        selectAllCheckbox?.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const browserCheckboxes = this.popup.querySelectorAll('.browser-checkbox');
            browserCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
        });

        // Checkboxes individuais
        const browserCheckboxes = this.popup.querySelectorAll('.browser-checkbox');
        browserCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectAllCheckbox();
            });
        });
    }
}

// Disponibilizar a classe globalmente
window.SyncPopup = SyncPopup;

// Instância global do popup - aguardar DOM estar pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.syncPopup = new SyncPopup();
        console.log('SyncPopup inicializado após DOMContentLoaded');
    });
} else {
    window.syncPopup = new SyncPopup();
    console.log('SyncPopup inicializado imediatamente');
}

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncPopup;
}