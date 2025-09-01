// popup.js ATUALIZADO E CORRIGIDO

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
                'registro',
                'login'
            ],
            forceDeleteKeywords: [
                'registrado',
				'depósito mínimo'
            ],
            debug: true
        };

        const log = (message) => {
            if (config.debug) {
                console.log(`[ElementDeleter Script] ${message}`);
            }
        };
        
        function processElement(element) {
            // ... (nenhuma mudança nesta função)
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
        
        // --- MUDANÇA PRINCIPAL AQUI ---
        // Criamos uma função para atachar o observer
        function attachObserver() {
            log('Tentando ativar o Observador de DOM...');
            if (document.documentElement) {
                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });
                log('Observador de DOM ativado com sucesso.');
            } else {
                // Isso é um fallback, caso o DOMContentLoaded dispare mas o documentElement ainda não esteja pronto.
                log('documentElement não encontrado, tentando novamente em 10ms.');
                setTimeout(attachObserver, 10);
            }
        }

        // Executamos a varredura inicial
        runFullScan();

        // Verificamos o estado do documento. Se ainda estiver carregando,
        // esperamos pelo evento que sinaliza que o DOM está pronto.
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', attachObserver);
        } else {
            // Se o documento já estiver pronto, atachamos imediatamente.
            attachObserver();
        }
        // --- FIM DA MUDANÇA ---

        window.stopElementHider = () => {
            observer.disconnect();
            log('Observador de DOM desativado.');
        };
    })();

    window._elementDeleterAttached = true;
}