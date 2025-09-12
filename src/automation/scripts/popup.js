// popup.js ATUALIZADO COM BLOQUEIO DE FULLSCREEN

if (!window._elementDeleterAttached) {
    (function() {
        'use strict';

        const config = {
            selectorsToDelete: [
                '.ui-popup',
                '.ui-overlay',
                '.modal-backdrop'
            ],
            exceptionKeywords: [
                'depósito',
                'inserir pin',
                'lembrete',
                'tenho mais de 18 anos',
				'inserir senha',
				'adicionar pix',
				'phone',
                'retirada',
                'ontem',
                'saques',
                'todas',
                'login',
                'anormal'
            ],
            forceDeleteKeywords: [
                'registrado',
                'depósito mínimo'
            ],
            debug: false
        };

        const log = (message) => {
            if (config.debug) {
                console.log(`[ElementDeleter Script] ${message}`);
            }
        };
        
        function processElement(element) {
            if (!element.matches || !element.isConnected) {
                return;
            }
            const fullTextContent = (element.textContent || '').toLowerCase();
            const forceDeleteMatch = config.forceDeleteKeywords.find(keyword =>
                fullTextContent.includes(keyword.toLowerCase())
            );
            if (forceDeleteMatch) {
                log(`Elemento DELETADO POR FORÇA (palavra: "${forceDeleteMatch}"): <${element.tagName.toLowerCase()} class="${element.className}">`);
                element.remove();
                return;
            }
            const matchesDeleteRule = config.selectorsToDelete.some(selector => element.matches(selector));
            if (matchesDeleteRule) {
                const isException = config.exceptionKeywords.some(keyword =>
                    fullTextContent.includes(keyword.toLowerCase())
                );
                if (!isException) {
                    log(`Elemento DELETADO: <${element.tagName.toLowerCase()} class="${element.className}">`);
                    element.remove();
                } else {
                    log(`Elemento IGNORADO por exceção: <${element.tagName.toLowerCase()} class="${element.className}">`);
                }
            }
        }

        function runFullScan() {
            log('Executando varredura completa da página...');
            document.querySelectorAll(config.selectorsToDelete.join(', ')).forEach(processElement);
            document.querySelectorAll('*').forEach(processElement);
        }

        window.runElementDeleterScan = runFullScan;

        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            processElement(node);
                            if (node.querySelectorAll) {
                               node.querySelectorAll('*').forEach(processElement);
                            }
                        }
                    });
                }
            }
        });
        
        function attachObserver() {
            log('Tentando ativar o Observador de DOM...');
            if (document.documentElement) {
                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });
                log('Observador de DOM ativado com sucesso.');
            } else {
                log('documentElement não encontrado, tentando novamente em 10ms.');
                setTimeout(attachObserver, 10);
            }
        }
        
        // --- LÓGICA DE BLOQUEIO DE FULLSCREEN ---
        function blockFullscreen() {
            log('Ativando bloqueio de fullscreen.');

            // Função que nega o pedido de fullscreen
            const blockRequest = function() {
                log('Tentativa de entrar em fullscreen foi bloqueada.');
                return Promise.reject(new Error('Fullscreen request blocked by script.'));
            };

            // Sobrescreve os métodos de requisitar fullscreen
            Element.prototype.requestFullscreen = blockRequest;
            Element.prototype.mozRequestFullScreen = blockRequest; // Firefox
            Element.prototype.webkitRequestFullscreen = blockRequest; // Chrome/Safari
            Element.prototype.msRequestFullscreen = blockRequest; // IE/Edge

            // Adiciona um "vigia" para o caso de a página entrar em fullscreen
            document.addEventListener('fullscreenchange', () => {
                if (document.fullscreenElement) {
                    log('Fullscreen detectado, saindo imediatamente.');
                    document.exitFullscreen();
                }
            });

            // Se o script carregar e a página já estiver em fullscreen, sai imediatamente
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        }
        // --- FIM DA LÓGICA DE BLOQUEIO ---

        // Executamos a varredura inicial
        runFullScan();

        // Ativamos o bloqueio de fullscreen desde o início
        blockFullscreen();

        // Verificamos o estado do documento para atachar o observer
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', attachObserver);
        } else {
            attachObserver();
        }

        window.stopElementHider = () => {
            observer.disconnect();
            log('Observador de DOM desativado.');
        };
    })();

    window._elementDeleterAttached = true;
}