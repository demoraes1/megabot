(function() {
    'use strict';

    // --- Configurações ---
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
            'registrado'
        ],
        debug: true
    };

    // --- Funções de Logging ---
    const log = (message) => {
        if (config.debug) {
            console.log(`[ElementDeleter Script] ${message}`);
        }
    };

    // --- Lógica Principal ---
    function processElement(element) {
        if (!element.matches || !element.isConnected) {
            return;
        }

        // 1. VERIFICAÇÃO PRIORITÁRIA PARA FORÇAR DELEÇÃO
        const fullTextContent = (element.textContent || '').toLowerCase();
        const forceDeleteMatch = config.forceDeleteKeywords.find(keyword =>
            fullTextContent.includes(keyword.toLowerCase())
        );

        if (forceDeleteMatch) {
            log(`Elemento DELETADO POR FORÇA (palavra: "${forceDeleteMatch}"): <${element.tagName.toLowerCase()} class="${element.className}">`);
            element.remove();
            return;
        }

        // 2. LÓGICA NORMAL DE DELEÇÃO COM EXCEÇÕES
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

    // --- Observador de DOM ---
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
    
    // Varredura inicial para elementos que já possam estar na página
    log('Realizando varredura inicial...');
    document.querySelectorAll(config.selectorsToDelete.join(', ')).forEach(processElement);
    document.querySelectorAll('*').forEach(processElement); // Para a regra de forçar

    log('Observador de DOM ativado para deletar elementos.');
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    window.stopElementHider = () => {
        observer.disconnect();
        log('Observador de DOM desativado.');
    };
})();