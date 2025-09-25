// --- SCRIPT DE RELATÓRIO COM NAVEGAÇÃO DE PERFIL ---

(function() {
    'use strict';
    console.log('Iniciando script de clique em Relatório...');

    /**
     * Aguarda um elemento aparecer no DOM e então executa uma ação.
     * @param {function(): Element | null} selectorFn - Função que busca e retorna o elemento.
     * @param {function(Element): void} actionFn - Função a ser executada quando o elemento for encontrado.
     * @param {string} description - Descrição do que está sendo aguardado, para logging.
     */
    function waitForElement(selectorFn, actionFn, description) {
        console.log(`[Aguardando]: ${description}`);
        const interval = setInterval(() => {
            const element = selectorFn();
            if (element) {
                clearInterval(interval);
                console.log(`[Sucesso]: Elemento "${description}" encontrado.`);
                actionFn(element);
            }
        }, 300); // Verifica a cada 300ms
    }

    /**
     * Procura e clica no item de menu "Relatório".
     */
    function clickReportButton() {
        waitForElement(
            () => {
                // Encontra o primeiro 'span' cujo texto seja exatamente "Relatório"
                const reportSpan = Array.from(document.querySelectorAll('span')).find(span => span.textContent.trim() === 'Relatório');
                // Se encontrou o span, retorna o elemento 'li' pai clicável
                return reportSpan ? reportSpan.closest('li') : null;
            },
            (menuItem) => {
                menuItem.click();
                console.log('--- AUTOMAÇÃO CONCLUÍDA: Clicou em "Relatório" com sucesso! ---');
            },
            'Item de menu "Relatório"'
        );
    }

    // Verifica se a URL atual já é a página de perfil
    if (window.location.pathname.includes('/home/mine')) {
        // Se já estiver na página de perfil, apenas procura o botão de relatório
        clickReportButton();
    } else {
        // Se não, primeiro clica no botão "Perfil" na barra inferior
        waitForElement(
            () => Array.from(document.querySelectorAll('footer [role="tab"] span')).find(span => span.textContent.trim() === 'Perfil'),
            (perfilSpan) => {
                const clickableButton = perfilSpan.closest('[role="tab"]');
                if (clickableButton) {
                    clickableButton.click();
                    console.log('Ação: Clicou em "Perfil".');
                    // Após clicar em perfil, executa a função para clicar em relatório
                    clickReportButton();
                } else {
                    console.error('ERRO: Texto "Perfil" encontrado, mas o botão clicável pai não.');
                }
            },
            'Botão "Perfil" na barra inferior'
        );
    }
})();
