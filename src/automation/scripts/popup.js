// popup.js ATUALIZADO COM LISTA DE EXCEÇÕES CONFIGURÁVEL E GENÉRICA

if (!window._elementDeleterAttached) {
    (function() {
        'use strict';

        const config = {
            selectorsToDelete: [
                '.ui-popup',
                '.ui-overlay',
                '.modal-backdrop'
            ],
            // Adicione aqui os seletores de CSS para os containers que devem ser ignorados.
            exceptionSelectors: [
                '.ui-tab__panel' // Protege o conteúdo de todas as abas (ex: Meus Dados, Desempenho, etc.)
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
                'anormal',
                'https',
            ],
            forceDeleteKeywords: [
                'registrado',
                'depósito mínimo',
                'legítimo'
            ],
            debug: true // Recomendo deixar como 'true' durante os testes
        };

        const log = (message) => {
            if (config.debug) {
                console.log(`[ElementDeleter Script] ${message}`);
            }
        };
        
        function processElement(element) {
            // --- NOVA LÓGICA DE EXCEÇÃO CONFIGURÁVEL ---
            // Verifica se o elemento está dentro de algum dos containers de exceção definidos no config.
            const isInsideProtectedContainer = config.exceptionSelectors.some(selector => element.closest(selector));
            if (isInsideProtectedContainer) {
                log(`Elemento IGNORADO por estar dentro de um container de exceção: <${element.tagName.toLowerCase()} class="${element.className}">`);
                return; // Pula para o próximo elemento sem tentar deletar
            }
            // --- FIM DA NOVA LÓGICA ---

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
                    log(`Elemento IGNORADO por exceção de keyword: <${element.tagName.toLowerCase()} class="${element.className}">`);
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
            const blockRequest = function() {
                log('Tentativa de entrar em fullscreen foi bloqueada.');
                return Promise.reject(new Error('Fullscreen request blocked by script.'));
            };
            Element.prototype.requestFullscreen = blockRequest;
            Element.prototype.mozRequestFullScreen = blockRequest;
            Element.prototype.webkitRequestFullscreen = blockRequest;
            Element.prototype.msRequestFullscreen = blockRequest;
            document.addEventListener('fullscreenchange', () => {
                if (document.fullscreenElement) {
                    log('Fullscreen detectado, saindo imediatamente.');
                    document.exitFullscreen();
                }
            });
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        }
        // --- FIM DA LÓGICA DE BLOQUEIO ---

        runFullScan();
        blockFullscreen();

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