(function() {
    'use strict';

    // --- Configurações ---
    const config = {
        selectorsToHide: [
            '.ui-popup',
            '.ui-overlay',
            '.modal-backdrop'
        ],
        // Dica: É uma boa prática manter as palavras-chave em minúsculas aqui.
        exceptionKeywords: [
            'depósito',
            'inserir pin',
			'lembrete'
        ],
        hiddenAttribute: 'data-hidden-by-script',
        debug: true
    };

    // --- Funções de Logging ---
    const log = (message) => {
        if (config.debug) {
            console.log(`[ElementHider Script] ${message}`);
        }
    };

    // --- Lógica Principal ---

    function hideElementIfNeeded(element) {
        if (!element.matches || !element.matches(':not(body):not(html)') || element.getAttribute(config.hiddenAttribute)) {
            return;
        }

        const matchesHideRule = config.selectorsToHide.some(selector => element.matches(selector));

        if (matchesHideRule) {
            let isException = false;
            let currentElement = element;

            while (currentElement && currentElement !== document.body) {
                const classList = (currentElement.className || '').toLowerCase();
                const textContent = (currentElement.textContent || '').toLowerCase();

                // ====================================================================
                // CORREÇÃO: Converte a palavra-chave para minúsculas antes de comparar
                // ====================================================================
                if (config.exceptionKeywords.some(keyword => {
                    const lowerKeyword = keyword.toLowerCase(); // Garante que a comparação seja sempre minúscula vs minúscula
                    return classList.includes(lowerKeyword) || textContent.includes(lowerKeyword);
                })) {
                    isException = true;
                    break;
                }
                // ====================================================================

                currentElement = currentElement.parentElement;
            }

            if (!isException) {
                element.style.display = 'none';
                element.setAttribute(config.hiddenAttribute, 'true');
                log(`Elemento ocultado: <${element.tagName.toLowerCase()} class="${element.className}">`);
            } else {
                log(`Elemento IGNORADO por exceção: <${element.tagName.toLowerCase()} class="${element.className}">`);
            }
        }
    }

    // --- O resto do script permanece o mesmo ---

    function initialScan() {
        log('Realizando varredura inicial...');
        config.selectorsToHide.forEach(selector => {
            document.querySelectorAll(selector).forEach(hideElementIfNeeded);
        });
    }

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        hideElementIfNeeded(node);
                        node.querySelectorAll('*').forEach(hideElementIfNeeded);
                    }
                });
            }
        }
    });

    initialScan();
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    log('Observador de DOM ativado com verificação de classes e texto (corrigido).');

    window.stopElementHider = () => {
        observer.disconnect();
        log('Observador de DOM desativado.');
    };

})();